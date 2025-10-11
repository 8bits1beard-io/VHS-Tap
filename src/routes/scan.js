const express = require('express');
const router = express.Router();
const database = require('../database/db');
const jellyfinService = require('../services/jellyfin');
const config = require('../config');

/**
 * Helper function to build movie object from tape and Jellyfin data
 */
function buildMovieObject(tape, jellyfinInfo) {
  return {
    id: jellyfinInfo.Id,
    title: jellyfinInfo.Name,
    year: jellyfinInfo.ProductionYear,
    overview: jellyfinInfo.Overview,
    // Additional metadata from OMDB
    plot: tape.plot,
    poster_url: tape.poster_url,
    imdb_rating: tape.imdb_rating,
    genre: tape.genre,
    director: tape.director,
    actors: tape.actors,
    writer: tape.writer,
    runtime: tape.runtime,
    rated: tape.rated
  };
}

/**
 * POST /api/scan
 * Validate NFC token and trigger movie playback
 *
 * Body:
 * - token: NFC token from the VHS tape
 * - userId: (optional) Specific Jellyfin user ID
 * - sessionId: (optional) Specific session/device ID
 */
router.post('/', async (req, res, next) => {
  try {
    const { token, userId, sessionId } = req.body;

    // Validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token is required' }
      });
    }

    console.log(`Scanning token: ${token}`);

    // Look up the VHS tape in database
    const tape = await database.get(
      'SELECT * FROM vhs_tapes WHERE token = ?',
      [token]
    );

    if (!tape) {
      return res.status(404).json({
        success: false,
        error: { message: 'Invalid token - VHS tape not found' }
      });
    }

    console.log(`Found tape: ${tape.movie_title} (${tape.movie_id})`);

    // Record the scan in history
    await database.run(
      'INSERT INTO scan_history (tape_id) VALUES (?)',
      [tape.id]
    );

    // Get the movie details from Jellyfin
    let movieInfo;
    try {
      movieInfo = await jellyfinService.getItem(tape.movie_id);
    } catch (error) {
      console.error('Failed to fetch movie from Jellyfin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Movie not found in Jellyfin' }
      });
    }

    // If sessionId is provided, send play command directly to that session
    if (sessionId) {
      try {
        await jellyfinService.sendPlayCommand(sessionId, tape.movie_id);

        return res.json({
          success: true,
          message: 'Playback started',
          data: {
            tape,
            movie: buildMovieObject(tape, movieInfo)
          }
        });
      } catch (error) {
        console.error('Failed to start playback:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to start playback on device' }
        });
      }
    }

    // If userId is provided, try to find an active session for that user
    if (userId) {
      try {
        const sessions = await jellyfinService.getUserSessions(userId);

        if (sessions.length === 0) {
          return res.status(400).json({
            success: false,
            error: { message: 'No active sessions found for this user' }
          });
        }

        // Use the first active session
        const activeSession = sessions[0];
        await jellyfinService.sendPlayCommand(activeSession.Id, tape.movie_id);

        return res.json({
          success: true,
          message: 'Playback started',
          data: {
            tape,
            movie: buildMovieObject(tape, movieInfo),
            session: {
              id: activeSession.Id,
              deviceName: activeSession.DeviceName
            }
          }
        });
      } catch (error) {
        console.error('Failed to start playback:', error);
        return res.status(500).json({
          success: false,
          error: { message: 'Failed to start playback' }
        });
      }
    }

    // If neither userId nor sessionId provided, check if auto-playback is enabled
    if (config.autoPlayback.enabled && config.autoPlayback.autoSelectSession) {
      try {
        console.log('Auto-playback enabled, attempting to find active session...');

        // Get users
        const users = await jellyfinService.getUsers();

        if (users.length === 0) {
          console.log('No users found in Jellyfin');
          return res.json({
            success: true,
            message: 'Token validated but no users found for auto-playback',
            data: {
              tape,
              movie: buildMovieObject(tape, movieInfo)
            }
          });
        }

        // Use default user or first user
        const targetUser = config.autoPlayback.defaultUserId
          ? users.find(u => u.Id === config.autoPlayback.defaultUserId) || users[0]
          : users[0];

        console.log(`Using user: ${targetUser.Name} (${targetUser.Id})`);

        // Get all active sessions
        const allSessions = await jellyfinService.client.get('/Sessions');
        const activeSessions = allSessions.data.filter(s =>
          s.SupportsRemoteControl &&
          s.UserId === targetUser.Id &&
          s.NowPlayingItem === undefined // Not currently playing
        );

        if (activeSessions.length === 0) {
          console.log('No active controllable sessions found');
          return res.json({
            success: true,
            message: 'Token validated but no active sessions found for auto-playback',
            data: {
              tape,
              movie: buildMovieObject(tape, movieInfo)
            }
          });
        }

        // Use the first active session
        const session = activeSessions[0];
        console.log(`Sending play command to session: ${session.DeviceName} (${session.Id})`);

        await jellyfinService.sendPlayCommand(session.Id, tape.movie_id);

        return res.json({
          success: true,
          message: 'Playback started automatically',
          data: {
            tape,
            movie: buildMovieObject(tape, movieInfo),
            session: {
              id: session.Id,
              deviceName: session.DeviceName,
              user: targetUser.Name
            }
          }
        });

      } catch (error) {
        console.error('Auto-playback failed:', error);
        // Fall through to return validation response
      }
    }

    // If auto-playback is disabled or failed, return tape and movie info
    res.json({
      success: true,
      message: 'Token validated - provide userId or sessionId to start playback',
      data: {
        tape,
        movie: buildMovieObject(tape, movieInfo)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
