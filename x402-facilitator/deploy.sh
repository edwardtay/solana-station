#!/bin/bash

# x402 Facilitator Deployment Script
# Deploy to Google Cloud Run + Cloudflare

set -e

PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="x402-facilitator"

echo "🚀 Deploying x402 Facilitator to Cloud Run"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Build TypeScript first
echo "📦 Building TypeScript..."
npm run build

# Build and push to Google Container Registry
echo "🐳 Building Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3005 \
  --set-env-vars "PAYMENT_RECIPIENT=BaM3m2Yk35BeMtKybTJ8DKcRvK3BL5dD7Pp1FMyoVDDE" \
  --set-env-vars "NETWORK=solana-devnet" \
  --set-env-vars "SOLANA_RPC_URL=https://api.devnet.solana.com" \
  --set-env-vars "BACKEND_URL=http://localhost:3004" \
  --set-env-vars "CORS_ORIGIN=*"

# Get the Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo ""
echo "✅ Deployed to Cloud Run!"
echo "   URL: $CLOUD_RUN_URL"
echo ""
echo "📋 Next: Configure Cloudflare"
echo ""
echo "1. In Cloudflare DNS, add CNAME record:"
echo "   Name: x402-api"
echo "   Target: ${CLOUD_RUN_URL#https://}"
echo "   Proxy: ON (orange cloud)"
echo ""
echo "2. SSL/TLS settings:"
echo "   Mode: Full (strict)"
echo ""
echo "3. Test the deployment:"
echo "   curl https://x402-api.lever-labs.com/health"
echo ""
echo "4. Update frontend .env:"
echo "   VITE_FACILITATOR_URL=https://x402-api.lever-labs.com"
