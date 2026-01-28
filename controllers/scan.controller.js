import aiService from "../service/ai.service.js";

export const scanFood = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "Data gambar diperlukan dan harus berupa string base64",
      });
    }

    // Remove data:image/jpeg;base64, prefix if exists
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    // Validate base64 format
    if (!base64Image || base64Image.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Format gambar tidak valid atau gambar terlalu kecil",
      });
    }

    const result = await aiService.scanFood(base64Image);

    if (!result || !result.name) {
      return res.status(500).json({
        success: false,
        error:
          "Gagal mendeteksi makanan dari gambar. Coba dengan gambar yang lebih jelas!",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in scanFood:", error);

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        success: false,
        error: "Batas penggunaan AI tercapai. Coba lagi nanti ya! 🙏",
      });
    }

    next(error);
  }
};

export const scanLabel = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "Data gambar diperlukan dan harus berupa string base64",
      });
    }

    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    if (!base64Image || base64Image.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Format gambar tidak valid atau gambar terlalu kecil",
      });
    }

    const result = await aiService.scanLabel(base64Image);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "Gagal membaca label nutrisi. Pastikan label terlihat jelas!",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in scanLabel:", error);

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        success: false,
        error: "Batas penggunaan AI tercapai. Coba lagi nanti ya! 🙏",
      });
    }

    next(error);
  }
};

export const scanBarcode = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "Data gambar diperlukan dan harus berupa string base64",
      });
    }

    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    if (!base64Image || base64Image.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Format gambar tidak valid atau gambar terlalu kecil",
      });
    }

    const result = await aiService.scanBarcode(base64Image);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "Gagal membaca barcode. Pastikan barcode terlihat jelas!",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in scanBarcode:", error);

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        success: false,
        error: "Batas penggunaan AI tercapai. Coba lagi nanti ya! 🙏",
      });
    }

    next(error);
  }
};

export const scanReceipt = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "Data gambar diperlukan dan harus berupa string base64",
      });
    }

    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    if (!base64Image || base64Image.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Format gambar tidak valid atau gambar terlalu kecil",
      });
    }

    const result = await aiService.scanReceipt(base64Image);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "Gagal membaca struk belanja. Pastikan struk terlihat jelas!",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in scanReceipt:", error);

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        success: false,
        error: "Batas penggunaan AI tercapai. Coba lagi nanti ya! 🙏",
      });
    }

    next(error);
  }
};

export const scanVersus = async (req, res, next) => {
  try {
    const { imageA, imageB } = req.body;

    if (
      !imageA ||
      !imageB ||
      typeof imageA !== "string" ||
      typeof imageB !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Kedua gambar (imageA dan imageB) diperlukan dan harus berupa string base64",
      });
    }

    const base64ImageA = imageA.replace(/^data:image\/\w+;base64,/, "");
    const base64ImageB = imageB.replace(/^data:image\/\w+;base64,/, "");

    if (
      !base64ImageA ||
      base64ImageA.length < 100 ||
      !base64ImageB ||
      base64ImageB.length < 100
    ) {
      return res.status(400).json({
        success: false,
        error: "Format gambar tidak valid atau gambar terlalu kecil",
      });
    }

    const result = await aiService.scanVersus(base64ImageA, base64ImageB);

    if (!result) {
      return res.status(500).json({
        success: false,
        error:
          "Gagal membandingkan kedua produk. Pastikan gambar terlihat jelas!",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in scanVersus:", error);

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        success: false,
        error: "Batas penggunaan AI tercapai. Coba lagi nanti ya! 🙏",
      });
    }

    next(error);
  }
};

export const scanSkin = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        error: "Data gambar diperlukan dan harus berupa string base64",
      });
    }

    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    if (!base64Image || base64Image.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Format gambar tidak valid atau gambar terlalu kecil",
      });
    }

    const result = await aiService.scanSkin(base64Image);

    if (!result) {
      return res.status(500).json({
        success: false,
        error:
          "Gagal menganalisis kulit. Pastikan gambar wajah terlihat jelas!",
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in scanSkin:", error);

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        success: false,
        error: "Batas penggunaan AI tercapai. Coba lagi nanti ya! 🙏",
      });
    }

    next(error);
  }
};
