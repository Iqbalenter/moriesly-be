# Deploy ke Cloud Run - Panduan Lengkap

## 📋 Prerequisites

1. **Google Cloud SDK** terinstall

   ```bash
   # Cek apakah sudah terinstall
   gcloud --version

   # Kalau belum, download dari: https://cloud.google.com/sdk/docs/install
   ```

2. **Docker** terinstall

   ```bash
   docker --version
   ```

3. **Project GCP** sudah dibuat
   - Buka: https://console.cloud.google.com
   - Buat project baru atau gunakan yang sudah ada

## 🔐 Setup Firebase Service Account

### Cara 1: Menggunakan Environment Variable (RECOMMENDED)

1. **Download Firebase Service Account:**
   - Buka Firebase Console: https://console.firebase.google.com
   - Pilih project Anda
   - Settings → Service accounts
   - Click "Generate new private key"
   - Simpan file JSON yang di-download

2. **Convert JSON ke format satu baris:**

   ```bash
   # Di terminal, jalankan:
   cat firebase-admin-key.json | jq -c

   # Atau di PowerShell:
   Get-Content firebase-admin-key.json | ConvertFrom-Json | ConvertTo-Json -Compress
   ```

   Copy output-nya (satu baris JSON)

3. **Set sebagai environment variable di Cloud Run:**
   ```bash
   gcloud run services update moriesly-be \
     --update-env-vars FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account"...}'
   ```

### Cara 2: Menggunakan Secret Manager (LEBIH AMAN)

1. **Enable Secret Manager API:**

   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

2. **Upload service account ke Secret Manager:**

   ```bash
   gcloud secrets create firebase-service-account \
     --data-file=firebase-admin-key.json
   ```

3. **Berikan akses ke Cloud Run:**

   ```bash
   gcloud secrets add-iam-policy-binding firebase-service-account \
     --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

4. **Mount secret di Cloud Run saat deploy:**
   ```bash
   gcloud run deploy moriesly-be \
     --image gcr.io/PROJECT_ID/moriesly-be \
     --update-secrets FIREBASE_SERVICE_ACCOUNT_JSON=firebase-service-account:latest
   ```

## 🚀 Deployment Steps

### Step 1: Setup Awal

```bash
# Login ke GCloud
gcloud auth login

# Set project ID (ganti dengan project ID Anda)
gcloud config set project project-cdfb53f0-89f3-4240-b91

# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Konfigurasi Docker untuk GCP
gcloud auth configure-docker
```

### Step 2: Build & Deploy

**Opsi A - Manual Deploy:**

```bash
# 1. Build Docker image
docker build -t gcr.io/PROJECT_ID/moriesly-be .

# 2. Push ke Container Registry
docker push gcr.io/PROJECT_ID/moriesly-be

# 3. Deploy ke Cloud Run
gcloud run deploy moriesly-be \
  --image gcr.io/PROJECT_ID/moriesly-be \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --set-env-vars "NODE_ENV=production,PORT=8080,GEMINI_API_KEY=YOUR_KEY,FRONTEND_URLS=https://yourdomain.com" \
  --set-env-vars "FIREBASE_SERVICE_ACCOUNT_JSON=$(cat firebase-admin-key.json | jq -c)"
```

**Opsi B - Menggunakan Script:**

```bash
# Edit deploy.sh terlebih dahulu (set PROJECT_ID yang benar)
chmod +x deploy.sh
./deploy.sh
```

**Opsi C - Direct Deploy dari Source (Tanpa Docker):**

```bash
gcloud run deploy moriesly-be \
  --source . \
  --platform managed \
  --region asia-southeast2 \
  --allow-unauthenticated
```

### Step 3: Set Environment Variables

Setelah deploy pertama kali, set environment variables:

```bash
gcloud run services update moriesly-be \
  --update-env-vars "NODE_ENV=production" \
  --update-env-vars "PORT=8080" \
  --update-env-vars "GEMINI_API_KEY=YOUR_GEMINI_KEY" \
  --update-env-vars "FIREBASE_WEB_API_KEY=YOUR_FIREBASE_WEB_KEY" \
  --update-env-vars "FRONTEND_URLS=https://yourdomain.com,https://www.yourdomain.com" \
  --update-env-vars "FIREBASE_SERVICE_ACCOUNT_JSON={...json_content...}"
```

Atau edit di Console:

- Buka: https://console.cloud.google.com/run
- Pilih service "moriesly-be"
- Click "EDIT & DEPLOY NEW REVISION"
- Tab "Variables & Secrets"
- Tambahkan environment variables

## 🔧 Environment Variables yang Diperlukan

```env
NODE_ENV=production
PORT=8080
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_WEB_API_KEY=your_firebase_web_api_key
FRONTEND_URLS=https://yourdomain.com,https://another-domain.com

# Opsi 1: JSON langsung (untuk Cloud Run)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Opsi 2: Path file (untuk development)
FIREBASE_SERVICE_ACCOUNT_PATH=secrets/firebase-admin.json
```

## 📊 Monitoring & Logs

```bash
# Lihat logs
gcloud run services logs read moriesly-be --region asia-southeast2

# Lihat detail service
gcloud run services describe moriesly-be --region asia-southeast2

# List semua services
gcloud run services list
```

## 🔄 Update Service

Setelah push code baru ke GitHub:

```bash
# Build & deploy ulang
gcloud builds submit --tag gcr.io/PROJECT_ID/moriesly-be
gcloud run deploy moriesly-be \
  --image gcr.io/PROJECT_ID/moriesly-be \
  --region asia-southeast2
```

Atau gunakan script:

```bash
./deploy.sh
```

## 🌐 Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service moriesly-be \
  --domain api.yourdomain.com \
  --region asia-southeast2
```

## 💰 Estimasi Biaya

Cloud Run menggunakan pay-per-use:

- FREE tier: 2 million requests/bulan
- FREE tier: 360,000 GB-seconds/bulan
- Setelah FREE tier: ~$0.00002400 per request

Dengan min-instances=0, tidak ada biaya saat tidak ada traffic.

## 🐛 Troubleshooting

### Error: Permission Denied

```bash
# Berikan permission ke service account
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Error: Firebase not initialized

- Pastikan `FIREBASE_SERVICE_ACCOUNT_JSON` sudah di-set dengan benar
- Check logs: `gcloud run services logs read moriesly-be`

### Error: Port binding

- Cloud Run menggunakan PORT environment variable (default: 8080)
- Pastikan `server.js` menggunakan `process.env.PORT`

## 📝 Checklist Deployment

- [ ] Firebase Service Account sudah di-download
- [ ] Environment variables sudah di-set
- [ ] Docker terinstall
- [ ] GCloud SDK terinstall dan sudah login
- [ ] Project ID sudah benar
- [ ] Region sudah dipilih (asia-southeast2 untuk Jakarta)
- [ ] CORS origin sudah di-set untuk frontend domain
- [ ] Test deployment di Cloud Run URL
- [ ] (Opsional) Custom domain sudah di-map

## 🔗 Resources

- Cloud Run Docs: https://cloud.google.com/run/docs
- Secret Manager: https://cloud.google.com/secret-manager
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
