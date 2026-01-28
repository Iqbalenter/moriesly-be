# 📋 SUMMARY: Scripts Migration Role System

## 🎯 Tujuan

Scripts ini dibuat untuk **menambahkan fitur role system ke user-user lama** yang belum memiliki field role. User baru sudah otomatis mendapatkan role saat registrasi melalui `initializeUserProfile()`, tapi user lama perlu dimigrasikan secara manual.

---

## 📦 Files Yang Dibuat

### 1. **migrate-user-roles.js** ⭐ (MAIN MIGRATION)
- **Fungsi**: Inject field role ke user lama
- **Field yang ditambahkan**:
  - `role: "free"`
  - `roleUpdatedAt: <timestamp>`
  - `subscriptionExpiry: null`
  - `paymentHistory: []`
- **Fitur**:
  - ✅ Dry-run mode (test tanpa update)
  - ✅ Force mode (update semua user)
  - ✅ Batch processing (500 operasi/batch)
  - ✅ Progress indicator
  - ✅ Verification hasil
  - ✅ Error handling

### 2. **check-user-roles.js** 🔍 (VERIFICATION)
- **Fungsi**: Check status role users
- **Fitur**:
  - ✅ List semua users dengan role
  - ✅ Statistik distribusi role
  - ✅ Check user tertentu (by email/uid)
  - ✅ Filter users tanpa role
  - ✅ Detect subscription akan expire
  - ✅ Track recent upgrades
  - ✅ Export ke JSON

### 3. **upgrade-user.js** 🚀 (MANUAL UPGRADE)
- **Fungsi**: Upgrade/downgrade user secara manual
- **Use cases**:
  - Testing fitur PRO/CUSTOM
  - Memberikan akses gratis
  - Fix role yang salah
- **Fitur**:
  - ✅ Upgrade ke PRO/CUSTOM
  - ✅ Custom duration (bulan)
  - ✅ Unlimited subscription
  - ✅ Downgrade ke FREE
  - ✅ Dry-run mode
  - ✅ Custom reason
  - ✅ Payment history tracking

### 4. **quick-migrate.sh** 🐧 (Linux/Mac)
- **Fungsi**: One-click migration untuk Linux/Mac
- **Workflow**: Check → Backup → Dry-run → Execute → Verify

### 5. **quick-migrate.bat** 🪟 (Windows)
- **Fungsi**: One-click migration untuk Windows
- **Workflow**: Sama dengan .sh version

### 6. **README.md** 📖
- **Fungsi**: Dokumentasi lengkap
- **Isi**:
  - Cara penggunaan setiap script
  - Workflow migrasi recommended
  - Troubleshooting guide
  - Best practices

### 7. **.gitignore**
- **Fungsi**: Ignore backup files
- **Ignore**: backup-*.json, report-*.json, logs, etc.

---

## 🚀 Cara Penggunaan

### Quick Start (Recommended)

#### Windows:
```bash
scripts\quick-migrate.bat
```

#### Linux/Mac:
```bash
chmod +x scripts/quick-migrate.sh
./scripts/quick-migrate.sh
```

### Manual Step-by-Step

#### 1. Check Status Awal
```bash
node scripts/check-user-roles.js
```

#### 2. Backup (Important!)
```bash
node scripts/check-user-roles.js --export backup.json
```

#### 3. Dry-Run Migration
```bash
node scripts/migrate-user-roles.js --dry-run
```

#### 4. Execute Migration
```bash
node scripts/migrate-user-roles.js
```

#### 5. Verify Hasil
```bash
node scripts/check-user-roles.js --missing-only
```

---

## 📊 Struktur Data Yang Ditambahkan

Setiap user akan mendapatkan field baru:

```javascript
{
  // ... existing fields ...
  
  // NEW FIELDS ⬇️
  role: "free",                    // "free" | "pro" | "custom"
  roleUpdatedAt: "2024-01-01T...", // ISO timestamp
  subscriptionExpiry: null,         // null untuk FREE, ISO timestamp untuk PRO/CUSTOM
  paymentHistory: [],               // Array of payment records
  previousRole: null,               // Track downgrade
  customPermissions: null           // Untuk CUSTOM role (optional)
}
```

### Payment History Entry:
```javascript
{
  date: "2024-01-01T...",
  fromRole: "free",
  toRole: "pro",
  amount: 0,                    // 0 untuk manual upgrade
  method: "manual_script",
  transactionId: "MANUAL_...",
  status: "success",
  reason: "Manual upgrade via script"
}
```

---

## ✅ Safety Features

### 1. Dry-Run Mode
- Semua script punya `--dry-run` flag
- Preview perubahan tanpa update database
- Wajib dijalankan sebelum execute

### 2. Backup Otomatis
- Quick-migrate script otomatis create backup
- Format: `backup-YYYYMMDD-HHMMSS.json`
- Simpan semua user data sebelum migration

