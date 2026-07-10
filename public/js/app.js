// API base URL (will work with relative URLs when deployed)
const API_BASE = '';
let VHS_TAP_URL = '';
let JELLYFIN_URL = '';

// Movie library browsing state
let allMovies = [];                 // full library, fetched once per page load
let mappedMovieIds = new Set();     // movie_ids already assigned to a tape
let selectedMovieId = null;         // currently picked movie in the modal

// No hardcoded credentials - browser will prompt for authentication

// Load config and tapes on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const configResponse = await fetch(`${API_BASE}/api/config`);
        const config = await configResponse.json();
        VHS_TAP_URL = config.vhsTapUrl || '';
        JELLYFIN_URL = config.jellyfinUrl || '';
    } catch (e) {
        console.error('Failed to load config:', e);
    }
    refreshTapes();
});

// Refresh tapes list
async function refreshTapes() {
    try {
        const response = await fetch(`${API_BASE}/api/tapes`);
        const data = await response.json();

        if (data.success) {
            displayTapes(data.data);
            updateStats(data.data);
        } else {
            console.error('Failed to load tapes:', data.error);
        }
    } catch (error) {
        console.error('Error loading tapes:', error);
        document.getElementById('tapesList').innerHTML =
            '<p class="loading">Error loading tapes. Please try again.</p>';
    }
}

// Display tapes in grid
function displayTapes(tapes) {
    const tapesList = document.getElementById('tapesList');

    // Track which movies already live on a tape (for the "On a tape" badge)
    mappedMovieIds = new Set(tapes.map(t => t.movie_id));

    if (tapes.length === 0) {
        tapesList.innerHTML = '<p class="loading">No VHS tapes yet. Add your first one!</p>';
        return;
    }

    tapesList.innerHTML = tapes.map(tape => {
        const nfcUrl = `${VHS_TAP_URL}/scan?token=${encodeURIComponent(tape.token)}`;
        const qrThumb = makeQr(nfcUrl, 4, 8);
        return `
        <div class="tape-card">
            <h3>${tape.movie_title}</h3>
            <div class="token">${tape.token}</div>
            <div class="year">${tape.movie_year || 'N/A'}</div>
            <div style="margin:10px 0;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid rgba(196,113,237,0.3)">
                <label style="display:block;font-size:0.75rem;color:#c471ed;margin-bottom:5px;font-weight:600">NFC URL</label>
                <div style="display:flex;gap:5px">
                    <input type="text" value="${nfcUrl}" readonly onclick="this.select()" style="flex:1;padding:6px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;font-size:0.8rem;font-family:monospace">
                    <button class="btn" onclick="copyUrl(this, '${nfcUrl}')" style="padding:6px 12px;font-size:0.8rem;flex:none">Copy</button>
                </div>
            </div>
            <div class="qr-block" onclick="showQrModal('${tape.token}')" title="Click to enlarge for easy scanning">
                ${qrThumb ? `<img class="qr-img" src="${qrThumb}" alt="QR code for ${tape.token}">` : ''}
                <span class="qr-hint">📷 Scan with your phone to grab this URL</span>
            </div>
            <div class="actions">
                <button class="btn btn-success" onclick="testScan('${tape.token}')">Test Scan</button>
                <button class="btn btn-secondary" onclick="editTape(${tape.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteTape(${tape.id}, '${tape.movie_title}')">Delete</button>
            </div>
        </div>
    `}).join('');
}

// Update statistics
async function updateStats(tapes) {
    document.getElementById('totalTapes').textContent = tapes.length;

    // Get total scans
    let totalScans = 0;
    for (const tape of tapes) {
        try {
            const response = await fetch(`${API_BASE}/api/tapes/${tape.id}`);
            const data = await response.json();
            if (data.success && data.data.scanHistory) {
                totalScans += data.data.scanHistory.length;
            }
        } catch (error) {
            console.error('Error fetching scan history:', error);
        }
    }
    document.getElementById('totalScans').textContent = totalScans;
}

