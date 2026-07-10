const axios = require('axios');
const config = require('../config');
const database = require('../database/db');

const OMDB_BASE_URL = 'http://www.omdbapi.com/';

/**
 * Fetch full movie metadata from OMDB by title (and optional year).
 * @param {string} title - Movie title
 * @param {number|string} [year] - Release year (improves match accuracy)
 * @returns {Promise<Object|null>} Normalized metadata, or null if unavailable
 */
async function fetchMetadata(title, year) {
  const apiKey = config.omdb && config.omdb.apiKey;
  if (!apiKey) {
    console.warn('OMDB_API_KEY not configured - skipping metadata fetch');
    return null;
  }

  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: { apikey: apiKey, t: title, y: year || undefined, type: 'movie', plot: 'full' },
      timeout: 8000
    });

    if (response.data.Response !== 'True') {
      console.warn(`OMDB: ${response.data.Error} (for "${title}" ${year || ''})`);
      return null;
    }

    const d = response.data;
    const clean = (v) => (v && v !== 'N/A' ? v : null);

    // Convert poster URL from HTTP to HTTPS to avoid mixed-content issues
    let posterUrl = clean(d.Poster);
    if (posterUrl) posterUrl = posterUrl.replace('http://', 'https://');

    return {
      plot: clean(d.Plot),
      poster_url: posterUrl,
      imdb_rating: clean(d.imdbRating),
      genre: clean(d.Genre),
      director: clean(d.Director),
      actors: clean(d.Actors),
      writer: clean(d.Writer),
      runtime: clean(d.Runtime),
      rated: clean(d.Rated),
      awards: clean(d.Awards)
    };
  } catch (error) {
    console.error(`OMDB fetch error for "${title}": ${error.message}`);
    return null;
  }
}

/**
 * Fetch metadata for a movie and persist it onto a tape row.
 * Never throws - returns the metadata that was stored, or null on failure.
 * @param {number} tapeId - vhs_tapes row id
 * @param {string} title - Movie title
 * @param {number|string} [year] - Release year
 * @returns {Promise<Object|null>}
 */
async function fetchAndStore(tapeId, title, year) {
  const metadata = await fetchMetadata(title, year);
  if (!metadata) return null;

  try {
    await database.run(
      `UPDATE vhs_tapes
         SET plot = ?, poster_url = ?, imdb_rating = ?, genre = ?, director = ?,
             actors = ?, writer = ?, runtime = ?, rated = ?, awards = ?,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        metadata.plot, metadata.poster_url, metadata.imdb_rating, metadata.genre,
        metadata.director, metadata.actors, metadata.writer, metadata.runtime,
        metadata.rated, metadata.awards, tapeId
      ]
    );
    return metadata;
  } catch (error) {
    console.error(`Failed to store metadata for tape ${tapeId}: ${error.message}`);
    return null;
  }
}

module.exports = { fetchMetadata, fetchAndStore };
