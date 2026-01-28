import multer from 'multer';
import path from 'path';

// Konfigurasi storage untuk multer - menggunakan memory storage
// Karena kita akan convert langsung ke base64 tanpa save ke disk
const storage = multer.memoryStorage();

// Filter untuk memastikan hanya image yang diupload
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan (jpeg, jpg, png, gif, webp)'));
  }
};

// Konfigurasi multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: fileFilter,
});

// Middleware untuk single image upload
export const uploadSingle = upload.single('image');

// Middleware untuk multiple images (untuk endpoint versus)
export const uploadMultiple = upload.fields([
  { name: 'imageA', maxCount: 1 },
  { name: 'imageB', maxCount: 1 },
]);

// Middleware untuk convert buffer ke base64
export const convertToBase64 = (req, res, next) => {
  try {
    if (req.file) {
      // Single file upload
      const base64Image = req.file.buffer.toString('base64');
      req.body.image = `data:${req.file.mimetype};base64,${base64Image}`;
    } else if (req.files) {
      // Multiple files upload (untuk versus)
      if (req.files.imageA && req.files.imageA[0]) {
        const base64ImageA = req.files.imageA[0].buffer.toString('base64');
        req.body.imageA = `data:${req.files.imageA[0].mimetype};base64,${base64ImageA}`;
      }
      if (req.files.imageB && req.files.imageB[0]) {
        const base64ImageB = req.files.imageB[0].buffer.toString('base64');
        req.body.imageB = `data:${req.files.imageB[0].mimetype};base64,${base64ImageB}`;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default { uploadSingle, uploadMultiple, convertToBase64 };