// Fetch OMDB metadata for any tapes missing it
async function backfillMetadata(btn) {
    if (!confirm('Fetch movie metadata (poster, plot, cast, ratings) for all tapes missing it?\n\nThis may take a few seconds per movie.')) {
        return;
    }
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Fetching…';
    try {
        const res = await fetch(`${API_BASE}/api/tapes/metadata/backfill`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            const d = data.data;
            alert(`Metadata updated for ${d.updated} of ${d.checked} tape(s).` +
                  (d.failed ? `\n${d.failed} could not be matched on OMDB.` : ''));
            refreshTapes();
        } else {
            alert('Backfill failed: ' + (data.error ? data.error.message : 'unknown error'));
        }
    } catch (e) {
        console.error('Backfill failed:', e);
        alert('Backfill failed. Check the server logs.');
    }
    btn.disabled = false;
    btn.textContent = original;
}

// Generate a strong random token (unguessable, to prevent URL farming)
function generateToken(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const arr = new Uint32Array(length);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    let out = '';
    for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
    return out;
}

// Replace the token field with a fresh random token
function regenerateToken() {
    document.getElementById('token').value = generateToken();
}

// Show add tape modal
function showAddTapeModal() {
    document.getElementById('modalTitle').textContent = 'Add New VHS Tape';
    document.getElementById('tapeForm').reset();
    document.getElementById('tapeId').value = '';
    document.getElementById('token').value = generateToken();  // randomized default
    clearMovieSelection();
    document.getElementById('movieSearch').value = '';
    document.getElementById('tapeModal').style.display = 'block';
    loadMovieLibrary();
}

// Clear the currently selected movie in the modal
function clearMovieSelection() {
    selectedMovieId = null;
    document.getElementById('movie_id').value = '';
    document.getElementById('movie_title').value = '';
    document.getElementById('movie_year').value = '';
    document.getElementById('selectedMovie').style.display = 'none';
    document.querySelectorAll('.movie-card.selected').forEach(c => c.classList.remove('selected'));
}

// Close modal
function closeModal() {
    document.getElementById('tapeModal').style.display = 'none';
}

// Close scan modal
function closeScanModal() {
    document.getElementById('scanModal').style.display = 'none';
}

// Edit tape
async function editTape(id) {
    try {
        const response = await fetch(`${API_BASE}/api/tapes/${id}`);
        const data = await response.json();

        if (data.success) {
            const tape = data.data;
            document.getElementById('modalTitle').textContent = 'Edit VHS Tape';
            document.getElementById('tapeId').value = tape.id;
            document.getElementById('token').value = tape.token;
            document.getElementById('movieSearch').value = '';
            // Pre-select the tape's current movie
            selectedMovieId = tape.movie_id;
            document.getElementById('movie_id').value = tape.movie_id;
            document.getElementById('movie_title').value = tape.movie_title;
            document.getElementById('movie_year').value = tape.movie_year || '';
            document.getElementById('selectedMovieText').textContent =
                tape.movie_title + (tape.movie_year ? ` (${tape.movie_year})` : '');
            document.getElementById('selectedMovie').style.display = '';
            document.getElementById('tapeModal').style.display = 'block';
            loadMovieLibrary();
        }
    } catch (error) {
        console.error('Error loading tape:', error);
        alert('Failed to load tape details');
    }
}

// Delete tape
async function deleteTape(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/tapes/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            alert('VHS tape deleted successfully!');
            refreshTapes();
        } else {
            alert('Failed to delete tape: ' + data.error.message);
        }
    } catch (error) {
        console.error('Error deleting tape:', error);
        alert('Failed to delete tape');
    }
}

