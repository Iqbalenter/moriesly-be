# 🔧 Database Migration & Management Scripts

Kumpulan scripts untuk maintenance dan management database Moriesly AI, khususnya untuk role system.

## 📁 Daftar Scripts

### 1. `migrate-user-roles.js` - Migration Role System

Script untuk menambahkan field role system ke user-user lama yang belum memilikinya.

#### Field yang Ditambahkan:
- `role`: "free" (default)
- `roleUpdatedAt`: timestamp saat ini
- `subscriptionExpiry`: null (untuk FREE tier)
- `paymentHistory`: [] (array kosong)

#### Cara Penggunaan:

```bash
# 1. DRY-RUN (test dulu tanpa mengubah database)
node scripts/migrate-user-roles.js --dry-run

# 2. EXECUTE (update database)
node scripts/migrate-user-roles.js

# 3. FORCE (update semua user termasuk yang sudah punya role)
node scripts/migrate-user-roles.js --force
```

#### Output:
- Menampilkan jumlah user yang ditemukan
- List user yang akan di-update (preview 10 pertama)
- Progress bar saat update
- Summary hasil migration
- Verification hasil update

---

### 2. `check-user-roles.js` - Check Status Role

Script untuk mengecek status role dari users di database.

#### Cara Penggunaan:

```bash
# 1. Check semua users
node scripts/check-user-roles.js

# 2. Check user tertentu by email
node scripts/check-user-roles.js --email user@example.com

# 3. Check user tertentu by ID
node scripts/check-user-roles.js --uid USER_ID_HERE

# 4. Check hanya user yang belum punya role
node scripts/check-user-roles.js --missing-only

# 5. Export hasil ke JSON file
node scripts/check-user-roles.js --export report.json
```

#### Output:
- Tabel list semua users dengan info role
- Statistik distribusi role (FREE/PRO/CUSTOM)
- User yang subscription-nya akan expire dalam 7 hari
- User yang baru upgrade dalam 30 hari terakhir
- Export data ke JSON (optional)

---

### 3. `upgrade-user.js` - Manual User Upgrade

Script untuk upgrade/downgrade role user secara manual. Berguna untuk:
- Testing fitur PRO/CUSTOM
- Memberikan akses gratis ke user tertentu
- Memperbaiki role yang salah

#### Cara Penggunaan:

```bash
# 1. Upgrade ke PRO (default 1 bulan)
node scripts/upgrade-user.js --email user@example.com --role pro

# 2. Upgrade dengan durasi custom (3 bulan)
node scripts/upgrade-user.js --email user@example.com --role pro --months 3

# 3. Upgrade ke CUSTOM dengan unlimited duration
node scripts/upgrade-user.js --email user@example.com --role custom --unlimited

# 4. Downgrade ke FREE
node scripts/upgrade-user.js --email user@example.com --role free

# 5. Upgrade by User ID
node scripts/upgrade-user.js --uid USER_ID_HERE --role pro

# 6. Dry-run (test tanpa update)
node scripts/upgrade-user.js --email user@example.com --role pro --dry-run

# 7. Dengan alasan custom
node scripts/upgrade-user.js --email user@example.com --role pro --reason "Beta tester reward"
```

#### Output:
- Info user saat ini
- Detail upgrade yang akan dilakukan
- Konfirmasi 3 detik sebelum execute
- Info user setelah upgrade
- Entry payment history yang ditambahkan

---

## 🚀 Workflow Migrasi (Recommended)

Berikut workflow yang disarankan saat melakukan migrasi:

### Step 1: Check Status Awal

```bash
# Lihat kondisi database saat ini
node scripts/check-user-roles.js

# Export untuk backup
node scripts/check-user-roles.js --export backup-before-migration.json
```

### Step 2: Dry-Run Migration

```bash
# Test migration tanpa mengubah database
node scripts/migrate-user-roles.js --dry-run
```

Review output untuk memastikan:
- ✅ Jumlah user yang akan di-update sesuai ekspektasi
- ✅ Sample data yang akan ditambahkan benar
- ✅ Tidak ada error

### Step 3: Execute Migration

```bash
# Jalankan migration
node scripts/migrate-user-roles.js
```

Script akan:
1. Menampilkan preview user yang akan di-update
2. Tunggu konfirmasi 5 detik (Ctrl+C untuk cancel)
3. Update database dalam batch (500 per batch)
4. Verify hasil update
5. Tampilkan summary

### Step 4: Verify Hasil

