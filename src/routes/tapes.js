const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const database = require('../database/db');
const jellyfinService = require('../services/jellyfin');
const omdbService = require('../services/omdb');
const { adminAuth } = require('../middleware/auth');

// Generate a strong random NFC token (unguessable, to prevent URL farming)
function generateToken(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/**
 * GET /api/tapes
 * Get all VHS tapes
 */
router.get('/', async (req, res, next) => {
  try {
    const tapes = await database.all('SELECT * FROM vhs_tapes ORDER BY created_at DESC');

    res.json({
      success: true,
      data: tapes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tapes/:id
 * Get a specific VHS tape by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const tape = await database.get('SELECT * FROM vhs_tapes WHERE id = ?', [id]);

    if (!tape) {
      return res.status(404).json({
        success: false,
        error: { message: 'VHS tape not found' }
      });
    }

    // Get scan history
    const scanHistory = await database.all(
      'SELECT * FROM scan_history WHERE tape_id = ? ORDER BY scanned_at DESC LIMIT 10',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...tape,
        scanHistory
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tapes
 * Create a new VHS tape
 * Requires admin authentication
 */
router.post('/', adminAuth, async (req, res, next) => {
  try {
    let { token } = req.body;
    const { movie_id, movie_title, movie_year, cover_art_path } = req.body;

    // Validate required fields (token is optional - auto-generated if omitted)
    if (!movie_id || !movie_title) {
      return res.status(400).json({
        success: false,
        error: { message: 'movie_id and movie_title are required' }
      });
    }

    if (token) {
      // User supplied a token - make sure it's not already taken
      const existing = await database.get(
        'SELECT * FROM vhs_tapes WHERE token = ?',
        [token]
      );
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { message: 'Token already exists' }
        });
      }
    } else {
      // No token provided - generate a strong random one that isn't already taken
      do {
        token = generateToken();
      } while (await database.get('SELECT id FROM vhs_tapes WHERE token = ?', [token]));
    }

    // Verify movie exists in Jellyfin
    try {
      await jellyfinService.getItem(movie_id);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: { message: 'Movie not found in Jellyfin' }
      });
    }

    // Insert new tape
    const result = await database.run(
      `INSERT INTO vhs_tapes (token, movie_id, movie_title, movie_year, cover_art_path)
       VALUES (?, ?, ?, ?, ?)`,
      [token, movie_id, movie_title, movie_year || null, cover_art_path || null]
    );

    // Auto-fetch rich movie metadata from OMDB so the tape is self-describing when scanned
    await omdbService.fetchAndStore(result.lastID, movie_title, movie_year);

    // Get the created tape (now enriched with metadata, if OMDB had it)
    const newTape = await database.get(
      'SELECT * FROM vhs_tapes WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'VHS tape created successfully',
      data: newTape
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tapes/:id
 * Update a VHS tape
 * Requires admin authentication
 */
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { token, movie_id, movie_title, movie_year, cover_art_path } = req.body;

    // Check if tape exists
    const tape = await database.get('SELECT * FROM vhs_tapes WHERE id = ?', [id]);

    if (!tape) {
      return res.status(404).json({
        success: false,
        error: { message: 'VHS tape not found' }
      });
    }

    // If movie_id is being changed, verify it exists in Jellyfin
    if (movie_id && movie_id !== tape.movie_id) {
      try {
        await jellyfinService.getItem(movie_id);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: { message: 'Movie not found in Jellyfin' }
        });
      }
    }

    // Detect whether the mapped movie actually changed (so we know to refresh metadata)
    const movieChanged =
      (movie_id && movie_id !== tape.movie_id) ||
      (movie_title && movie_title !== tape.movie_title);

    // Update tape
    await database.run(
      `UPDATE vhs_tapes
       SET token = COALESCE(?, token),
           movie_id = COALESCE(?, movie_id),
           movie_title = COALESCE(?, movie_title),
           movie_year = COALESCE(?, movie_year),
           cover_art_path = COALESCE(?, cover_art_path),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [token, movie_id, movie_title, movie_year, cover_art_path, id]
    );

    // If the movie changed, re-fetch fresh metadata for the new movie
    if (movieChanged) {
      const t = await database.get('SELECT movie_title, movie_year FROM vhs_tapes WHERE id = ?', [id]);
      await omdbService.fetchAndStore(id, t.movie_title, t.movie_year);
    }

    // Get updated tape
    const updatedTape = await database.get(
      'SELECT * FROM vhs_tapes WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'VHS tape updated successfully',
      data: updatedTape
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tapes/:id
 * Delete a VHS tape
 * Requires admin authentication
 */
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if tape exists
    const tape = await database.get('SELECT * FROM vhs_tapes WHERE id = ?', [id]);

    if (!tape) {
      return res.status(404).json({
        success: false,
        error: { message: 'VHS tape not found' }
      });
    }

    // Delete tape (scan history will be cascade deleted)
    await database.run('DELETE FROM vhs_tapes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'VHS tape deleted successfully',
      data: tape
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tapes/library/refresh
 * Ask Jellyfin to scan for newly added movies (async on the Jellyfin side)
 * Requires admin authentication
 */
router.post('/library/refresh', adminAuth, async (req, res, next) => {
  try {
    await jellyfinService.refreshLibrary();
    res.json({ success: true, message: 'Jellyfin library scan started' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tapes/metadata/backfill
 * Fetch & store OMDB metadata for any tapes that are missing it.
 * Requires admin authentication
 */
router.post('/metadata/backfill', adminAuth, async (req, res, next) => {
  try {
    const tapes = await database.all(
      `SELECT id, movie_title, movie_year FROM vhs_tapes
        WHERE plot IS NULL OR poster_url IS NULL OR imdb_rating IS NULL
           OR genre IS NULL OR runtime IS NULL OR director IS NULL
        ORDER BY token`
    );

    let updated = 0;
    let failed = 0;
    for (const tape of tapes) {
      const metadata = await omdbService.fetchAndStore(tape.id, tape.movie_title, tape.movie_year);
      if (metadata) { updated++; } else { failed++; }
      // Gentle rate limiting for the OMDB API
      await new Promise(r => setTimeout(r, 350));
    }

    res.json({
      success: true,
      message: 'Metadata backfill complete',
      data: { checked: tapes.length, updated, failed }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tapes/search/movies
 * Search Jellyfin for movies to add to VHS tapes
 */
router.get('/search/movies', adminAuth, async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    let movies;
    if (q) {
      movies = await jellyfinService.searchMovies(q);
    } else {
      movies = await jellyfinService.getAllMovies(limit || 100);
    }

    res.json({
      success: true,
      data: movies.map(movie => ({
        id: movie.Id,
        title: movie.Name,
        year: movie.ProductionYear,
        overview: movie.Overview,
        imageTag: movie.ImageTags && movie.ImageTags.Primary ? movie.ImageTags.Primary : null
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
