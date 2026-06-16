// Application State
let releaseNotes = [];
let selectedNoteIds = new Set();
let filterType = 'all';
let searchQuery = '';

// DOM Elements
const notesList = document.getElementById('notes-list');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const refreshIcon = document.getElementById('refresh-icon');
const lastFetchedTime = document.getElementById('last-fetched-time');
const searchInput = document.getElementById('search-input');
const filterChips = document.getElementById('filter-chips');
const tweetDraft = document.getElementById('tweet-draft');
const charCount = document.getElementById('char-count');
const charCountWrapper = charCount.parentElement;
const selectedCountBadge = document.getElementById('selected-count-badge');
const tweetBtn = document.getElementById('tweet-btn');
const clearComposerBtn = document.getElementById('clear-composer');

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh & Retry
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));

    // Search input with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.toLowerCase().strip();
            renderReleaseNotes();
        }, 250);
    });

    // Filter Chips
    filterChips.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            // Update active state
            Array.from(filterChips.children).forEach(chip => chip.classList.remove('active'));
            e.target.classList.add('active');
            
            filterType = e.target.dataset.type;
            renderReleaseNotes();
        }
    });

    // Clear composer
    clearComposerBtn.addEventListener('click', () => {
        selectedNoteIds.clear();
        updateCardSelectionStates();
        updateTweetDraft();
    });

    // Tweet Button click
    tweetBtn.addEventListener('click', () => {
        const text = tweetDraft.value;
        if (!text.trim()) return;
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    });

    // Tweet draft textarea input (update character count manual edits)
    tweetDraft.addEventListener('input', () => {
        updateCharCount(tweetDraft.value.length);
    });
}

// Fetch Release Notes from API
async function fetchReleaseNotes(force = false) {
    showState('loading');
    refreshIcon.classList.add('active');
    refreshBtn.disabled = true;

    try {
        const url = `/api/release-notes${force ? '?force=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            releaseNotes = result.data;
            
            // Render last fetched time
            if (result.last_fetched) {
                const date = new Date(result.last_fetched);
                lastFetchedTime.textContent = `Last synced: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            
            renderReleaseNotes();
        } else {
            throw new Error(result.message || 'Unknown server error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        document.getElementById('error-message').textContent = `Failed to fetch updates: ${error.message}`;
        showState('error');
    } finally {
        refreshIcon.classList.remove('active');
        refreshBtn.disabled = false;
    }
}

// State display manager
function showState(state) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    notesList.classList.add('hidden');

    if (state === 'loading') {
        loadingState.classList.remove('hidden');
    } else if (state === 'error') {
        errorState.classList.remove('hidden');
    } else if (state === 'empty') {
        emptyState.classList.remove('hidden');
    } else if (state === 'list') {
        notesList.classList.remove('hidden');
    }
}

