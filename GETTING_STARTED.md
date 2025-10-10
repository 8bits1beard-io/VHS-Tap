# Getting Started with VHS Tap

Welcome! This guide will help you set up and configure VHS Tap from scratch.

## 🎉 What's Been Built

### 1. **Web Admin Panel** (`http://localhost:3000`)
A beautiful, responsive admin interface to manage your VHS tape collection:
- View all VHS tapes in a grid layout
- Add new tapes with Jellyfin movie search
- Edit and delete existing tapes
- Test NFC scans directly from the interface
- View statistics (total tapes, total scans)

### 2. **User Scan Page** (`http://localhost:3000/scan?token=XXX`)
A mobile-friendly page that users land on when scanning NFC tags:
- Automatically validates the token
- Displays movie information
- Triggers automatic playback if enabled
- Shows playback status and device information
- Beautiful VHS-themed design with animations

### 3. **REST API**
Full-featured API for managing tapes and triggering playback:
- `POST /api/scan` - Validate token and trigger playback
- `GET /api/tapes` - List all VHS tapes
- `POST /api/tapes` - Create new VHS tape (admin auth required)
- `PUT /api/tapes/:id` - Update VHS tape (admin auth required)
- `DELETE /api/tapes/:id` - Delete VHS tape (admin auth required)
- `GET /api/tapes/search/movies` - Search Jellyfin library (admin auth required)

### 4. **Automatic Playback System**
When enabled, the system automatically:
1. Detects when an NFC tag is scanned
2. Validates the token and looks up the movie
3. Finds active Jellyfin sessions for your user
4. Sends playback command to the first available device
5. Starts playing the movie!

## 🚀 Quick Start

### Current Setup (Local Testing)

The server is currently running on your Windows machine at `http://localhost:3000`.

**Try it out:**
1. Open your browser to http://localhost:3000
2. You'll see the admin panel with your VHS tapes
3. Click "Test Scan" to simulate scanning the NFC tag
4. Click "+ Add New VHS Tape" to create more tapes

### Local Testing URLs

- **Admin Panel**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Test Scan**: http://localhost:3000/scan?token=YOUR-TOKEN

## 📋 Next Steps

### 1. Deploy to Your Ubuntu Server

Follow the detailed guide in `DEPLOYMENT.md`:
- Transfer files to your Ubuntu server
- Install dependencies with npm
- Configure environment variables
- Set up PM2 for process management
- Configure nginx reverse proxy
- Set up SSL with Let's Encrypt

**Recommended subdomain:** `your-domain.com`

### 2. Program Your NFC Tags

Follow the guide in `NFC_TAG_SETUP.md`:

**URL Format:**
```
https://your-domain.com/scan?token=YOUR-TOKEN-HERE
```

**Example:**
```
https://your-domain.com/scan?token=YOUR-TOKEN
```

**Recommended Apps:**
- **Android**: NFC Tools (free, easy to use)
- **iPhone**: Shortcuts app (built-in) or NFC TagWriter by NXP

### 3. Create Your VHS Tapes

#### Option A: Using the Web Admin Panel (Easiest)
1. Visit your admin panel
2. Click "+ Add New VHS Tape"
3. Enter the token (e.g., `MOVIE-VHS-001`)
4. Search for the movie in your Jellyfin library
5. Click the movie to select it
6. Save

#### Option B: Using the API
```bash
curl -X POST https://your-domain.com/api/tapes \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'admin:yourpassword' | base64)" \
  -d '{
    "token": "MOVIE-VHS-001",
    "movie_id": "jellyfin-movie-id",
    "movie_title": "Your Movie Title",
    "movie_year": 2024
  }'
```

## ⚙️ Configuration

### Getting Your Jellyfin API Key

Before configuring the application, you'll need to generate an API key from your Jellyfin server:

1. **Log in to your Jellyfin server** (web interface)
2. **Go to Dashboard** → **Advanced** → **API Keys**
3. **Click the "+" button** to create a new API key
4. **Give it a name** (e.g., "VHS NFC System")
5. **Copy the generated API key** - you'll need this for the `.env` file

### Environment Variables (`.env`)

```env
# Server
PORT=3000
NODE_ENV=production  # Change to 'production' when deploying

# Jellyfin
JELLYFIN_URL=https://your-jellyfin-server.com
JELLYFIN_API_KEY=your_jellyfin_api_key_here

# Admin Credentials (CHANGE THESE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme  # ⚠️ CHANGE THIS BEFORE DEPLOYING!

# Automatic Playback
AUTO_PLAYBACK_ENABLED=true
DEFAULT_USER_ID=  # Leave empty to use first user
AUTO_SELECT_SESSION=true
```

