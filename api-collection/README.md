# Moriesly API Testing Collection

Dokumentasi lengkap untuk testing API Moriesly Backend menggunakan Bruno API Client.

## 📋 Daftar Isi

- [Pendahuluan](#pendahuluan)
- [Instalasi Bruno](#instalasi-bruno)
- [Setup Environment](#setup-environment)
- [Struktur Collection](#struktur-collection)
- [Cara Menggunakan](#cara-menggunakan)
- [Testing Flow](#testing-flow)
- [Tips & Best Practices](#tips--best-practices)

## 🎯 Pendahuluan

Collection ini berisi testing API lengkap untuk Moriesly Backend yang terorganisir berdasarkan halaman frontend dan fitur-fiturnya. Total terdapat **80+ endpoint** yang sudah siap untuk di-test.

### Fitur Collection:

✅ Terorganisir berdasarkan modul (Authentication, Home, Profile, Diet, Train, dll)  
✅ Sudah termasuk sample request body  
✅ Dokumentasi lengkap untuk setiap endpoint  
✅ Auto-save authentication token  
✅ Support multiple environments (local, production)  
✅ Script automation untuk common tasks

## 📦 Instalasi Bruno

Bruno adalah open-source API client yang ringan dan cepat.

### Download & Install:

1. **Windows/Mac/Linux**: Download dari [https://www.usebruno.com/downloads](https://www.usebruno.com/downloads)
2. Install seperti aplikasi biasa
3. Jalankan Bruno

### Alternatif:

Jika Anda lebih familiar dengan tools lain, collection ini juga bisa di-import ke:

- Postman (export/import manual)
- Thunder Client (VS Code extension)
- Insomnia

## ⚙️ Setup Environment

### 1. Buka Collection

1. Buka Bruno
2. Klik **Open Collection**
3. Navigate ke folder: `moriesly-be/api-collection/Moriesly-api`
4. Klik **Open**

### 2. Setup Environment Variables

Collection ini sudah include 2 environment:

#### **Local Environment** (Default)

```
baseUrl: http://localhost:3001/api
authToken: (akan terisi otomatis setelah login)
```

#### **Production Environment**

```
baseUrl: https://your-production-url.com/api
authToken: (akan terisi otomatis setelah login)
```

### 3. Pilih Environment

Di Bruno:

1. Klik dropdown environment di kanan atas
2. Pilih **local** untuk development
3. Atau **production** untuk testing production server

## 📁 Struktur Collection

Collection diorganisir dalam 13 folder utama:

```
Moriesly-api/
├── 1. Authentication/        # Register, Login, Verify Token, Initialize
├── 2. Home/                  # Dashboard, Check-in, Today Intake
├── 3. Profile/               # View/Edit Profile, Weight Tracking
├── 4. Diet/                  # Generate Diet Plans, Shopping List
├── 5. Train/                 # Generate Training Plans, Track Progress
├── 6. Scan/                  # Food, Label, Barcode, Receipt, Skin
├── 7. Chat/                  # AI Chat, Conversation Summary
├── 8. Bio/                   # Bio Data, Skin Scan, Consultation
├── 9. Subscription/          # Subscription Info, Upgrade, Usage
├── 10. Feed/                 # Generate Feed Articles
├── 11. Food Log/             # Add/Get/Delete Food Logs
├── 12. Status/               # Complete Status, Goal Progress
└── 13. Track/                # Weight & Activity Tracking
```

## 🚀 Cara Menggunakan

### Step 1: Start Backend Server

Pastikan backend server sudah running:

```bash
cd moriesly-be
npm install
npm start
```

Server akan berjalan di `http://localhost:3001`

### Step 2: Testing Authentication

1. **Register User** (jika belum punya akun)
   - Buka folder `1. Authentication`
   - Klik `Register User`
   - Klik tombol **Run** (atau tekan Ctrl+Enter)
   - Pastikan response sukses (status 200)

2. **Login**
   - Klik `Login`
   - Klik **Run**
   - Token akan otomatis tersimpan di environment variable `authToken`
   - Check di environment settings untuk melihat token

3. **Verify Token** (opsional)
   - Klik `Verify Token`
   - Klik **Run**
   - Memastikan token masih valid

### Step 3: Testing Endpoints Lainnya

Setelah login, Anda bisa test endpoint manapun karena token sudah tersimpan otomatis.

**Contoh: Testing Home Dashboard**

1. Buka folder `2. Home`
2. Klik `Get Dashboard`
3. Klik **Run**
4. Lihat response data

**Contoh: Testing Generate Diet Plan**

1. Buka folder `4. Diet`
2. Klik `Generate Daily Diet Plan`
3. Edit body jika perlu (sudah ada default values)
4. Klik **Run**
5. Lihat meal plan yang di-generate

## 🔄 Testing Flow (Recommended)

Untuk testing comprehensive, ikuti flow ini:

### 1️⃣ Authentication Flow

```
Register User → Login → Initialize User → Get Current User
```

### 2️⃣ Profile Setup Flow

```
Get Profile → Update Profile → Add Weight → Get Weight History
```

### 3️⃣ Diet Planning Flow

```
Generate Daily Diet Plan → Save Diet Plan →
Get Active Diet Plan → Verify Consumption
```

### 4️⃣ Training Flow

```
Generate Daily Training Plan → Save Daily Training Plan →
Update Training Completion → Get Training Completion
```

### 5️⃣ Scanning Flow

```
Scan Food → Scan Label → Scan Barcode
```

### 6️⃣ Daily Activity Flow

```
Daily Check-In → Add Food Log → Get Today Intake →
Get Status → Get History
```

## 💡 Tips & Best Practices

### 1. Authentication Token

- Token otomatis tersimpan setelah login berhasil
- Jika token expired, cukup login ulang
- Token disimpan di environment variable `authToken`
- Semua protected endpoints otomatis menggunakan token ini

### 2. File Upload

Untuk endpoints yang memerlukan upload file (scan endpoints):

1. Ganti `@file(/path/to/image.jpg)` dengan path file Anda
2. Atau gunakan absolute path: `@file(C:/Users/YourName/Pictures/food.jpg)`
3. Format yang didukung: JPG, PNG

**Contoh:**

```
body:multipart-form {
  image: @file(C:/Users/John/Desktop/nasi-goreng.jpg)
}
```

### 3. Dynamic Values

Beberapa endpoint memerlukan ID dinamis (logId, historyId, dll):

- Ganti placeholder seperti `log_id_here` dengan ID sebenarnya
- ID biasanya didapat dari response endpoint sebelumnya

**Contoh:**

```
Original: DELETE /api/foodlog/log_id_here
Replace:  DELETE /api/foodlog/abc123xyz
```

### 4. Query Parameters

Untuk endpoint dengan query parameters, edit di section `params:query`:

```
params:query {
  limit: 30
  startDate: 2026-01-20
  endDate: 2026-01-27
}
```

### 5. Testing Permissions

Beberapa endpoint memerlukan premium subscription:

- `canAIChat` - untuk chat dengan AI
- `canGenerateDietPlan` - untuk generate diet plan
- `canSkinScan` - untuk skin scanning

Test dengan user free dan premium untuk memastikan permission checking bekerja.

## 🔍 Troubleshooting

### Error: "Token not found" atau "Unauthorized"

**Solusi:**

1. Pastikan sudah login
2. Check environment variable `authToken` sudah terisi
3. Login ulang jika token expired

### Error: "Cannot connect to server"

**Solusi:**

1. Pastikan backend server running (`npm start`)
2. Check port: default `3001`
3. Pastikan `baseUrl` di environment sesuai

### Error: "File not found" (pada scan endpoints)

**Solusi:**

1. Gunakan absolute path untuk file
2. Pastikan file exists
3. Format file harus JPG atau PNG

### Error: "Permission denied"

**Solusi:**

1. Check subscription/role user
2. Upgrade ke premium jika diperlukan
3. Test permission middleware bekerja dengan baik

## 📝 Response Status Codes

Collection menggunakan standard HTTP status codes:

- `200 OK` - Request berhasil
- `201 Created` - Resource berhasil dibuat
- `400 Bad Request` - Request tidak valid
- `401 Unauthorized` - Token tidak valid/expired
- `403 Forbidden` - Tidak punya permission
- `404 Not Found` - Resource tidak ditemukan
- `429 Too Many Requests` - Melebihi rate limit
- `500 Internal Server Error` - Error di server

## 🎨 Customize Collection

Anda bisa menambah request sendiri:

1. Klik kanan pada folder
2. Pilih **New Request**
3. Isi nama, method, URL
4. Tambahkan body, headers, dll
5. Save

## 🔐 Security Notes

⚠️ **PENTING:**

- Jangan commit file dengan token production ke git
- Token production sebaiknya di-manage terpisah
- Gunakan `.gitignore` untuk environment files jika diperlukan

## 📞 Support

Jika ada pertanyaan atau issue:

1. Check dokumentasi ini dulu
2. Review code di `moriesly-be/routes/` untuk detail endpoint
3. Check error message di response

## 📄 License

Collection ini adalah bagian dari project Moriesly.

---

**Happy Testing! 🚀**

Dibuat dengan ❤️ untuk Moriesly Backend API
