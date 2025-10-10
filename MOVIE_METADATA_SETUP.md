# Movie Metadata Setup Guide

This guide explains how to fetch and display rich movie information (posters, ratings, cast, etc.) from IMDB via the OMDB API.

## What's Been Added

Your VHS NFC system now supports displaying:

- 🎬 **Movie Posters** - High-quality poster images
- ⭐ **IMDB Ratings** - User ratings from IMDB
- 🎭 **Genre** - Movie categories (Action, Sci-Fi, etc.)
- ⏱️ **Runtime** - Movie duration
- 🎥 **Director** - Who directed the film
- 👥 **Actors** - Main cast members
- 📋 **Plot** - Full plot description
- 🔞 **Rating** - Content rating (PG, PG-13, R, etc.)

## Setup Instructions

### Step 1: Get Your Free OMDB API Key

1. Visit: http://www.omdbapi.com/apikey.aspx
2. Select the **FREE** tier (1,000 daily requests)
3. Enter your email address
4. Check your email for the activation link
5. Click the activation link to verify your API key

### Step 2: Add API Key to Your .env File

Open your `.env` file and add:

```bash
OMDB_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with the key you received via email.

### Step 3: Fetch Movie Metadata

Run the metadata fetch script:

```bash
node fetch_movie_metadata.js
```

This will:
- Search OMDB for each movie in your database
- Download posters, ratings, cast info, etc.
- Save everything to your local database

**Note:** The script includes a 1-second delay between requests to respect API rate limits.

### Step 4: Test It Out

1. Start your server: `npm start`
2. Scan an NFC tag (or visit the scan URL with a token)
3. You should now see rich movie information on the playback page!

## What the Scan Page Now Shows

When you scan a VHS tape, users will see:

```
┌─────────────────────────────────────────┐
│  📼 VHS Tape Found!                     │
│                                         │
│  Back to the Future (1985)              │
│  ┌─────────┐  Rating: ⭐ 8.5/10        │
│  │ POSTER  │  Genre: Adventure, Comedy  │
│  │  IMAGE  │  Runtime: 116 min          │
│  │         │  Director: Robert Zemeckis │
│  └─────────┘  Starring: Michael J. Fox  │
│                                         │
│  Plot: Marty McFly, a 17-year-old...   │
│                                         │
│  [🎬 Play in Jellyfin]                 │
└─────────────────────────────────────────┘
```

## Database Changes

The following columns have been added to `vhs_tapes` table:
- `plot` - Full plot description
- `poster_url` - URL to movie poster image
- `imdb_rating` - IMDB rating (e.g., "8.5")
- `genre` - Comma-separated genres
- `director` - Director name(s)
- `actors` - Main cast members
- `runtime` - Movie duration (e.g., "116 min")
- `rated` - Content rating (PG, R, etc.)

## Troubleshooting

### "OMDB API: Movie not found"
- Check that the movie title and year in your database match IMDB
- Try searching manually at https://www.imdb.com/ to verify the title

### API Key Not Working
- Make sure you activated the key via the email link
- Wait a few minutes after activation for the key to become active
- Check that there are no extra spaces in your .env file

### Rate Limit Exceeded
- Free tier allows 1,000 requests per day
- Wait 24 hours or upgrade to a paid plan

## Re-running the Script

You can safely run `node fetch_movie_metadata.js` multiple times:
- Movies with metadata will be skipped automatically
- Only new movies or those missing metadata will be updated

## Updating Movie Information

To refresh metadata for a specific movie:

```sql
-- Clear metadata for a specific movie
UPDATE vhs_tapes SET plot = NULL, poster_url = NULL, imdb_rating = NULL
WHERE movie_title = 'Movie Name';
```

Then run the fetch script again.

## Cost

The OMDB API is **FREE** for:
- Up to 1,000 requests per day
- Personal/non-commercial use

For higher volumes, paid plans start at $1/month for 100,000 requests.

## Privacy

- Movie metadata is fetched once and stored locally
- Poster images are served directly from OMDB's CDN
- No user data is sent to OMDB (only movie titles/years)