// Render filtered/searched cards
function renderReleaseNotes() {
    // Filter release notes
    const filteredNotes = releaseNotes.filter(note => {
        const matchesType = filterType === 'all' || note.type === filterType;
        const matchesSearch = !searchQuery || 
                              note.text.toLowerCase().includes(searchQuery) || 
                              note.date.toLowerCase().includes(searchQuery) ||
                              note.type.toLowerCase().includes(searchQuery);
        return matchesType && matchesSearch;
    });

    if (filteredNotes.length === 0) {
        showState('empty');
        return;
    }

    notesList.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const isSelected = selectedNoteIds.has(note.id);
        
        const card = document.createElement('div');
        card.className = `note-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = note.id;
        
        // Render Card HTML
        card.innerHTML = `
            <div class="note-card-selector">
                <label class="checkbox-container" onclick="event.stopPropagation();">
                    <input type="checkbox" data-id="${note.id}" ${isSelected ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="note-card-main">
                <div class="note-card-header">
                    <div class="note-meta-badges">
                        <span class="badge-date">${note.date}</span>
                        <span class="badge-type ${note.type.toLowerCase()}">${note.type}</span>
                    </div>
                    <button class="btn-card-tweet" title="Tweet this update only" onclick="event.stopPropagation(); tweetSingle('${note.id}')">
                        <span class="material-symbols-outlined">share</span>
                    </button>
                </div>
                <div class="note-card-body">
                    ${note.html}
                </div>
            </div>
        `;
        
        // Add card selection on clicking the card anywhere
        card.addEventListener('click', () => {
            const checkbox = card.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            toggleSelection(note.id, checkbox.checked);
        });
        
        // Checkbox change listener
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            toggleSelection(note.id, e.target.checked);
        });

        notesList.appendChild(card);
    });

    showState('list');
}

// Helper to strip leading whitespace for search string helper
String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
};

// Selection logic
function toggleSelection(id, isChecked) {
    if (isChecked) {
        selectedNoteIds.add(id);
    } else {
        selectedNoteIds.delete(id);
    }
    
    // Find the card element to toggle the selection class visual indicator
    const card = document.querySelector(`.note-card[data-id="${id}"]`);
    if (card) {
        if (isChecked) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }
    
    updateTweetDraft();
}

// Bulk update card UI selection states
function updateCardSelectionStates() {
    const cards = notesList.querySelectorAll('.note-card');
    cards.forEach(card => {
        const id = card.dataset.id;
        const checkbox = card.querySelector('input[type="checkbox"]');
        const isSelected = selectedNoteIds.has(id);
        
        checkbox.checked = isSelected;
        if (isSelected) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// Update character counts and styles
function updateCharCount(length) {
    charCount.textContent = length;
    
    // Manage styles based on limits
    charCountWrapper.className = 'char-count-wrapper';
    if (length > 250 && length <= 280) {
        charCountWrapper.classList.add('warning');
    } else if (length > 280) {
        charCountWrapper.classList.add('danger');
    }
}

// Format selected items into X Draft Composer
function updateTweetDraft() {
    const selectedCount = selectedNoteIds.size;
    selectedCountBadge.textContent = selectedCount;
    
    if (selectedCount === 0) {
        tweetDraft.value = '';
        updateCharCount(0);
        return;
    }
    
    let draftText = '';
    
    if (selectedCount === 1) {
        // Find single item
        const singleId = [...selectedNoteIds][0];
        const note = releaseNotes.find(n => n.id === singleId);
        if (note) {
            // Make text clean: get clean plain text representation
            let noteText = cleanTextForTweet(note.text);
            draftText = `BigQuery Update: ${noteText}\n\n#GCP #BigQuery`;
        }
    } else {
        draftText = `BigQuery Release Updates 🚀:\n\n`;
        
        let itemsAdded = 0;
        for (const id of selectedNoteIds) {
            const note = releaseNotes.find(n => n.id === id);
            if (note) {
                let noteText = cleanTextForTweet(note.text);
                
                // Truncate line item if it's too long
                if (noteText.length > 85) {
                    noteText = noteText.substring(0, 82) + '...';
                }
                
                draftText += `• [${note.type}] ${noteText}\n`;
                itemsAdded++;
            }
        }
        draftText += `\n#GoogleCloud #BigQuery`;
    }
    
    tweetDraft.value = draftText;
    updateCharCount(draftText.length);
}

// Format a single item tweet immediately bypassing bulk composer
function tweetSingle(id) {
    const note = releaseNotes.find(n => n.id === id);
    if (!note) return;
    
    let noteText = cleanTextForTweet(note.text);
    const draftText = `BigQuery ${note.type} Update: ${noteText}\n\n#GoogleCloud #BigQuery`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(draftText)}`;
    window.open(twitterUrl, '_blank');
}

// Clean raw feed text for tweets (remove duplicate spaces, newlines, etc.)
function cleanTextForTweet(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ') // replace multiple spaces/newlines with single space
        .trim();
}
