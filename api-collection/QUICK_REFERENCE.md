# Moriesly API - Quick Reference

## 🔗 Base URLs

- **Local**: `http://localhost:3001/api`
- **Production**: `https://your-production-url.com/api`

---

## 🔐 Authentication

### Register

```http
POST /users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
```

### Login

```http
POST /users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Headers untuk Protected Routes

```
Authorization: Bearer {your_token}
```

---

## 🏠 Home Page Endpoints

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| GET    | `/home/dashboard`    | Get dashboard data   |
| POST   | `/home/checkin`      | Daily check-in       |
| GET    | `/home/today-intake` | Today's food intake  |
| GET    | `/home/status`       | Complete status data |
| GET    | `/home/ledger/:date` | Get ledger by date   |

---

## 👤 Profile Endpoints

| Method | Endpoint          | Description        |
| ------ | ----------------- | ------------------ |
| GET    | `/profile`        | Get user profile   |
| PUT    | `/profile`        | Update profile     |
| POST   | `/profile/weight` | Add weight entry   |
| GET    | `/profile/weight` | Get weight history |

---

## 🍽️ Diet Endpoints

| Method | Endpoint                   | Description               |
| ------ | -------------------------- | ------------------------- |
| POST   | `/diet/generate-daily`     | Generate daily diet plan  |
| POST   | `/diet/generate-weekly`    | Generate weekly diet plan |
| POST   | `/diet/swap-meal`          | Swap meal in plan         |
| POST   | `/diet/verify-consumption` | Mark meal as consumed     |
| POST   | `/diet/shopping-list`      | Get shopping list         |

---

## 💪 Train Endpoints

| Method | Endpoint                        | Description            |
| ------ | ------------------------------- | ---------------------- |
| POST   | `/train/generate-daily`         | Generate daily workout |
| GET    | `/train/daily/:date`            | Get workout by date    |
| PUT    | `/train/daily/:date/completion` | Update completion      |
| GET    | `/train/active-plan`            | Get active plan        |

---

## 📸 Scan Endpoints

| Method | Endpoint        | Description          |
| ------ | --------------- | -------------------- |
| POST   | `/scan/food`    | Scan food image      |
| POST   | `/scan/label`   | Scan nutrition label |
| POST   | `/scan/barcode` | Scan barcode         |
| POST   | `/scan/receipt` | Scan receipt         |
| POST   | `/scan/versus`  | Compare two foods    |
| POST   | `/scan/skin`    | Scan skin            |

---

## 💬 Chat Endpoints

| Method | Endpoint         | Description         |
| ------ | ---------------- | ------------------- |
| POST   | `/chat/message`  | Send message to AI  |
| GET    | `/chat/summary`  | Get today's summary |
| POST   | `/chat/sessions` | Create chat session |
| GET    | `/chat/sessions` | Get all sessions    |

---

## 🧬 Bio Endpoints

| Method | Endpoint                 | Description       |
| ------ | ------------------------ | ----------------- |
| GET    | `/bio`                   | Get bio data      |
| POST   | `/bio/skin-scan`         | Perform skin scan |
| POST   | `/bio/skin-scan/save`    | Save scan result  |
| GET    | `/bio/skin-scan/latest`  | Get latest scan   |
| GET    | `/bio/skin-scan/history` | Get scan history  |

---

## 💎 Subscription Endpoints

| Method | Endpoint                | Description           |
| ------ | ----------------------- | --------------------- |
| GET    | `/subscription`         | Get subscription info |
| GET    | `/subscription/usage`   | Get usage stats       |
| GET    | `/subscription/plans`   | Get available plans   |
| POST   | `/subscription/upgrade` | Upgrade subscription  |

---

## 📝 Food Log Endpoints

| Method | Endpoint              | Description            |
| ------ | --------------------- | ---------------------- |
| POST   | `/foodlog`            | Add food log           |
| GET    | `/foodlog/today`      | Get today's logs       |
| GET    | `/foodlog`            | Get logs by date range |
| GET    | `/foodlog/statistics` | Get statistics         |
| DELETE | `/foodlog/:logId`     | Delete log             |

---

## 📊 Status & Track Endpoints

| Method | Endpoint                | Description          |
| ------ | ----------------------- | -------------------- |
| GET    | `/status`               | Get complete status  |
| GET    | `/status/goal`          | Get current goal     |
| PUT    | `/status/goal/progress` | Update goal progress |
| GET    | `/track/weight`         | Weight tracking      |
| GET    | `/track/history`        | Activity history     |
| POST   | `/track/history`        | Add activity         |

---

## 📰 Feed Endpoints

| Method | Endpoint         | Description            |
| ------ | ---------------- | ---------------------- |
| POST   | `/feed/generate` | Generate feed articles |
| GET    | `/feed/usage`    | Get feed usage         |

---

## 📌 Common Query Parameters

- `limit`: Limit number of results (default: varies per endpoint)
- `startDate`: Start date for range queries (YYYY-MM-DD)
- `endDate`: End date for range queries (YYYY-MM-DD)
- `date`: Specific date filter (YYYY-MM-DD)
- `action`: Filter by action type

---

## ✅ Common Request Bodies

### Update Profile

```json
{
  "displayName": "Updated Name",
  "age": 26,
  "height": 172,
  "weight": 70,
  "activityLevel": "moderate"
}
```

### Add Food Log

```json
{
  "foodName": "Nasi Goreng",
  "calories": 450,
  "protein": 15,
  "carbs": 60,
  "fat": 18,
  "mealType": "lunch"
}
```

### Add Weight

```json
{
  "weight": 69.5,
  "date": "2026-01-27",
  "notes": "Morning weight"
}
```

### Generate Diet Plan

```json
{
  "category": "weight_loss",
  "inputMode": "auto"
}
```

### Send Chat Message

```json
{
  "message": "Halo, apa kabar?",
  "context": "greeting"
}
```

---

## 🚦 Response Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized (invalid/expired token)
- **403**: Forbidden (no permission)
- **404**: Not Found
- **429**: Rate Limit Exceeded
- **500**: Server Error

---

## 🔑 Permissions Required

Beberapa endpoints memerlukan specific permissions:

- **canAIChat**: Chat endpoints
- **canGenerateDietPlan**: Diet generation
- **canGenerateTrainingPlan**: Training generation
- **canSkinScan**: Skin scan endpoints
- **canVideoCall**: Video call features

---

## 💡 Testing Tips

1. **Selalu login dulu** sebelum test protected endpoints
2. **Check token** sudah tersimpan di environment
3. **Gunakan absolute path** untuk file upload
4. **Ganti placeholder IDs** dengan ID sebenarnya
5. **Test dengan different roles** (free, premium) untuk permission testing

---

## 📞 Health Check

```http
GET /health
```

Response:

```json
{
  "status": "OK",
  "message": "Moriesly Backend is running!"
}
```

---

**Quick Reference v1.0**  
Last Updated: January 27, 2026
