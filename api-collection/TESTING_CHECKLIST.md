# Testing Checklist - Moriesly API

Gunakan checklist ini untuk memastikan semua endpoint sudah di-test dengan benar.

## ✅ Testing Progress

### 1. Authentication & User Management

- [ ] **Register User** - POST `/users/register`
  - [ ] Register dengan data valid
  - [ ] Register dengan email yang sudah ada (should fail)
  - [ ] Register dengan password lemah (should fail)

- [ ] **Login** - POST `/users/login`
  - [ ] Login dengan credentials benar
  - [ ] Login dengan password salah (should fail)
  - [ ] Login dengan email tidak terdaftar (should fail)
  - [ ] Verify token tersimpan otomatis

- [ ] **Verify Token** - GET `/users/verify-token`
  - [ ] Verify dengan token valid
  - [ ] Verify dengan token invalid (should fail)

- [ ] **Initialize User** - POST `/users/initialize`
  - [ ] Initialize dengan data lengkap
  - [ ] Initialize user yang sudah initialized (should update)

- [ ] **Get Current User** - GET `/users/current`
  - [ ] Get user data dengan token valid
  - [ ] Get user tanpa token (should fail)

---

### 2. Home Page

- [ ] **Get Dashboard** - GET `/home/dashboard`
  - [ ] Get dengan user yang sudah initialized
  - [ ] Verify data lengkap (rank, profile, status)

- [ ] **Daily Check-In** - POST `/home/checkin`
  - [ ] Check-in pertama kali (streak = 1)
  - [ ] Check-in consecutive days (streak increase)
  - [ ] Check-in di hari yang sama (should not increase)

- [ ] **Get Today Intake** - GET `/home/today-intake`
  - [ ] Get sebelum ada food log (empty)
  - [ ] Get setelah ada food log (should show data)

- [ ] **Get Status** - GET `/home/status`
  - [ ] Verify complete status data

- [ ] **Get Future Projection** - GET `/home/future-projection`
  - [ ] Get dengan goal yang sudah di-set
  - [ ] Verify projection calculation

- [ ] **Scan Food** - POST `/home/scan-food`
  - [ ] Scan dengan gambar makanan valid
  - [ ] Test dengan berbagai jenis makanan

- [ ] **Get Ledger by Date** - GET `/home/ledger/:date`
  - [ ] Get ledger untuk hari ini
  - [ ] Get ledger untuk tanggal di masa lalu

- [ ] **Get History** - GET `/home/history`
  - [ ] Get dengan limit default
  - [ ] Get dengan custom limit

---

### 3. Profile Management

- [ ] **Get Profile** - GET `/profile`
  - [ ] Get profile data lengkap

- [ ] **Update Profile** - PUT `/profile`
  - [ ] Update displayName
  - [ ] Update age, height
  - [ ] Update activityLevel

- [ ] **Add Weight** - POST `/profile/weight`
  - [ ] Add weight entry baru
  - [ ] Add dengan custom date
  - [ ] Add dengan notes

- [ ] **Get Weight History** - GET `/profile/weight`
  - [ ] Get dengan limit 30
  - [ ] Verify trending calculation

---

### 4. Diet Planning

- [ ] **Generate Daily Diet Plan** - POST `/diet/generate-daily`
  - [ ] Generate untuk weight_loss
  - [ ] Generate untuk muscle_gain
  - [ ] Generate dengan auto mode
  - [ ] Generate dengan manual mode + custom goal

- [ ] **Generate Weekly Diet Plan** - POST `/diet/generate-weekly`
  - [ ] Generate 7-day plan
  - [ ] Verify semua hari terisi

- [ ] **Swap Meal** - POST `/diet/swap-meal`
  - [ ] Swap meal dengan reason
  - [ ] Verify meal berbeda dari original

- [ ] **Verify Consumption** - POST `/diet/verify-consumption`
  - [ ] Mark meal as consumed
  - [ ] Mark meal as not consumed

- [ ] **Get Shopping List** - POST `/diet/shopping-list`
  - [ ] Generate untuk 7 hari
  - [ ] Verify kategorisasi bahan

- [ ] **Save Diet Plan** - POST `/diet/save-plan`
  - [ ] Save generated plan
  - [ ] Save custom plan

- [ ] **Get Active Diet Plan** - GET `/diet/active-plan`
  - [ ] Get setelah save plan
  - [ ] Verify progress tracking

