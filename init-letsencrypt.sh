#!/bin/bash

# ============================================================
# Let's Encrypt SSL Certificate Initialization Script
# ============================================================
# This script handles the chicken-and-egg problem:
#   - Nginx needs certs to start with SSL
#   - Certbot needs Nginx running to verify the domain
#
# Solution: create a temporary self-signed cert, start Nginx,
# then request a real cert from Let's Encrypt.
#
# Usage:
#   chmod +x init-letsencrypt.sh
#   ./init-letsencrypt.sh
# ============================================================

set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
DOMAIN="${DOMAIN:-opensuite.io}"
EMAIL="${CERTBOT_EMAIL:-}"
STAGING="${STAGING:-0}"
DATA_PATH="./certbot"
RSA_KEY_SIZE=4096

# Recommended TLS parameters URL
TLS_PARAMS_URL="https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf"
DH_PARAMS_URL="https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem"

echo "============================================================"
echo "  OpenSuite Let's Encrypt SSL Certificate Setup"
echo "============================================================"
echo ""
echo "  Domain:  ${DOMAIN}"
echo "  Email:   ${EMAIL:-'(not set - register without email)'}"
echo "  Staging: ${STAGING} (1=staging/test, 0=production)"
echo ""

# Validate domain
if [ -z "$DOMAIN" ]; then
    echo "ERROR: DOMAIN is not set. Please set it in .env"
    exit 1
fi

# Step 1: Download recommended TLS parameters
echo ">>> Step 1: Downloading recommended TLS parameters..."
mkdir -p "$DATA_PATH/conf"
if [ ! -f "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -f "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
    curl -s "$TLS_PARAMS_URL" > "$DATA_PATH/conf/options-ssl-nginx.conf"
    curl -s "$DH_PARAMS_URL" > "$DATA_PATH/conf/ssl-dhparams.pem"
    echo "    TLS parameters downloaded."
else
    echo "    TLS parameters already exist, skipping."
fi

# Step 2: Create temporary self-signed certificate
echo ">>> Step 2: Creating temporary self-signed certificate..."
CERT_PATH="$DATA_PATH/conf/live/$DOMAIN"
mkdir -p "$CERT_PATH"

if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    openssl req -x509 -nodes -newkey rsa:${RSA_KEY_SIZE} -days 1 \
        -keyout "$CERT_PATH/privkey.pem" \
        -out "$CERT_PATH/fullchain.pem" \
        -subj "/CN=localhost" \
        2>/dev/null
    echo "    Temporary self-signed certificate created."
else
    echo "    Certificate already exists, skipping self-signed creation."
fi

# Step 3: Start Nginx with the temporary certificate
echo ">>> Step 3: Starting Nginx..."
docker compose up -d nginx
echo "    Waiting for Nginx to start..."
sleep 5

# Step 4: Delete the temporary certificate
echo ">>> Step 4: Removing temporary self-signed certificate..."
rm -rf "$CERT_PATH"
echo "    Temporary certificate removed."

# Step 5: Request real certificate from Let's Encrypt
echo ">>> Step 5: Requesting certificate from Let's Encrypt..."

# Build certbot command
CERTBOT_CMD="certbot certonly --webroot -w /var/www/certbot"
CERTBOT_CMD="$CERTBOT_CMD -d $DOMAIN -d www.$DOMAIN"
CERTBOT_CMD="$CERTBOT_CMD --rsa-key-size $RSA_KEY_SIZE"
CERTBOT_CMD="$CERTBOT_CMD --agree-tos"
CERTBOT_CMD="$CERTBOT_CMD --non-interactive"
CERTBOT_CMD="$CERTBOT_CMD --force-renewal"

if [ -n "$EMAIL" ]; then
    CERTBOT_CMD="$CERTBOT_CMD --email $EMAIL"
else
    CERTBOT_CMD="$CERTBOT_CMD --register-unsafely-without-email"
fi

if [ "$STAGING" = "1" ]; then
    CERTBOT_CMD="$CERTBOT_CMD --staging"
    echo "    Using Let's Encrypt STAGING server (test certificates)."
else
    echo "    Using Let's Encrypt PRODUCTION server (real certificates)."
fi

docker compose run --rm certbot $CERTBOT_CMD

# Step 6: Reload Nginx with the real certificate
echo ">>> Step 6: Reloading Nginx with real certificate..."
docker compose exec nginx nginx -s reload

echo ""
echo "============================================================"
echo "  SSL Certificate setup complete!"
echo ""
if [ "$STAGING" = "1" ]; then
    echo "  NOTE: You used a STAGING certificate (for testing)."
    echo "  To get a real certificate:"
    echo "    1. Set STAGING=0 in .env"
    echo "    2. Run this script again"
fi
echo ""
echo "  Test your site: https://${DOMAIN}"
echo "  SSL Labs:       https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}"
echo "============================================================"