// Test scan
async function testScan(token) {
    try {
        const response = await fetch(`${API_BASE}/api/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        const resultDiv = document.getElementById('scanResult');

        if (data.success) {
            resultDiv.className = 'scan-result success';
            resultDiv.innerHTML = `
                <h3>✅ Scan Successful!</h3>
                <p><strong>Movie:</strong> ${data.data.movie.title} (${data.data.movie.year})</p>
                <p><strong>Token:</strong> ${data.data.tape.token}</p>
                <p><strong>Movie ID:</strong> ${data.data.movie.id}</p>
                ${data.message ? `<p><em>${data.message}</em></p>` : ''}
                <pre>${JSON.stringify(data.data.movie, null, 2)}</pre>
            `;
        } else {
            resultDiv.className = 'scan-result error';
            resultDiv.innerHTML = `
                <h3>❌ Scan Failed</h3>
                <p>${data.error.message}</p>
            `;
        }

        document.getElementById('scanModal').style.display = 'block';
    } catch (error) {
        console.error('Error testing scan:', error);
        alert('Failed to test scan');
    }
}

// Live filter of the loaded library (client-side, no server round-trip)
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            const filtered = query
                ? allMovies.filter(m => (m.title || '').toLowerCase().includes(query))
                : allMovies;
            renderMovieGrid(filtered);
        });
    }
});

// Fetch the whole movie library from Jellyfin (once per page load) and render it
async function loadMovieLibrary() {
    const grid = document.getElementById('movieBrowse');
    try {
        if (allMovies.length === 0) {
            grid.innerHTML = '<p class="browse-loading">Loading your library…</p>';
            const response = await fetch(`${API_BASE}/api/tapes/search/movies?limit=1000`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                allMovies = data.data;
            } else {
                grid.innerHTML = '<p class="browse-loading">Could not load library.</p>';
                return;
            }
        }
        // Re-apply any active filter text
        const query = (document.getElementById('movieSearch').value || '').trim().toLowerCase();
        const filtered = query
            ? allMovies.filter(m => (m.title || '').toLowerCase().includes(query))
            : allMovies;
        renderMovieGrid(filtered);
    } catch (error) {
        console.error('Error loading library:', error);
        grid.innerHTML = '<p class="browse-loading">Error loading library.</p>';
    }
}

// Ask Jellyfin to scan for newly added movies, then refresh the grid
async function rescanLibrary() {
    const btn = document.getElementById('rescanBtn');
    const status = document.getElementById('rescanStatus');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Scanning…';

    try {
        const res = await fetch(`${API_BASE}/api/tapes/library/refresh`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ? data.error.message : 'Scan request failed');
        status.className = 'rescan-status info show';
        status.textContent = 'Jellyfin is scanning for new movies. New titles appear once it finishes — if any are still missing, wait a minute and click Rescan again.';
    } catch (e) {
        console.error('Rescan failed:', e);
        status.className = 'rescan-status error show';
        status.textContent = 'Could not start the scan. Check the server logs.';
    }

    // Re-pull the library now (catches anything already indexed) and again shortly after
    allMovies = [];
    await loadMovieLibrary();
    setTimeout(async () => { allMovies = []; await loadMovieLibrary(); }, 12000);

    btn.disabled = false;
    btn.textContent = original;
}

// Build a Jellyfin poster URL (images are served publicly, no API key needed)
function posterUrl(movie) {
    if (!movie.imageTag || !JELLYFIN_URL) return null;
    return `${JELLYFIN_URL}/Items/${movie.id}/Images/Primary`
         + `?fillHeight=330&fillWidth=220&quality=90&tag=${encodeURIComponent(movie.imageTag)}`;
}

// Render the browsable poster grid
function renderMovieGrid(movies) {
    const grid = document.getElementById('movieBrowse');

    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p class="browse-loading">No movies match your filter.</p>';
        return;
    }

    grid.innerHTML = movies.map(m => {
        const mapped = mappedMovieIds.has(m.id);
        const selected = m.id === selectedMovieId ? ' selected' : '';
        const url = posterUrl(m);
        const poster = url
            ? `<img loading="lazy" src="${url}" alt="">`
            : '<div class="no-poster">🎬</div>';
        const label = escapeHtml(m.title) + (m.year ? ` (${m.year})` : '');
        return `
        <div class="movie-card${selected}" data-id="${m.id}" title="${label}" onclick="selectMovie('${m.id}')">
            ${mapped ? '<span class="mapped-badge">On a tape</span>' : ''}
            <div class="poster">${poster}</div>
            <div class="movie-card-title">${escapeHtml(m.title)}</div>
            <div class="movie-card-year">${m.year || ''}</div>
        </div>`;
    }).join('');
}

// Select a movie from the grid (looked up by id to avoid quoting issues)
function selectMovie(id) {
    const movie = allMovies.find(m => m.id === id);
    if (!movie) return;

    selectedMovieId = id;
    document.getElementById('movie_id').value = movie.id;
    document.getElementById('movie_title').value = movie.title;
    document.getElementById('movie_year').value = movie.year || '';

    document.getElementById('selectedMovieText').textContent =
        movie.title + (movie.year ? ` (${movie.year})` : '');
    document.getElementById('selectedMovie').style.display = '';

    // Highlight the chosen card
    document.querySelectorAll('.movie-card').forEach(c =>
        c.classList.toggle('selected', c.dataset.id === id));
}

// Copy URL to clipboard with fallback
function copyUrl(btn, url) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
        }).catch(() => fallbackCopy(btn, url));
    } else {
        fallbackCopy(btn, url);
    }
}

function fallbackCopy(btn, url) {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
}

// Escape HTML for safe display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate a QR code data URL locally (no external service) for a given string
function makeQr(text, cellSize = 4, margin = 8) {
    try {
        const qr = qrcode(0, 'M');   // type 0 = auto-size, 'M' error correction
        qr.addData(text);
        qr.make();
        return qr.createDataURL(cellSize, margin);
    } catch (e) {
        console.error('QR generation failed:', e);
        return null;
    }
}

// Show an enlarged QR + URL for one tape, for easy phone scanning
function showQrModal(token) {
    const nfcUrl = `${VHS_TAP_URL}/scan?token=${encodeURIComponent(token)}`;
    const big = makeQr(nfcUrl, 7, 16);
    document.getElementById('qrModalToken').textContent = token;
    document.getElementById('qrModalUrl').value = nfcUrl;
    document.getElementById('qrModalImage').innerHTML = big
        ? `<img src="${big}" alt="QR code for ${token}">`
        : '<p>QR unavailable</p>';
    document.getElementById('qrModal').style.display = 'block';
}

function closeQrModal() {
    document.getElementById('qrModal').style.display = 'none';
}

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tapeForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const tapeId = document.getElementById('tapeId').value;

            if (!document.getElementById('movie_id').value) {
                alert('Please pick a movie from your library first.');
                return;
            }

            const formData = {
                token: document.getElementById('token').value,
                movie_id: document.getElementById('movie_id').value,
                movie_title: document.getElementById('movie_title').value,
                movie_year: parseInt(document.getElementById('movie_year').value) || null
            };

            try {
                const url = tapeId ? `${API_BASE}/api/tapes/${tapeId}` : `${API_BASE}/api/tapes`;
                const method = tapeId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });

                const data = await response.json();

                if (data.success) {
                    const token = data.data.token;
                    const nfcUrl = `${VHS_TAP_URL}/scan?token=${encodeURIComponent(token)}`;
                    alert(`${tapeId ? 'VHS tape updated' : 'VHS tape created'} successfully!\n\nNFC URL:\n${nfcUrl}`);
                    closeModal();
                    refreshTapes();
                } else {
                    alert('Failed to save tape: ' + data.error.message);
                }
            } catch (error) {
                console.error('Error saving tape:', error);
                alert('Failed to save tape');
            }
        });
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const tapeModal = document.getElementById('tapeModal');
    const scanModal = document.getElementById('scanModal');
    const qrModal = document.getElementById('qrModal');

    if (event.target === tapeModal) {
        closeModal();
    }
    if (event.target === scanModal) {
        closeScanModal();
    }
    if (event.target === qrModal) {
        closeQrModal();
    }
}
