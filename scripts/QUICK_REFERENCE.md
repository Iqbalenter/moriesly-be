# 🚀 QUICK REFERENCE CARD - Role Migration Scripts

> Cheat sheet cepat untuk migration role system

---

## 📋 TL;DR - Cara Tercepat

### Windows:
```cmd
cd moriesly-be
scripts\quick-migrate.bat
```

### Linux/Mac:
```bash
cd moriesly-be
chmod +x scripts/quick-migrate.sh
./scripts/quick-migrate.sh
```

---

## 🎯 Command Reference

### 1️⃣ Check Status Users
```bash
# List semua users
node scripts/check-user-roles.js

# Check user spesifik
node scripts/check-user-roles.js --email user@example.com
node scripts/check-user-roles.js --uid USER_ID

# List user tanpa role saja
node scripts/check-user-roles.js --missing-only

# Export ke JSON
node scripts/check-user-roles.js --export report.json
```

### 2️⃣ Migration Users
```bash
# DRY-RUN (wajib!)
node scripts/migrate-user-roles.js --dry-run

# EXECUTE (update database)
node scripts/migrate-user-roles.js

# Force update semua
node scripts/migrate-user-roles.js --force
```

### 3️⃣ Upgrade User Manual
```bash
# Upgrade ke PRO (1 bulan)
node scripts/upgrade-user.js --email user@example.com --role pro

# Upgrade 3 bulan
node scripts/upgrade-user.js --email user@example.com --role pro --months 3

# Upgrade unlimited
node scripts/upgrade-user.js --email user@example.com --role custom --unlimited

# Downgrade ke FREE
node scripts/upgrade-user.js --email user@example.com --role free

# Dry-run dulu
node scripts/upgrade-user.js --email user@example.com --role pro --dry-run
```

---

## 📊 Data Structure

### Fields Yang Ditambahkan:
```javascript
{
  role: "free",                    // "free" | "pro" | "custom"
  roleUpdatedAt: "2024-01-01...",  // ISO timestamp
  subscriptionExpiry: null,         // null | ISO timestamp
  paymentHistory: []                // Array of payments
}
```

---

## ⚡ Quick Workflows

### Workflow 1: First Time Migration
```bash
# 1. Check current state
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

### Workflow 2: Give Free PRO Access
```bash
# Upgrade user for testing
node scripts/upgrade-user.js \
  --email tester@example.com \
  --role pro \
  --months 6 \
  --reason "Beta tester"
```

### Workflow 3: Verify After Migration
```bash
# Check if anyone still missing role
node scripts/check-user-roles.js --missing-only

# Should output: 0 users without role
```

---

## 🎨 Output Examples

### ✅ Success Output:
```
✅ Found 150 users
   - Users with role: 0
   - Users need update: 150

📦 Committing batches...
   ✅ Batch 1/1 committed

✅ Migration completed!
   Total Users Scanned: 150
   Users Updated: 150
   Errors: 0
```

### ⚠️ Warning Output:
```
⚠️ WARNING: 15 users found without role
   - user1@example.com
   - user2@example.com
   ...
```

---

## 🔐 Security Checklist

- [ ] ✅ Backup database sebelum migration
- [ ] ✅ Jalankan dry-run terlebih dahulu
- [ ] ✅ Test di development dulu
- [ ] ✅ Set Firebase service account path
- [ ] ✅ Review output dengan teliti
- [ ] ✅ Verify hasil setelah migration

---

## 🚨 Emergency Commands

### Rollback (Manual)
```bash
# Restore dari backup
# 1. Load backup JSON
# 2. Update users manually via Firebase Console
# atau buat rollback script sendiri
```

### Force Re-migration
```bash
# Re-apply role ke semua users
node scripts/migrate-user-roles.js --force
```

### Check Single User
```bash
# Debug specific user
node scripts/check-user-roles.js --uid USER_ID_HERE
```

---

## 📞 Quick Help

| Problem | Solution |
|---------|----------|
| Script error | Check Firebase service account path |
| User not found | Verify email/uid correct |
| Permission denied | Check service account IAM roles |
| No changes made | Use `--force` flag |
| Need rollback | Restore from backup JSON |

---

## 🎯 Flags Reference

### migrate-user-roles.js
- `--dry-run` : Test tanpa update DB
- `--force` : Update semua user (skip check)

### check-user-roles.js
- `--email <email>` : Check by email
- `--uid <uid>` : Check by user ID
- `--missing-only` : Show users without role
- `--export <file>` : Export to JSON

### upgrade-user.js
- `--email <email>` : Target by email
- `--uid <uid>` : Target by user ID
- `--role <role>` : free/pro/custom
- `--months <n>` : Duration in months
- `--unlimited` : Unlimited subscription
- `--dry-run` : Test mode
- `--reason <text>` : Custom reason

---

## 💡 Pro Tips

1. **Selalu dry-run dulu** sebelum execute
2. **Backup wajib** sebelum migration
3. **Test di dev** sebelum production
4. **Monitor logs** saat migration
5. **Verify hasil** setelah selesai

---

## 📈 Expected Timeline

| Step | Time |
|------|------|
| Check status | ~10 seconds |
| Backup | ~10 seconds |
| Dry-run | ~30 seconds |
| Execute | ~1-5 minutes* |
| Verify | ~10 seconds |

*Tergantung jumlah users

---

## ✨ One-Liner Collection

```bash
# Quick check
node scripts/check-user-roles.js | grep "NO ROLE"

# Quick backup
node scripts/check-user-roles.js --export backup-$(date +%Y%m%d).json

# Quick migration (with confirmation)
node scripts/migrate-user-roles.js

# Quick verify
node scripts/check-user-roles.js --missing-only

# Quick upgrade to PRO
node scripts/upgrade-user.js --email user@example.com --role pro
```

---

## 🆘 Emergency Contacts

- Check README.md for detailed docs
- Check SUMMARY.md for overview
- Check Firebase Console for manual verification
- Contact: Development Team

---

**Last Updated**: 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

---

**Happy Migrating! 🎉**