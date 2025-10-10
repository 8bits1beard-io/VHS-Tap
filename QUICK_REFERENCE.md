# Quick Reference - VHS NFC System

## Your Domain
- **Main Domain**: `your-domain.com`
- **VHS Subdomain**: `vhs.your-domain.com`
- **Jellyfin URL**: `https://jellyfin.your-domain.com`

## NFC Tag URL Format

Write this to your NFC tags:
```
https://vhs.your-domain.com/scan?token=YOUR-TOKEN-HERE
```

## Example NFC Tag URL

```
https://vhs.your-domain.com/scan?token=YOUR-TOKEN
```

## Admin Panel
```
https://vhs.your-domain.com
```

## API Endpoints

### Scan Endpoint
```
POST https://vhs.your-domain.com/api/scan
```

### List All Tapes
```
GET https://vhs.your-domain.com/api/tapes
```

### Create Tape (Requires Auth)
```
POST https://vhs.your-domain.com/api/tapes
```

### Update Tape (Requires Auth)
```
PUT https://vhs.your-domain.com/api/tapes/:id
```

### Delete Tape (Requires Auth)
```
DELETE https://vhs.your-domain.com/api/tapes/:id
```

### Search Movies (Requires Auth)
```
GET https://vhs.your-domain.com/api/tapes/search/movies?q=searchterm
```

## Admin Authentication
- Username: `admin`
- Password: (set in `.env` - **CHANGE BEFORE DEPLOYING!**)

Format for API calls:
```
Authorization: Basic YWRtaW46Y2hhbmdlbWU=
```
(This is base64 encoded "admin:changeme" - update with your actual password)

## Nginx Configuration

Your nginx server block should use:
```nginx
server_name vhs.your-domain.com;
ssl_certificate /etc/letsencrypt/live/vhs.your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/vhs.your-domain.com/privkey.pem;
```

## DNS Configuration

Before deploying, add this DNS record to `your-domain.com`:
```
Type: A or CNAME
Name: vhs
Value: [Your Ubuntu server IP or hostname]
TTL: 3600
```

## SSL Certificate

Generate with Let's Encrypt:
```bash
sudo certbot --nginx -d vhs.your-domain.com
```

## Testing URLs (Local Development)

- Admin Panel: `http://localhost:3000`
- Scan Page: `http://localhost:3000/scan?token=YOUR-TOKEN`
- Health Check: `http://localhost:3000/health`

## Deployment Checklist

- [ ] Set up DNS record: `vhs.your-domain.com` → Server IP
- [ ] Transfer files to Ubuntu server
- [ ] Run `npm install`
- [ ] Configure `.env` with production settings
- [ ] Change `ADMIN_PASSWORD` in `.env`
- [ ] Run `npm run init-db`
- [ ] Configure nginx with `vhs.your-domain.com`
- [ ] Generate SSL certificate
- [ ] Start with PM2: `pm2 start src/server.js --name vhs-tap`
- [ ] Test: `https://vhs.your-domain.com/health`
- [ ] Create VHS tapes in admin panel
- [ ] Program NFC tags
- [ ] Test scanning with phone!
