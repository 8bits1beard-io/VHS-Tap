# Deployment Guide for Ubuntu Server

This guide will walk you through deploying the Jellyfin NFC VHS server to your Ubuntu server with nginx reverse proxy.

## Prerequisites

- Ubuntu server with nginx installed and running
- Node.js installed (v16 or higher)
- PM2 for process management
- Domain pointing to your server (or subdomain)

## Step 1: Install Node.js and PM2

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

## Step 2: Transfer Files to Server

From your Windows machine, transfer the project files to your Ubuntu server:

```bash
# Option 1: Using SCP
scp -r C:\dev\VHS_NFC user@your-server-ip:/home/user/vhs-tap

# Option 2: Using Git (recommended)
# First, create a git repository and push to GitHub/GitLab
# Then on the server:
cd /home/user
git clone https://github.com/your-username/vhs-tap.git
cd vhs-tap
```

## Step 3: Install Dependencies

```bash
cd /home/user/vhs-tap
npm install --production
```

## Step 4: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file
nano .env
```

Update the following values:
```env
PORT=3000
NODE_ENV=production

JELLYFIN_URL=https://your-jellyfin-server.com
JELLYFIN_API_KEY=your_jellyfin_api_key_here

DB_PATH=./vhs_nfc.db

ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_THIS_TO_A_SECURE_PASSWORD

AUTO_PLAYBACK_ENABLED=true
DEFAULT_USER_ID=
AUTO_SELECT_SESSION=true
```

## Step 5: Initialize the Database

```bash
npm run init-db
```

## Step 6: Set Up PM2

```bash
# Start the application with PM2
pm2 start src/server.js --name vhs-tap

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions PM2 provides

# Check status
pm2 status
pm2 logs vhs-tap
```

## Step 7: Configure Nginx Reverse Proxy

Create a new nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/vhs-nfc
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS (will be set up in next step)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration (update paths to your SSL certificates)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: Increase timeouts for long-running requests
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

Enable the site and restart nginx:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/vhs-nfc /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 8: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically update your nginx configuration
```

## Step 9: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

## Step 10: Test the Deployment

Visit your domain in a browser:
- Admin Panel: `https://your-domain.com`
- API Health Check: `https://your-domain.com/health`
- Test Scan: `https://your-domain.com/api/scan` (POST request)

## Maintenance Commands

```bash
# View logs
pm2 logs vhs-tap

# Restart the application
pm2 restart vhs-tap

# Stop the application
pm2 stop vhs-tap

# Monitor resources
pm2 monit

# Update the application
cd /home/user/vhs-tap
git pull
npm install --production
pm2 restart vhs-tap
```

## Backup the Database

```bash
# Create a backup script
nano ~/backup-vhs-db.sh
```

Add the following:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /home/user/vhs-tap/vhs_nfc.db /home/user/backups/vhs_nfc_$DATE.db
find /home/user/backups -name "vhs_nfc_*.db" -mtime +30 -delete
```

Make it executable and add to cron:
```bash
chmod +x ~/backup-vhs-db.sh
mkdir -p ~/backups

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
0 2 * * * /home/user/backup-vhs-db.sh
```

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs vhs-tap --lines 50

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart the application
pm2 restart vhs-tap
```

### Nginx returns 502 Bad Gateway
```bash
# Check if Node.js app is running
pm2 status

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify the proxy_pass URL in nginx config
sudo nginx -t
```

### Database issues
```bash
# Re-initialize the database
cd /home/user/vhs-tap
npm run init-db

# Check file permissions
ls -la vhs_nfc.db
chmod 644 vhs_nfc.db
```
