#!/bin/bash

# Script untuk deploy ke Cloud Run
# Pastikan sudah login: gcloud auth login
# Set project: gcloud config set project PROJECT_ID

# Variabel konfigurasi
PROJECT_ID="project-cdfb53f0-89f3-4240-b91"  # Ganti dengan project ID Anda
SERVICE_NAME="moriesly-be"
REGION="asia-southeast2"  # Jakarta
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying ${SERVICE_NAME} to Cloud Run..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME} .

# Push ke Container Registry
echo "⬆️  Pushing to Container Registry..."
docker push ${IMAGE_NAME}

# Deploy ke Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0

echo "✅ Deployment complete!"
echo "🔗 Service URL akan ditampilkan di atas"
