# NFC Tag Setup Guide

This guide explains how to configure NFC tags for your 3D printed VHS tapes to trigger movie playback in Jellyfin.

## Understanding the System

When an NFC tag is scanned, it needs to send a request to your server with the unique token. There are two main approaches:

### Option 1: Direct API Call (Recommended for Mobile Apps)
The NFC tag triggers a mobile app that makes a direct API call to your server.

### Option 2: Web Redirect (Simpler, Works with Most Phones)
The NFC tag contains a URL that redirects to a web page, which then makes the API call.

## What URL to Write to the NFC Tag

Once your server is deployed at `https://your-domain.com`, you have two options:

### Option A: Simple Scan Page (Recommended)

Write this URL to your NFC tag:
```
https://your-domain.com/scan?token=YOUR-TOKEN-HERE
```

For example:
```
https://your-domain.com/scan?token=YOUR-TOKEN
```

Then create a simple scan page to handle this. I'll create this for you below.

### Option B: Direct API Call (For Custom Apps)

If you're building a custom mobile app, make a POST request to:
```
POST https://your-domain.com/api/scan
Content-Type: application/json

{
  "token": "YOUR-TOKEN"
}
```

## Creating the Scan Page

Let me create a user-friendly scan page that users will see when they scan the NFC tag.

The scan page will:
1. Read the token from the URL parameter
2. Make an API call to validate the token
3. Display the movie information
4. Automatically trigger playback (if auto-playback is enabled)
5. Show a nice loading animation and success/error messages

## NFC Tag Writing Process

### Using Android (NFC Tools App)

1. **Download NFC Tools** from Google Play Store
   - Link: https://play.google.com/store/apps/details?id=com.wakdev.wdnfc

2. **Open NFC Tools** and go to the "Write" tab

3. **Add a Record** → **URL/URI**
   - Enter: `https://your-domain.com/scan?token=YOUR-TOKEN-HERE`
   - Replace `YOUR-TOKEN-HERE` with your unique token

4. **Place your NFC tag** on the back of your phone

5. **Tap "Write"** to program the tag

6. **Test the tag** by scanning it - it should open the URL in your browser

### Using iPhone (Shortcuts App)

1. **Open the Shortcuts app** (pre-installed on iOS 13+)

2. **Create a New Automation** → **NFC**

3. **Scan your NFC tag** to associate it with the automation

4. **Add Action** → **Open URL**
   - URL: `https://your-domain.com/scan?token=YOUR-TOKEN-HERE`

5. **Save and test**

### Alternative: NFC TagWriter by NXP

Available for both Android and iOS:
- Android: https://play.google.com/store/apps/details?id=com.nxp.nfc.tagwriter
- iOS: https://apps.apple.com/app/nfc-tagwriter-by-nxp/id1246143221

## Token Naming Conventions

Use clear, memorable tokens for your VHS tapes:

### Examples:
- `MOVIE1-VHS-001`
- `MOVIE2-VHS-001`
- `MOVIE3-VHS-001`

### Best Practices:
1. **Keep it short** - easier to type and manage
2. **Use hyphens** - improves readability
3. **Include movie identifier** - helps you remember which tape is which
4. **Add VHS suffix** - distinguishes from other NFC tags you might have
5. **Number sequentially** - in case you make multiple copies

## Creating VHS Tapes in the System

Once your NFC tag is programmed, you need to register it in the system:

### Using the Web Admin Panel:

1. Visit `https://your-domain.com`

2. Click **"+ Add New VHS Tape"**

3. **Enter the NFC Token** (must match what's on the physical tag)
   - Example: `YOUR-TOKEN`

4. **Search for the movie** in Jellyfin
   - Type the movie name in the search box
   - Click on the correct movie from the results

5. **Save** the VHS tape

6. **Test** by clicking the "Test Scan" button or scanning the physical NFC tag

### Using the API:

```bash
curl -X POST https://your-domain.com/api/tapes \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'admin:yourpassword' | base64)" \
  -d '{
    "token": "YOUR-TOKEN",
    "movie_id": "jellyfin-movie-id",
    "movie_title": "Your Movie Title",
    "movie_year": 2024
  }'
```

## How Automatic Playback Works

When auto-playback is enabled (`AUTO_PLAYBACK_ENABLED=true` in `.env`):

1. User scans the NFC tag with their phone
2. Phone opens the URL and loads the scan page
3. Scan page sends the token to the server
4. Server validates the token and looks up the movie
5. Server finds the first active Jellyfin session for the default user
6. Server sends a "play" command to that session
7. Movie starts playing automatically on the Jellyfin client!

### Requirements for Auto-Playback:
- User must have an active Jellyfin session (e.g., watching on TV, browser, or mobile app)
- The Jellyfin client must support remote control
- The session must not already be playing something

## Testing Your Setup

### 1. Test Without NFC First
Visit the scan URL in your browser:
```
https://your-domain.com/scan?token=YOUR-TOKEN
```

You should see:
- Movie title and information
- A success message if playback started
- Any error messages if something went wrong

### 2. Test with NFC Tag
1. Program a test NFC tag with the URL
2. Have a Jellyfin client open and signed in
3. Scan the NFC tag with your phone
4. The movie should start playing on your Jellyfin client

## Troubleshooting

### Tag doesn't scan
- Make sure your phone has NFC enabled (Settings → Connections → NFC)
- Try different positions - NFC antenna location varies by phone
- Ensure the NFC tag is working (test with NFC reading apps)

### URL opens but nothing happens
- Check server logs: `pm2 logs jellyfin-nfc-vhs`
- Verify the token is registered in the database
- Check that auto-playback is enabled in `.env`
- Ensure you have an active Jellyfin session

### Playback doesn't start
- Make sure a Jellyfin client is open and signed in
- Check that the client supports remote control
- Verify the correct user is configured in `.env`
- Try manually starting playback from the admin panel's "Test Scan" button

### Wrong movie plays
- Verify the token in the database matches the NFC tag
- Check the movie ID is correct in the database
- Edit the VHS tape in the admin panel if needed

## Advanced: Custom Scan Page

If you want to customize the scan experience, edit `public/scan.html` (we'll create this next).

You can:
- Change the design and branding
- Add custom animations
- Show additional movie information
- Implement user selection (if you have multiple Jellyfin users)
- Add QR code generation for non-NFC devices