**⚠️ IMPORTANT:** Change `ADMIN_PASSWORD` before deploying to your server!

## 🎬 How It Works

### The Complete Flow:

1. **User scans NFC tag** on 3D printed VHS tape with their phone
2. **Phone opens URL**: `https://your-domain.com/scan?token=YOUR-TOKEN`
3. **Scan page loads** and makes API call with the token
4. **Server validates token** and looks up movie in database
5. **Server fetches movie details** from Jellyfin API
6. **If auto-playback is enabled:**
   - Server finds active Jellyfin sessions
   - Server sends "play" command to first available session
   - Movie starts playing automatically!
7. **User sees confirmation** on scan page with movie details

### Requirements for Auto-Playback:
- User must have Jellyfin client open (TV app, browser, mobile)
- Client must be signed in and support remote control
- Client must not be currently playing something

## 📱 Testing Without NFC Tags

You can test the entire system without NFC tags:

### Method 1: Direct URL
Just visit the scan URL in your browser:
```
http://localhost:3000/scan?token=YOUR-TOKEN
```

### Method 2: Admin Panel
Click the "Test Scan" button on any VHS tape in the admin panel.

### Method 3: API Testing with curl
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR-TOKEN"}'
```

## 🎨 Customization

### Change Admin Panel Styling
Edit `public/css/style.css` to customize colors, fonts, and layout.

### Customize Scan Page
Edit `public/scan.html` to:
- Change colors and branding
- Add your own logo
- Modify the animation
- Add additional features

### Modify Auto-Playback Logic
Edit `src/routes/scan.js` to customize:
- Which user to use for playback
- Session selection logic
- Error handling
- Response messages

## 📚 Additional Documentation

- **DEPLOYMENT.md** - Complete deployment guide for Ubuntu server
- **NFC_TAG_SETUP.md** - How to program NFC tags and configure tokens
- **README.md** - Project overview and API documentation

## 🔧 Maintenance

### View Logs (when deployed with PM2)
```bash
pm2 logs vhs-tap
```

### Restart Server
```bash
pm2 restart vhs-tap
```

### Update Code
```bash
cd /path/to/vhs-tap
git pull
npm install
pm2 restart vhs-tap
```

### Backup Database
```bash
cp vhs_nfc.db vhs_nfc_backup_$(date +%Y%m%d).db
```

## 💡 Tips & Best Practices

### Token Naming
- Use descriptive prefixes for your tapes
- Keep them short but memorable
- Number sequentially if you make duplicates

### NFC Tag Placement
- Place tags on the spine or back of VHS tapes
- Avoid placing near metal (can interfere with NFC)
- Test scan position before permanently attaching

### Security
- **Change the admin password** before deploying!
- Use HTTPS (SSL) in production
- Consider IP whitelisting for admin endpoints
- Keep your Jellyfin API key secure

### Performance
- Database is SQLite (perfect for this use case)
- Can handle thousands of tapes easily
- Add an index if you have 10,000+ tapes

## 🎯 What URL Goes on the NFC Tag?

**Answer:** Once deployed, write this URL to your NFC tags:

```
https://your-domain.com/scan?token=YOUR-UNIQUE-TOKEN
```

**Replace:**
- `YOUR-UNIQUE-TOKEN` with the token for that specific tape

**Example:**
```
https://your-domain.com/scan?token=YOUR-UNIQUE-TOKEN
```

When someone scans this tag, their phone will:
1. Open this URL in their browser
2. The scan page will load
3. The page will automatically call the API with the token
4. If auto-playback is enabled and a session is active, the movie starts playing!

## 🆘 Getting Help

If something isn't working:

1. **Check the server logs** - they show what's happening
2. **Test the API directly** - use curl to isolate the issue
3. **Verify Jellyfin connection** - make sure the API key is correct
4. **Check auto-playback settings** - ensure you have an active session

## 🎊 You're Ready!

Your Jellyfin NFC VHS system is complete and ready to deploy. Once on your Ubuntu server, you'll be able to:

- Scan VHS tapes with your phone
- Automatically start movies on your TV/devices
- Manage your collection through the web interface
- Impress your friends with this awesome retro-futuristic setup!

Enjoy your physical media collection brought into the streaming age! 🎬📼
