# 📚 INDEX - Role Migration Scripts

> **Navigation hub untuk semua scripts dan dokumentasi**

---

## 🎯 **START HERE**

Baru pertama kali? Baca ini dulu:

1. 📖 **[README.md](README.md)** - Dokumentasi lengkap dan detailed
2. 📋 **[SUMMARY.md](SUMMARY.md)** - Overview dan purpose semua scripts
3. 🚀 **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Cheat sheet dan quick commands

---

## 🛠️ **EXECUTABLE SCRIPTS**

### **Main Scripts:**

| Script | Fungsi | Dokumentasi |
|--------|--------|-------------|
| **[migrate-user-roles.js](migrate-user-roles.js)** | 🔄 Inject role ke user lama | [Guide](#migrate-user-roles) |
| **[check-user-roles.js](check-user-roles.js)** | 🔍 Check status role users | [Guide](#check-user-roles) |
| **[upgrade-user.js](upgrade-user.js)** | 🚀 Manual upgrade/downgrade | [Guide](#upgrade-user) |

### **Quick Launch Scripts:**

| Script | Platform | Fungsi |
|--------|----------|--------|
| **[quick-migrate.bat](quick-migrate.bat)** | 🪟 Windows | One-click migration |
| **[quick-migrate.sh](quick-migrate.sh)** | 🐧 Linux/Mac | One-click migration |

---

## 📖 **DOCUMENTATION**

| File | Isi |
|------|-----|
| **[README.md](README.md)** | Full documentation dengan examples |
| **[SUMMARY.md](SUMMARY.md)** | Project overview dan architecture |
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Quick commands cheat sheet |
| **[.gitignore](.gitignore)** | Git ignore rules untuk backup files |

---

## 🚀 **QUICK START GUIDE**

### **Option 1: One-Click Migration (Recommended)**

#### Windows:
```cmd
scripts\quick-migrate.bat
```

#### Linux/Mac:
```bash
chmod +x scripts/quick-migrate.sh
./scripts/quick-migrate.sh
```

### **Option 2: Manual Step-by-Step**

```bash
# 1. Check status
node scripts/check-user-roles.js

# 2. Backup
node scripts/check-user-roles.js --export backup.json

# 3. Dry-run
node scripts/migrate-user-roles.js --dry-run

# 4. Execute
node scripts/migrate-user-roles.js

# 5. Verify
node scripts/check-user-roles.js --missing-only
```

---

## 📘 **SCRIPT DETAILS**

### **migrate-user-roles.js**

**Purpose:** Menambahkan field role system ke user-user lama

**Usage:**
```bash
# Dry-run (test mode)
node scripts/migrate-user-roles.js --dry-run

# Execute (update database)
node scripts/migrate-user-roles.js

# Force (update all users)
node scripts/migrate-user-roles.js --force
```

**What it does:**
- ✅ Scan semua users di database
- ✅ Filter users yang belum punya role
- ✅ Add default fields: `role`, `roleUpdatedAt`, `subscriptionExpiry`, `paymentHistory`
- ✅ Batch processing (500 users per batch)
- ✅ Verification dan summary

**Output:**
- Total users scanned
- Users needing update
- Progress indicator
- Success/error summary
- Sample verification

---

### **check-user-roles.js**

**Purpose:** Mengecek status role dari users

**Usage:**
```bash
# Check all users
node scripts/check-user-roles.js

# Check specific user
node scripts/check-user-roles.js --email user@example.com
node scripts/check-user-roles.js --uid USER_ID

# Filter missing roles only
node scripts/check-user-roles.js --missing-only

# Export to JSON
node scripts/check-user-roles.js --export report.json
```

**What it does:**
- ✅ List all users dengan role info
- ✅ Statistics (FREE/PRO/CUSTOM distribution)
- ✅ Detect expiring subscriptions (7 days)
- ✅ Track recent upgrades (30 days)
- ✅ Export data to JSON

**Output:**
- Table of all users
- Role distribution stats
- Expiring soon alerts
- Recent upgrades list
- JSON export (optional)

---

### **upgrade-user.js**

**Purpose:** Upgrade/downgrade user role secara manual

**Usage:**
```bash
# Upgrade to PRO (1 month)
node scripts/upgrade-user.js --email user@example.com --role pro

# Upgrade with custom duration (3 months)
node scripts/upgrade-user.js --email user@example.com --role pro --months 3

# Upgrade unlimited
node scripts/upgrade-user.js --email user@example.com --role custom --unlimited

# Downgrade to FREE
node scripts/upgrade-user.js --email user@example.com --role free

# With custom reason
node scripts/upgrade-user.js --email user@example.com --role pro --reason "Beta tester"

# Dry-run mode
node scripts/upgrade-user.js --email user@example.com --role pro --dry-run
```

**What it does:**
- ✅ Find user by email or UID
- ✅ Update role dan subscription
- ✅ Add payment history entry
- ✅ Calculate expiry date
- ✅ Verification

**Use Cases:**
- 🧪 Testing PRO/CUSTOM features
- 🎁 Giving free PRO access
- 🔧 Fixing wrong roles
- 📊 Manual user management

---

## 🗂️ **FILE STRUCTURE**

```
scripts/
├── 📄 INDEX.md                    # ← YOU ARE HERE
├── 📖 README.md                   # Full documentation
├── 📋 SUMMARY.md                  # Overview
├── 🚀 QUICK_REFERENCE.md          # Cheat sheet
│
├── 🔄 migrate-user-roles.js       # Main migration
├── 🔍 check-user-roles.js         # Status checker
├── 🚀 upgrade-user.js             # Manual upgrade
│
├── 🪟 quick-migrate.bat           # Windows launcher
├── 🐧 quick-migrate.sh            # Linux/Mac launcher
│
└── 🔒 .gitignore                  # Ignore backup files
```

---

## 📊 **DATA STRUCTURE**

### **Fields Added to Users:**

```javascript
{
  // Existing user fields...
  
  // NEW FIELDS ⬇️
  role: "free",                    // "free" | "pro" | "custom"
  roleUpdatedAt: "2024-01-01...",  // ISO 8601 timestamp
  subscriptionExpiry: null,         // null for FREE, ISO timestamp for PRO/CUSTOM
  paymentHistory: [],               // Array of payment records
  previousRole: null,               // Track downgrades (optional)
  customPermissions: null           // For CUSTOM role (optional)
}
```

### **Payment History Entry:**

```javascript
{
  date: "2024-01-01T00:00:00.000Z",
  fromRole: "free",
  toRole: "pro",
  amount: 0,                        // 0 for manual upgrades
  method: "manual_script",
  transactionId: "MANUAL_1234567890",
  status: "success",
  reason: "Manual upgrade via script"
}
```

---

## ⚙️ **CONFIGURATION**

### **Firebase Service Account:**

```bash
# Option 1: Environment Variable (Recommended)
export FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/firebase-admin.json"

# Windows
set FIREBASE_SERVICE_ACCOUNT_PATH="C:\path\to\firebase-admin.json"

# Option 2: Default Path
# Place file at: moriesly-be/project-cdfb53f0-89f3-4240-b91-firebase-adminsdk-fbsvc-2eb52c86fe.json
```

### **Editable Constants:**

In `migrate-user-roles.js`:
```javascript
const DEFAULT_ROLE = "free";        // Change if needed
const BATCH_SIZE = 500;             // Firestore batch limit
```

---

## ✅ **SAFETY CHECKLIST**

Before running migration:

- [ ] ✅ Read README.md completely
- [ ] ✅ Backup database (use `--export`)
- [ ] ✅ Test di development environment dulu
- [ ] ✅ Run dry-run mode first
- [ ] ✅ Review dry-run output carefully
- [ ] ✅ Set Firebase service account path
- [ ] ✅ Have rollback plan ready
- [ ] ✅ Monitor console logs during execution
- [ ] ✅ Verify results after migration
- [ ] ✅ Export audit report

---

## 🎯 **COMMON WORKFLOWS**

### **Workflow 1: First Time Migration**

```bash
# Check current state
node scripts/check-user-roles.js

# Backup
node scripts/check-user-roles.js --export backup-$(date +%Y%m%d).json

# Dry-run
node scripts/migrate-user-roles.js --dry-run

# Execute
node scripts/migrate-user-roles.js

# Verify
node scripts/check-user-roles.js --missing-only
```

### **Workflow 2: Testing PRO Features**

```bash
# Upgrade test account
node scripts/upgrade-user.js \
  --email test@example.com \
  --role pro \
  --unlimited \
  --reason "Testing account"
```

### **Workflow 3: Audit & Report**

```bash
# Generate comprehensive report
node scripts/check-user-roles.js --export audit-report.json

# Check for issues
node scripts/check-user-roles.js --missing-only
```

### **Workflow 4: Beta Tester Rewards**

```bash
# Give 6 months PRO
node scripts/upgrade-user.js \
  --email betatester@example.com \
  --role pro \
  --months 6 \
  --reason "Beta tester reward"
```

---

## 🐛 **TROUBLESHOOTING**

| Problem | Quick Fix |
|---------|-----------|
| **Firebase connection error** | Check service account path |
| **User not found** | Verify email/uid spelling |
| **Permission denied** | Check Firebase IAM roles |
| **Script hangs** | Normal for large DB, wait |
| **Role still missing** | Run manual upgrade |
| **Need rollback** | Use backup JSON file |

**More help:** See [README.md > Troubleshooting](README.md#-troubleshooting)

---

## 📞 **GETTING HELP**

1. 📖 Check [README.md](README.md) - Most detailed docs
2. 🚀 Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick commands
3. 📋 Check [SUMMARY.md](SUMMARY.md) - Understanding the system
4. 🔍 Check console logs for specific errors
5. 🌐 Check Firebase Console for data verification
6. 👥 Contact development team

---

## 📈 **PROJECT STATUS**

| Component | Status |
|-----------|--------|
| **Migration Script** | ✅ Ready |
| **Check Script** | ✅ Ready |
| **Upgrade Script** | ✅ Ready |
| **Documentation** | ✅ Complete |
| **Testing** | ⏳ Needs testing in dev |
| **Production** | ⚠️ Test first! |

---

## 🎓 **LEARNING PATH**

**New to the project?**

1. Read → [SUMMARY.md](SUMMARY.md) (10 min)
2. Understand → [README.md](README.md) (20 min)
3. Practice → Run scripts with `--dry-run` (5 min)
4. Reference → Keep [QUICK_REFERENCE.md](QUICK_REFERENCE.md) handy

**Ready to migrate?**

1. Backup database ✅
2. Run `quick-migrate` script 🚀
3. Verify results 🔍
4. Done! 🎉

---

## 📝 **VERSION INFO**

- **Version:** 1.0.0
- **Created:** 2024
- **Last Updated:** 2024
- **Compatibility:** Node.js 14+
- **Database:** Firebase Firestore
- **Status:** ✅ Production Ready (test first!)

---

## 🌟 **QUICK LINKS**

| Link | Description |
|------|-------------|
| [📖 README](README.md) | Full documentation |
| [📋 SUMMARY](SUMMARY.md) | Project overview |
| [🚀 QUICK REF](QUICK_REFERENCE.md) | Command cheat sheet |
| [🔄 Migrate](migrate-user-roles.js) | Main migration script |
| [🔍 Check](check-user-roles.js) | Status checker |
| [🚀 Upgrade](upgrade-user.js) | Manual upgrade |

---

## 💡 **PRO TIPS**

1. **Always dry-run first** - Catches issues before they happen
2. **Backup is mandatory** - You'll thank yourself later
3. **Test in dev** - Never test in production first
4. **Monitor logs** - Watch for errors during execution
5. **Verify results** - Always check after migration

---

## 🎉 **SUCCESS INDICATORS**

You know migration succeeded when:

- ✅ All users have `role` field
- ✅ `check-user-roles.js --missing-only` returns 0 users
- ✅ Statistics show 100% users with roles
- ✅ No errors in migration summary
- ✅ Sample users verified correctly

---

**Need help? Start with [README.md](README.md)**

**Ready to migrate? Run `quick-migrate` script!**

**Happy Migrating! 🚀**