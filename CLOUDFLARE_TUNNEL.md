# Cloudflare Tunnel Setup Guide

This guide explains how to securely expose the Sophos Audit Manager using Cloudflare Tunnel (Argo Tunnel).

## Why Cloudflare Tunnel?

- ✅ No need to open ports to the internet
- ✅ Automatic SSL/TLS termination at Cloudflare edge
- ✅ Built-in DDoS protection and WAF
- ✅ Private network connectivity
- ✅ No Let's Encrypt certificate management

## Prerequisites

1. Cloudflare account
2. Domain managed in Cloudflare
3. Docker and Docker Compose installed

## Setup Steps

### 1. Install Cloudflare Tunnel

```bash
# On Linux/macOS
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser for authentication.

### 3. Create a Tunnel

```bash
# Create tunnel
cloudflared tunnel create sophos-audit-manager

# Route traffic to your tunnel
cloudflared tunnel route dns sophos-audit-manager audit.yourdomain.com
```

### 4. Create Tunnel Configuration

Create `config.yml`:

```yaml
tunnel: sophos-audit-manager
credentials-file: /path/to/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: audit.yourdomain.com
    service: http://localhost:9005
  - service: http_status:404
```

### 5. Update Docker Compose for Cloudflare

The application should run on localhost:9005 as configured:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "9005:80"  # Local access only
    # ... rest of config
```

### 6. Start the Tunnel

```bash
# Run tunnel (or set up as systemd service)
cloudflared tunnel run sophos-audit-manager

# Or start with config file
cloudflared tunnel --config config.yml run sophos-audit-manager
```

## Security Configuration

### Environment Variables

Set these in `.env` before starting:

```bash
SESSION_SECRET=your-long-random-secret-here-min-32-chars
ENCRYPTION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=strong-database-password-here
```

### Generate Secure Secrets

```bash
# Generate session secret (32+ bytes)
openssl rand -hex 32

# Generate encryption key
openssl rand -hex 32

# Generate database password
openssl rand -base64 24
```

## Reverse Proxy Configuration (Alternative)

If you prefer Nginx reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name audit.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/audit.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/audit.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:9005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Testing Your Setup

1. Access via: `https://audit.yourdomain.com`
2. Health check: `https://audit.yourdomain.com/health`
3. Login with: `admin` / `admin` (change immediately!)

## Production Checklist

- [ ] Change all default passwords
- [ ] Generate unique SESSION_SECRET and ENCRYPTION_KEY
- [ ] Set up proper SSL/TLS (Cloudflare Tunnel handles this)
- [ ] Enable Cloudflare WAF rules
- [ ] Configure rate limiting in Cloudflare
- [ ] Set up monitoring/alerts
- [ ] Regular database backups
- [ ] Container security scanning