```bash
# Check ulang status setelah migration
node scripts/check-user-roles.js

# Check jika masih ada yang missing
node scripts/check-user-roles.js --missing-only
```

### Step 5: Test Upgrade (Optional)

```bash
# Test upgrade user untuk testing
node scripts/upgrade-user.js --email test@example.com --role pro --dry-run
node scripts/upgrade-user.js --email test@example.com --role pro
```

---

## 🔐 Environment Setup

Pastikan Firebase service account sudah di-setup dengan benar:

### Option 1: Environment Variable (Recommended)

```bash
# Set environment variable
export FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/your/firebase-admin.json"

# Windows
set FIREBASE_SERVICE_ACCOUNT_PATH="C:\path\to\your\firebase-admin.json"
```

### Option 2: Default Path

Letakkan file service account di:
```
moriesly-be/project-cdfb53f0-89f3-4240-b91-firebase-adminsdk-fbsvc-2eb52c86fe.json
```

---

## ⚠️ Perhatian & Best Practices

### 1. Backup Database
Selalu backup database sebelum menjalankan migration:
```bash
# Export current state
node scripts/check-user-roles.js --export backup-$(date +%Y%m%d).json
```

### 2. Test di Development Dulu
- Jangan langsung run di production
- Test dulu di development/staging database
- Verifikasi hasil sebelum ke production

### 3. Dry-Run Wajib
- Selalu jalankan `--dry-run` dulu sebelum execute
- Review output dengan teliti

### 4. Monitor Error
- Perhatikan error count di summary
- Jika ada error, check log dan fix sebelum lanjut

### 5. Batch Processing
- Scripts sudah menggunakan Firestore batch (500 operasi per batch)
- Aman untuk database dengan ribuan users
- Tidak perlu khawatir hit rate limit

### 6. Rollback Plan
Jika terjadi masalah, restore dari backup:
```javascript
// Manual rollback (example)
const backup = require('./backup-20240101.json');
// ... restore logic
```

---

## 🐛 Troubleshooting

### Error: Cannot load Firebase service account

**Solusi:**
1. Check path service account JSON
2. Set `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable
3. Pastikan file tidak corrupt

### Error: Permission denied

**Solusi:**
1. Pastikan service account punya akses ke Firestore
2. Check Firebase IAM permissions
3. Gunakan admin SDK yang benar

### Script hang atau timeout

**Solusi:**
1. Check koneksi internet
2. Jika database besar, script akan butuh waktu lama (normal)
3. Monitor progress di console

### User tidak ter-update

**Solusi:**
1. Run verification: `node scripts/check-user-roles.js --uid USER_ID`
2. Check error log di summary
3. Try manual upgrade: `node scripts/upgrade-user.js --uid USER_ID --role free`

---

## 📊 Database Schema Reference

Setelah migration, setiap user document akan memiliki:

```javascript
{
  // ... existing fields ...
  
  // ===== SUBSCRIPTION & ROLE =====
  role: "free" | "pro" | "custom",
  roleUpdatedAt: "2024-01-01T00:00:00.000Z",
  subscriptionExpiry: "2024-02-01T00:00:00.000Z" | null,
  paymentHistory: [
    {
      date: "2024-01-01T00:00:00.000Z",
      fromRole: "free",
      toRole: "pro",
      amount: 99000,
      method: "manual_script",
      transactionId: "MANUAL_1704067200000",
      status: "success",
      reason: "Manual upgrade via script"
    }
  ],
  previousRole: "free" | null,
  customPermissions: {
    maxScansPerDay: 100,
    // ... custom permissions
  } | null
}
```

---

## 🆘 Support

Jika ada masalah atau pertanyaan:

1. Check troubleshooting section di atas
2. Review logs di console
3. Check Firebase Console untuk verify data
4. Hubungi tim development

---

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Initial migration scripts
- ✅ Check role status script
- ✅ Manual upgrade script
- ✅ Dry-run mode untuk safety
- ✅ Batch processing untuk performance
- ✅ Comprehensive logging & verification

---

## 🎯 TODO / Future Improvements

- [ ] Auto-backup sebelum migration
- [ ] Rollback mechanism
- [ ] Schedule automatic expiry check (cron)
- [ ] Bulk upgrade dari CSV file
- [ ] Email notification setelah migration
- [ ] Integration dengan payment gateway logs

---

**Dibuat oleh:** Moriesly AI Team  
**Terakhir diupdate:** 2024

Happy migrating! 🚀