// API base URL (will work with relative URLs when deployed)
const API_BASE = '';

// No hardcoded credentials - browser will prompt for authentication

// Load tapes on page load
document.addEventListener('DOMContentLoaded', () => {
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

    if (tapes.length === 0) {
        tapesList.innerHTML = '<p class="loading">No VHS tapes yet. Add your first one!</p>';
        return;
    }

    tapesList.innerHTML = tapes.map(tape => `
        <div class="tape-card">
            <h3>${tape.movie_title}</h3>
            <div class="token">${tape.token}</div>
            <div class="year">${tape.movie_year || 'N/A'}</div>
            <div class="actions">
                <button class="btn btn-success" onclick="testScan('${tape.token}')">Test Scan</button>
                <button class="btn btn-secondary" onclick="editTape(${tape.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteTape(${tape.id}, '${tape.movie_title}')">Delete</button>
            </div>
        </div>
    `).join('');
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

// Show add tape modal
function showAddTapeModal() {
    document.getElementById('modalTitle').textContent = 'Add New VHS Tape';
    document.getElementById('tapeForm').reset();
    document.getElementById('tapeId').value = '';
    document.getElementById('movieResults').innerHTML = '';
    document.getElementById('movieResults').classList.remove('show');
    document.getElementById('tapeModal').style.display = 'block';
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
            document.getElementById('movie_id').value = tape.movie_id;
            document.getElementById('movie_title').value = tape.movie_title;
            document.getElementById('movie_year').value = tape.movie_year || '';
            document.getElementById('tapeModal').style.display = 'block';
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

// Search movies
let searchTimeout;
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 2) {
                document.getElementById('movieResults').classList.remove('show');
                return;
            }

            searchTimeout = setTimeout(() => searchMovies(query), 500);
        });
    }
});

// Search movies in Jellyfin
async function searchMovies(query) {
    try {
        const response = await fetch(`${API_BASE}/api/tapes/search/movies?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            displayMovieResults(data.data);
        }
    } catch (error) {
        console.error('Error searching movies:', error);
    }
}

// Display movie search results
function displayMovieResults(movies) {
    const resultsDiv = document.getElementById('movieResults');

    if (movies.length === 0) {
        resultsDiv.innerHTML = '<div class="movie-item"><p>No movies found</p></div>';
        resultsDiv.classList.add('show');
        return;
    }

    resultsDiv.innerHTML = movies.map(movie => `
        <div class="movie-item" onclick="selectMovie('${movie.id}', '${escapeHtml(movie.title)}', ${movie.year || 'null'})">
            <h4>${movie.title} ${movie.year ? `(${movie.year})` : ''}</h4>
            <p>${movie.overview ? movie.overview.substring(0, 150) + '...' : 'No description'}</p>
        </div>
    `).join('');

    resultsDiv.classList.add('show');
}

// Select a movie from search results
function selectMovie(id, title, year) {
    document.getElementById('movie_id').value = id;
    document.getElementById('movie_title').value = title;
    if (year) {
        document.getElementById('movie_year').value = year;
    }
    document.getElementById('movieResults').classList.remove('show');
    document.getElementById('movieSearch').value = title;
}

// Escape HTML for safe display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tapeForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const tapeId = document.getElementById('tapeId').value;
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
                    alert(tapeId ? 'VHS tape updated successfully!' : 'VHS tape created successfully!');
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

    if (event.target === tapeModal) {
        closeModal();
    }
    if (event.target === scanModal) {
        closeScanModal();
    }
}
