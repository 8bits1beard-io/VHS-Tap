# VHS Tap

Tap NFC-enabled VHS tapes to instantly play movies on Jellyfin. A Node.js + Express server that bridges your physical 3D printed VHS collection with your Jellyfin media server.

**Author:** [8bits1beard](https://github.com/8bits1beard-io)
**Repository:** https://github.com/8bits1beard-io/vhs-tap

## Overview

This project lets you create a retro VHS collection experience with modern technology. Each 3D printed VHS tape has an NFC tag embedded in it. When you tap the tape with your phone, it displays movie information and provides a direct link to start playback in Jellyfin.

### Features

- 📼 NFC token validation and scanning
- 🎬 Jellyfin server integration
- 🎨 Retro-styled admin panel and scan interface
- 🗃️ SQLite database for VHS tape/movie mappings
- 🎭 Rich movie metadata from OMDB (posters, ratings, cast, plot)
- 📱 Mobile-friendly scan page
- 🔒 Environment-based configuration (no hardcoded credentials)

## Quick Start

### Prerequisites

- Node.js v16 or higher
- A running Jellyfin server
- (Optional) OMDB API key for rich movie metadata

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/8bits1beard-io/vhs-tap.git
   cd vhs-tap
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Jellyfin URL, API key, and OMDB key
   ```

4. **Initialize the database:**
   ```bash
   npm run init-db
   ```

5. **Add your logo (optional):**
   ```bash
   cp /path/to/your/logo.jpg public/logo.jpg
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Access the application:**
   - Admin Panel: http://localhost:3000
   - Health Check: http://localhost:3000/health

## Documentation

📚 **Detailed guides are available for setup and deployment:**

- **[Getting Started Guide](GETTING_STARTED.md)** - Comprehensive setup instructions
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to production with nginx and PM2
- **[NFC Tag Setup](NFC_TAG_SETUP.md)** - How to program NFC tags for your VHS tapes
- **[Movie Metadata Setup](MOVIE_METADATA_SETUP.md)** - Populate your database and fetch metadata
- **[Quick Reference](QUICK_REFERENCE.md)** - Common commands and troubleshooting

## Customization

### Add Your Own Logo

The application displays a logo at the top of both the admin panel and scan page. Add your own:

```bash
cp /path/to/your/logo.jpg public/logo.jpg
```

Recommended size: 450px wide, transparent or white background works best with the retro purple theme.

### Customize the Branding

Edit `public/css/style.css` to change colors, or modify `public/index.html` and `public/scan.html` to adjust the layout and branding text.

## Development

Run with auto-reload:
```bash
npm run dev
```

## Project Structure

```
vhs-tap/
├── public/              # Frontend assets
│   ├── index.html       # Admin panel
│   ├── scan.html        # NFC scan result page
│   ├── css/             # Stylesheets
│   └── js/              # Client-side JavaScript
├── src/
│   ├── server.js        # Express server entry point
│   ├── config/          # Configuration management
│   ├── database/        # Database setup and migrations
│   │   ├── schema.sql   # Database schema
│   │   └── migrations/  # Database migrations
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic (Jellyfin integration)
│   └── middleware/      # Express middleware
├── .env.example         # Environment template
└── package.json         # Dependencies and scripts
```

## API Endpoints

- `GET /api/config` - Get public configuration (Jellyfin URL)
- `POST /api/scan` - Validate NFC token and trigger movie playback
- `GET /api/tapes` - List all VHS tapes
- `GET /api/tapes/:id` - Get specific VHS tape
- `POST /api/tapes` - Create new VHS tape mapping
- `PUT /api/tapes/:id` - Update VHS tape mapping
- `DELETE /api/tapes/:id` - Delete VHS tape mapping

## How It Works

1. **Setup**: You program NFC tags with URLs like `https://your-domain.com/scan.html?token=VHS-001`
2. **Database**: The server maps each token (VHS-001, VHS-002, etc.) to a Jellyfin movie ID
3. **Scanning**: When someone taps the NFC tag with their phone:
   - The phone opens the scan URL in the browser
   - The page fetches movie info from your server
   - Server enriches it with OMDB metadata (poster, rating, cast, etc.)
   - User sees movie details and a "Watch Now" button
   - Clicking the button opens the movie in Jellyfin

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built for retro VHS enthusiasts and Jellyfin users
- Inspired by the nostalgia of video rental stores
- Special thanks to [ScarfMeadow](https://makerworld.com/en/@ScarfMeadow) for graciously creating an [NFC-capable version of their VHS cassette case model](https://makerworld.com/en/models/1520581-vhs-cassette-case-keyring#profileId-1593434) specifically for this project!