---

### 5. Training Plans

- [ ] **Generate Daily Training Plan** - POST `/train/generate-daily`
  - [ ] Generate untuk strength
  - [ ] Generate untuk cardio
  - [ ] Test berbagai difficulty levels

- [ ] **Get Daily Training Plan** - GET `/train/daily/:date`
  - [ ] Get untuk hari ini
  - [ ] Get untuk tanggal tertentu

- [ ] **Save Daily Training Plan** - POST `/train/daily/:date`
  - [ ] Save custom workout
  - [ ] Update existing plan

- [ ] **Check Plan Exists** - GET `/train/daily/:date/check`
  - [ ] Check untuk date yang ada plan
  - [ ] Check untuk date yang belum ada plan

- [ ] **Update Training Completion** - PUT `/train/daily/:date/completion`
  - [ ] Mark workout as completed
  - [ ] Mark meal as completed
  - [ ] Test berbagai indexes

- [ ] **Get Training Completion** - GET `/train/daily/:date/completion`
  - [ ] Verify completion percentage
  - [ ] Check completed counts

- [ ] **Save Weekly Training Plan** - POST `/train/weekly-plan`
  - [ ] Save 7-day workout plan

- [ ] **Get Active Training Plan** - GET `/train/active-plan`
  - [ ] Verify active plan data

---

### 6. Scanning Features

- [ ] **Scan Food** - POST `/scan/food`
  - [ ] Scan nasi goreng
  - [ ] Scan ayam goreng
  - [ ] Scan buah
  - [ ] Scan makanan kompleks

- [ ] **Scan Label** - POST `/scan/label`
  - [ ] Scan nutrition label kemasan
  - [ ] Verify nutrisi terextract

- [ ] **Scan Barcode** - POST `/scan/barcode`
  - [ ] Scan barcode produk Indonesia
  - [ ] Test produk yang tidak ditemukan

- [ ] **Scan Receipt** - POST `/scan/receipt`
  - [ ] Scan struk belanja
  - [ ] Verify items terdeteksi

- [ ] **Scan Versus** - POST `/scan/versus`
  - [ ] Compare 2 makanan
  - [ ] Verify comparison result

- [ ] **Scan Skin** - POST `/scan/skin`
  - [ ] Scan dengan premium account
  - [ ] Test dengan free account (should fail)
  - [ ] Verify skin analysis result

---

### 7. Chat & Consultation

- [ ] **Send Message** - POST `/chat/message`
  - [ ] Send greeting message
  - [ ] Send diet question
  - [ ] Send workout question
  - [ ] Test daily limit (premium vs free)

- [ ] **Get Today Summary** - GET `/chat/summary`
  - [ ] Get after several messages
  - [ ] Verify summary content

- [ ] **Create Chat Session** - POST `/chat/sessions`
  - [ ] Create dengan title
  - [ ] Create dengan type

- [ ] **Get Chat Sessions** - GET `/chat/sessions`
  - [ ] Get all sessions
  - [ ] Verify chronological order

---

### 8. Bio & Health Data

- [ ] **Get Bio Data** - GET `/bio`
  - [ ] Get complete bio data

- [ ] **Perform Skin Scan** - POST `/bio/skin-scan`
  - [ ] Scan dengan premium account
  - [ ] Verify analysis result

- [ ] **Save Skin Scan Result** - POST `/bio/skin-scan/save`
  - [ ] Save scan result
  - [ ] Include imageUrl

- [ ] **Get Latest Skin Scan** - GET `/bio/skin-scan/latest`
  - [ ] Verify latest scan

- [ ] **Get Skin Scan History** - GET `/bio/skin-scan/history`
  - [ ] Get dengan limit 10

- [ ] **Save Consultation** - POST `/bio/consultation`
  - [ ] Save dengan type nutrition
  - [ ] Save dengan recommendations

- [ ] **Get Consultation History** - GET `/bio/consultation/history`
  - [ ] Get all consultations

---

### 9. Subscription Management

- [ ] **Get Subscription** - GET `/subscription`
  - [ ] Get dengan free account
  - [ ] Get dengan premium account
  - [ ] Verify permissions berbeda

- [ ] **Get Usage Stats** - GET `/subscription/usage`
  - [ ] Check daily usage
  - [ ] Verify limits

- [ ] **Get Available Plans** - GET `/subscription/plans`
  - [ ] Verify semua plans listed

