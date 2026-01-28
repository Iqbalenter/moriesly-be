# 🚀 Moriesly API Testing Collection

<div align="center">

**Collection API Testing Lengkap untuk Moriesly Backend**

[![Bruno](https://img.shields.io/badge/Bruno-API_Client-orange)](https://www.usebruno.com/)
[![Endpoints](https://img.shields.io/badge/Endpoints-75+-blue)]()
[![Status](https://img.shields.io/badge/Status-Ready-green)]()

</div>

---

## 📌 Overview

Collection ini menyediakan **75+ API endpoints** yang sudah siap untuk di-test, lengkap dengan dokumentasi, sample data, dan automation scripts. Dibuat khusus untuk mempermudah testing Moriesly Backend API.

## ⚡ Quick Links

- 📖 [**Dokumentasi Lengkap**](README.md) - Panduan lengkap cara penggunaan
- 🔍 [**Quick Reference**](QUICK_REFERENCE.md) - Referensi cepat semua endpoints
- ✅ [**Testing Checklist**](TESTING_CHECKLIST.md) - Checklist untuk systematic testing
- 📊 [**Summary**](SUMMARY.md) - Detail apa yang sudah dibuat

## 🎯 Quick Start

```bash
# 1. Download & Install Bruno
# Visit: https://www.usebruno.com/downloads

# 2. Open Collection di Bruno
# File → Open Collection → pilih folder: moriesly-be/api-collection/Moriesly-api

# 3. Pilih Environment "local"

# 4. Start Testing!
# - Test Health Check
# - Register & Login
# - Test endpoints lainnya
```

## 📂 Struktur Collection

| Folder                | Endpoints | Deskripsi                            |
| --------------------- | --------- | ------------------------------------ |
| **0. Health Check**   | 1         | Server health status                 |
| **1. Authentication** | 5         | Register, Login, Token verification  |
| **2. Home**           | 8         | Dashboard, Check-in, Intake, Status  |
| **3. Profile**        | 4         | Profile management, Weight tracking  |
| **4. Diet**           | 7         | Diet plans, Meal swap, Shopping list |
| **5. Train**          | 8         | Training plans, Workout tracking     |
| **6. Scan**           | 6         | Food, Label, Barcode, Skin scanning  |
| **7. Chat**           | 4         | AI Chat, Conversation summary        |
| **8. Bio**            | 7         | Bio data, Skin scan, Consultation    |
| **9. Subscription**   | 5         | Subscription info, Upgrade, Usage    |
| **10. Feed**          | 2         | Feed generation, Usage stats         |
| **11. Food Log**      | 5         | Food logging & statistics            |
| **12. Status**        | 5         | Status tracking, Goal progress       |
| **13. Track**         | 8         | Activity & weight tracking           |

**Total: 75+ Endpoints**

## ✨ Fitur Unggulan

- ✅ **Terorganisir Rapi** - 14 folder berdasarkan modul
- ✅ **Dokumentasi Lengkap** - Setiap endpoint punya docs
- ✅ **Sample Data** - Request body sudah terisi
- ✅ **Auto Token** - Token tersimpan otomatis
- ✅ **Multi Environment** - Local & Production
- ✅ **Ready to Use** - Tinggal klik Run

## 🔧 Environment Variables

Collection mendukung 2 environment:

### Local (Development)

```
baseUrl: http://localhost:3001/api
authToken: (auto-filled setelah login)
```

### Production

```
baseUrl: https://your-production-url.com/api
authToken: (auto-filled setelah login)
```

## 📖 Dokumentasi

### Utama

- [**README.md**](README.md) - Panduan lengkap (instalasi, setup, usage, troubleshooting)
- [**QUICK_REFERENCE.md**](QUICK_REFERENCE.md) - Referensi cepat semua endpoints
- [**TESTING_CHECKLIST.md**](TESTING_CHECKLIST.md) - Systematic testing checklist

### Detail

- [**SUMMARY.md**](SUMMARY.md) - Rincian lengkap apa yang sudah dibuat

## 🎬 Testing Flow Recommended

```
1. Health Check
   └─> Pastikan server running

2. Authentication
   └─> Register → Login → Verify Token
       (Token otomatis tersimpan)

3. Profile Setup
   └─> Get Profile → Update Profile → Add Weight

4. Core Features
   ├─> Diet: Generate Plan → Verify Consumption
   ├─> Train: Generate Workout → Track Completion
   └─> Food Log: Add Log → Get Statistics

5. Advanced Features
   ├─> Scan: Food, Label, Barcode
   ├─> Chat: Send Message → Get Summary
   └─> Bio: Skin Scan → Get History
```

## 💡 Tips

1. **Mulai dari Authentication** - Login dulu untuk dapat token
2. **Check Health** - Pastikan server running sebelum testing
3. **Follow Flow** - Ikuti testing flow untuk hasil optimal
4. **Edit Sample Data** - Sesuaikan dengan kebutuhan testing
5. **Check Response** - Pahami struktur data dari response

## 🔐 Authentication

Semua protected endpoints otomatis menggunakan Bearer token yang tersimpan di environment variable `authToken`. Token ini akan otomatis terisi setelah Anda login.

```
Authorization: Bearer {authToken}
```

## 📸 File Upload

Untuk endpoints yang memerlukan file upload (scan endpoints):

```javascript
body:multipart-form {
  image: @file(C:/path/to/your/image.jpg)
}
```

Ganti path dengan lokasi file gambar Anda.

## 🐛 Troubleshooting

### Error: "Unauthorized"

- Login ulang untuk refresh token
- Pastikan token tersimpan di environment

### Error: "Cannot connect"

- Pastikan backend server running
- Check port: default 3001
- Verify baseUrl di environment

### Error: "File not found"

- Gunakan absolute path untuk file
- Pastikan file exists dan format valid (JPG/PNG)

Untuk troubleshooting lengkap, lihat [README.md](README.md)

## 📊 Testing Coverage

- **Total Endpoints**: 75+
- **Coverage Target**: 100%
- **Modules**: 14 (Authentication, Home, Profile, Diet, Train, etc)
- **Documentation**: Complete

## 🎉 Ready to Test!

Collection ini **100% siap digunakan**. Semua endpoint sudah dikonfigurasi dengan:

- ✅ Authentication headers
- ✅ Request bodies
- ✅ Query parameters
- ✅ File upload setup
- ✅ Inline documentation

**Tinggal buka di Bruno dan mulai testing!**

## 📞 Support

Jika ada pertanyaan:

1. Baca [README.md](README.md) terlebih dahulu
2. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
3. Review kode di `moriesly-be/routes/`

---

<div align="center">

**Created with ❤️ for Moriesly Backend**

Version 1.0.0 | Last Updated: January 27, 2026

[Bruno](https://www.usebruno.com/) | [Moriesly](https://github.com/yourusername/moriesly)

</div>
