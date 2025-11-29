#!/bin/bash

# ====== CONFIG ======
DOMAIN=$1
PORT=$2

if [ -z "$DOMAIN" ] || [ -z "$PORT" ]; then
  echo "Usage: bash setup_reverse_proxy.sh <domain> <port>"
  exit 1
fi

echo "🚀 Setting up Nginx reverse proxy for $DOMAIN on port $PORT"

# ====== UPDATE & INSTALL NGINX ======
sudo apt update -y
sudo apt install -y nginx

# ====== CREATE NGINX CONFIG FILE ======
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# ====== ENABLE SITE ======
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# ====== INSTALL CERTBOT ======
sudo apt install -y certbot python3-certbot-nginx

# ====== APPLY SSL ======
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN --redirect

echo "✅ Nginx reverse proxy + SSL setup completed for https://$DOMAIN"