- [ ] **Upgrade Subscription** - POST `/subscription/upgrade`
  - [ ] Test upgrade flow
  - [ ] Verify permissions updated

- [ ] **Check Expiry** - GET `/subscription/check-expiry`
  - [ ] Check dengan active subscription
  - [ ] Check near expiry

---

### 10. Feed Generation

- [ ] **Generate Feed** - POST `/feed/generate`
  - [ ] Generate 5 articles
  - [ ] Generate dengan history context
  - [ ] Test daily limit

- [ ] **Get Feed Usage** - GET `/feed/usage`
  - [ ] Verify remaining generations

---

### 11. Food Logging

- [ ] **Add Food Log** - POST `/foodlog`
  - [ ] Add breakfast
  - [ ] Add lunch
  - [ ] Add dinner
  - [ ] Add snack

- [ ] **Get Today Logs** - GET `/foodlog/today`
  - [ ] Verify all today's logs

- [ ] **Get Logs by Date Range** - GET `/foodlog`
  - [ ] Get 7 days range
  - [ ] Get 30 days range

- [ ] **Get Statistics** - GET `/foodlog/statistics`
  - [ ] Verify average calculations
  - [ ] Check trend analysis

- [ ] **Delete Food Log** - DELETE `/foodlog/:logId`
  - [ ] Delete specific log
  - [ ] Verify log removed

---

### 12. Status Tracking

- [ ] **Get Complete Status** - GET `/status`
  - [ ] Verify all status components

- [ ] **Get Goal** - GET `/status/goal`
  - [ ] Verify current goal data

- [ ] **Update Goal Progress** - PUT `/status/goal/progress`
  - [ ] Update manual progress
  - [ ] Add notes

- [ ] **Get Weight History** - GET `/status/weight-history`
  - [ ] Get 30 days
  - [ ] Verify chart data

- [ ] **Get Ledger Range** - GET `/status/ledger-range`
  - [ ] Get 7 days ledger
  - [ ] Get monthly ledger

---

### 13. Activity Tracking

- [ ] **Get Weight Tracking** - GET `/track/weight`
  - [ ] Get tracking data
  - [ ] Verify trend

- [ ] **Add Weight** - POST `/track/weight`
  - [ ] Add dengan notes

- [ ] **Get Activity History** - GET `/track/history`
  - [ ] Get all activities
  - [ ] Verify pagination

- [ ] **Get History by Action** - GET `/track/history/by-action`
  - [ ] Filter by workout
  - [ ] Filter by meal
  - [ ] Filter by checkin

- [ ] **Add Activity History** - POST `/track/history`
  - [ ] Add manual workout
  - [ ] Add dengan metadata

- [ ] **Delete History** - DELETE `/track/history/:historyId`
  - [ ] Delete specific entry

- [ ] **Get Food Statistics** - GET `/track/food-statistics`
  - [ ] Verify statistics

- [ ] **Get Food Logs** - GET `/track/food-logs`
  - [ ] Get by date range

---

## 🎯 Priority Testing

### High Priority (Core Features)

1. Authentication flow
2. Profile management
3. Diet plan generation
4. Food logging
5. Subscription & permissions

### Medium Priority

1. Training plans
2. Scan features
3. Chat & AI
4. Status tracking

### Low Priority (Nice to Have)

1. Feed generation
2. Skin scan
3. Consultation history

---

## 📊 Testing Coverage

**Target**: 100% endpoint coverage

- Total Endpoints: **80+**
- Tested: **\_** / 80+
- Coverage: **\_**%

---

## 🐛 Bug Tracking

| Endpoint | Issue | Status | Priority |
| -------- | ----- | ------ | -------- |
|          |       |        |          |
|          |       |        |          |

---

## ✨ Test Results Summary

### Authentication ✅/❌

- Register: \_\_\_
- Login: \_\_\_
- Token management: \_\_\_

### Core Features ✅/❌

- Profile: \_\_\_
- Diet: \_\_\_
- Training: \_\_\_
- Food Log: \_\_\_

### Advanced Features ✅/❌

- Scanning: \_\_\_
- Chat: \_\_\_
- Bio: \_\_\_
- Subscription: \_\_\_

---

**Last Updated**: ****\_\_\_\_****  
**Tested By**: ****\_\_\_\_****  
**Environment**: Local / Production
