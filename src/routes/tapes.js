const express = require('express');
const router = express.Router();
const database = require('../database/db');
const jellyfinService = require('../services/jellyfin');
const { adminAuth } = require('../middleware/auth');

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
    const { token, movie_id, movie_title, movie_year, cover_art_path } = req.body;

    // Validate required fields
    if (!token || !movie_id || !movie_title) {
      return res.status(400).json({
        success: false,
        error: { message: 'token, movie_id, and movie_title are required' }
      });
    }

    // Check if token already exists
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

    // Get the created tape
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
        overview: movie.Overview
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