### 3. Batch Processing
- Max 500 operasi per batch (Firestore limit)
- Hindari rate limiting
- Aman untuk ribuan users

### 4. Verification
- Auto-verify sample users setelah migration
- Manual check dengan `--missing-only`
- Export report untuk audit trail

### 5. Confirmation Prompt
- 5 detik countdown sebelum execute
- Bisa cancel dengan Ctrl+C
- Warning jelas di console

### 6. Error Handling
- Try-catch di setiap operasi
- Error count di summary
- Tidak stop saat 1 user error (continue)

---

## 🎯 Use Cases

### Use Case 1: Migration User Lama
```bash
# Semua user lama belum punya role
node scripts/migrate-user-roles.js --dry-run
node scripts/migrate-user-roles.js
```

### Use Case 2: Verify Setelah Migration
```bash
# Check apakah semua user sudah punya role
node scripts/check-user-roles.js --missing-only
```

### Use Case 3: Testing Fitur PRO
```bash
# Upgrade test account ke PRO
node scripts/upgrade-user.js --email test@example.com --role pro --unlimited
```

### Use Case 4: Memberikan PRO Gratis
```bash
# Beta tester reward
node scripts/upgrade-user.js \
  --email betatester@example.com \
  --role pro \
  --months 6 \
  --reason "Beta tester reward"
```

### Use Case 5: Fix Role Yang Salah
```bash
# Downgrade user yang salah di-set
node scripts/upgrade-user.js --uid USER_ID --role free
```

### Use Case 6: Audit Report
```bash
# Export data untuk audit
node scripts/check-user-roles.js --export audit-$(date +%Y%m%d).json
```

---

## 📈 Expected Results

### Sebelum Migration:
```
Total Users: 150
FREE Users: 0 (0%)
PRO Users: 0 (0%)
CUSTOM Users: 0 (0%)
NO ROLE: 150 (100%) ⚠️
```

### Setelah Migration:
```
Total Users: 150
FREE Users: 150 (100%) ✅
PRO Users: 0 (0%)
CUSTOM Users: 0 (0%)
NO ROLE: 0 (0%) ✅
```

---

## ⚠️ Important Notes

### 1. User Baru Tidak Butuh Migration
User yang registrasi setelah role system implemented sudah otomatis dapat role dari `initializeUserProfile()`.

### 2. Default Role: FREE
Semua user lama akan di-set ke `role: "free"` dengan `subscriptionExpiry: null`.

### 3. Tidak Ada Charging
Script ini hanya inject field, tidak ada payment processing. Untuk upgrade berbayar, gunakan payment gateway integration.

### 4. Idempotent
Script aman dijalankan berulang kali. Tidak akan duplicate data karena check `needsRoleUpdate()`.

### 5. Backward Compatible
Field baru tidak akan break existing functionality. Middleware akan handle user tanpa role dengan gracefully.

---

## 🔧 Configuration

### Firebase Service Account
Set environment variable:
```bash
# Linux/Mac
export FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/firebase-admin.json"

# Windows
set FIREBASE_SERVICE_ACCOUNT_PATH="C:\path\to\firebase-admin.json"
```

Atau letakkan di:
```
moriesly-be/project-cdfb53f0-89f3-4240-b91-firebase-adminsdk-fbsvc-2eb52c86fe.json
```

### Batch Size
Di `migrate-user-roles.js`:
```javascript
const BATCH_SIZE = 500; // Firestore batch limit
```

### Default Role
Di `migrate-user-roles.js`:
```javascript
const DEFAULT_ROLE = "free";
```

---

## 🐛 Troubleshooting

### Script tidak menemukan users
**Solusi**: Check Firebase connection dan collection name `users`

### Permission denied error
**Solusi**: Pastikan service account punya akses Firestore

### Migration timeout
**Solusi**: Normal untuk database besar, tunggu selesai atau increase timeout

### User masih missing role
**Solusi**: 
```bash
# Check specific user
node scripts/check-user-roles.js --uid USER_ID

# Manual upgrade
node scripts/upgrade-user.js --uid USER_ID --role free
```

---

## 📞 Support

Jika ada error atau pertanyaan:
1. ✅ Check README.md untuk dokumentasi lengkap
2. ✅ Review console logs
3. ✅ Check Firebase Console
4. ✅ Contact development team

---

## ✨ Summary

Scripts ini menyediakan **solusi lengkap dan aman** untuk migrasi role system ke user-user lama. Dengan fitur dry-run, backup otomatis, dan verification, Anda bisa yakin bahwa proses migration berjalan lancar tanpa merusak data existing.

**Total Lines of Code**: ~2,000 lines
**Total Scripts**: 7 files
**Time to Migrate**: ~5-10 menit (tergantung jumlah users)

---

**Status**: ✅ Ready to Use  
**Tested**: ⏳ Perlu testing di development environment  
**Production Ready**: ⚠️ Test dulu sebelum production!

---

**Happy Migrating! 🚀**