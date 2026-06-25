#!/bin/bash
# Max TA Group ERP - Deployment Script
# Deploys backend with PM2 and frontend with nginx on the cloud computer

set -e

echo "=== Max TA Group ERP Deployment ==="

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y nginx
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Backend setup
echo "Setting up backend..."
cd ~/maxta-erp/backend
npm install --production

# Initialize database
echo "Initializing database..."
npm run init-db

# Start/restart backend with PM2
echo "Starting backend with PM2..."
pm2 delete maxta-erp-backend 2>/dev/null || true
pm2 start src/server.js --name maxta-erp-backend
pm2 save

# Frontend setup
echo "Building frontend..."
cd ~/maxta-erp/frontend
npm install
npx vite build

# Configure nginx
echo "Configuring nginx..."
sudo cp ~/maxta-erp/docker/nginx-standalone.conf /etc/nginx/sites-available/maxta-erp
sudo ln -sf /etc/nginx/sites-available/maxta-erp /etc/nginx/sites-enabled/maxta-erp
sudo nginx -t && sudo systemctl reload nginx

# Open firewall port
echo "Opening port 8080..."
sudo ufw allow 8080/tcp

echo ""
echo "=== Deployment Complete ==="
echo "ERP available at: http://$(curl -s ifconfig.me):8080"
echo "Backend API at:   http://$(curl -s ifconfig.me):5000"
echo "Login: admin / admin123"
