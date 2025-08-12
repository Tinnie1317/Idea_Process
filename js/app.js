/**

- Main Application Controller - AI Ideas Processor
- Coordinates all UI interactions and business logic
  */

class IdeaProcessorApp {
constructor() {
this.currentPage = 1;
this.itemsPerPage = 10;
this.currentSort = ‘newest’;
this.currentSearch = ‘’;
this.isProcessing = false;
this.currentIdea = null;

```
    // Voice recognition
    this.recognition = null;
    this.isRecording = false;
    
    // Initialize app
    this.init();
}

/**
 * Initialize the application
 */
async init() {
    try {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    } catch (error) {
        console.error('Failed to initialize app:', error);
        this.showToast('Failed to initialize application', 'error');
    }
}

/**
 * Setup the application after DOM is ready
 */
setup() {
    this.initializeElements();
    this.bindEventListeners();
    this.loadSettings();
    this.updateDisplay();
    this.setupKeyboardShortcuts();
    this.checkApiKeyStatus();
    
    // Show welcome message for first-time users
    if (!storageManager.getIdeas().length && !storageManager.getApiKey()) {
        this.showWelcomeMessage();
    }
}

/**
 * Initialize DOM element references
 */
initializeElements() {
    // Input elements
    this.ideaInput = document.getElementById('ideaInput');
    this.apiKeyInput = document.getElementById('apiKey');
    this.charCount = document.getElementById('charCount');
    
    // Button elements
    this.processBtn = document.getElementById('processBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.voiceBtn = document.getElementById('voiceBtn');
    this.pasteBtn = document.getElementById('pasteBtn');
    
    // Output elements
    this.outputArea = document.getElementById('outputArea');
    this.processingOverlay = document.getElementById('processingOverlay');
    
    // Ideas bank elements
    this.ideasContainer = document.getElementById('ideasContainer');
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    this.exportBtn = document.getElementById('exportBtn');
    this.importBtn = document.getElementById('importBtn');
    this.importFile = document.getElementById('importFile');
    this.clearBankBtn = document.getElementById('clearBankBtn');
    this.backupBtn = document.getElementById('backupBtn');
    
    // Statistics elements
    this.totalIdeas = document.getElementById('totalIdeas');
    this.thisMonth = document.getElementById('thisMonth');
    this.avgLength = document.getElementById('avgLength');
    this.totalWords = document.getElementById('totalWords');
    
    // Pagination elements
    this.pagination = document.getElementById('pagination');
    this.prevPage = document.getElementById('prevPage');
    this.nextPage = document.getElementById('nextPage');
    this.pageInfo = document.getElementById('pageInfo');
    
    // Modal elements
    this.ideaModal = document.getElementById('ideaModal');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalBody = document.getElementById('modalBody');
    this.closeModal = document.getElementById('closeModal');
    this.modalCopy = document.getElementById('modalCopy');
    this.modalEdit = document.getElementById('modalEdit');
    this.modalDelete = document.getElementById('modalDelete');
    
    // Toast container
    this.toastContainer = document.getElementById('toastContainer');
}

/**
 * Bind all event listeners
 */
bindEventListeners() {
    // Input events
    this.ideaInput?.addEventListener('input', () => this.updateCharCount());
    this.apiKeyInput?.addEventListener('input', () => this.saveApiKey());
    this.apiKeyInput?.addEventListener('blur', () => this.validateApiKey());
    
    // Button events
    this.processBtn?.addEventListener('click', () => this.processIdea());
    this.clearBtn?.addEventListener('click', () => this.clearInput());
    this.voiceBtn?.addEventListener('click', () => this.toggleVoiceInput());
    this.pasteBtn?.addEventListener('click', () => this.pasteFromClipboard());
    
    // Search and sort
    this.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.sortSelect?.addEventListener('change', (e) => this.handleSort(e.target.value));
    
    // Bank actions
    this.exportBtn?.addEventListener('click', () => this.exportIdeas());
    this.importBtn?.addEventListener('click', () => this.importFile?.click());
    this.importFile?.addEventListener('change', (e) => this.importIdeas(e));
    this.clearBankBtn?.addEventListener('click', () => this.clearIdeasBank());
    this.backupBtn?.addEventListener('click', () => this.createBackup());
    
    // Pagination
    this.prevPage?.addEventListener('click', () => this.changePage(-1));
    this.nextPage?.addEventListener('click', () => this.changePage(1));
    
    // Modal events
    this.closeModal?.addEventListener('click', () => this.closeIdeaModal());
    this.modalCopy?.addEventListener('click', () => this.copyCurrentIdea());
    this.modalEdit?.addEventListener('click', () => this.editCurrentIdea());
    this.modalDelete?.addEventListener('click', () => this.deleteCurrentIdea());
    
    // Click outside modal to close
    this.ideaModal?.addEventListener('click', (e) => {
        if (e.target === this.ideaModal) {
            this.closeIdeaModal();
        }
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => this.handleUrlChange());
    
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Handle online/offline
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
}

/**
 * Setup keyboard shortcuts
 */
setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter: Process idea
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!this.isProcessing && this.ideaInput?.value.trim()) {
                this.processIdea();
            }
        }
        
        // Ctrl/Cmd + K: Focus input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.ideaInput?.focus();
        }
        
        // Escape: Close modal or clear input
        if (e.key === 'Escape') {
            if (this.ideaModal?.style.display !== 'none') {
                this.closeIdeaModal();
            } else {
                this.clearInput();
            }
        }
        
        // Ctrl/Cmd + S: Export ideas
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.exportIdeas();
        }
    });
}

/**
 * Load user settings
 */
loadSettings() {
    const settings = storageManager.getSettings();
    
    // Apply settings
    if (settings.sortBy) {
        this.currentSort = settings.sortBy;
        if (this.sortSelect) {
            this.sortSelect.value = settings.sortBy;
        }
    }
    
    if (settings.itemsPerPage) {
        this.itemsPerPage = settings.itemsPerPage;
    }
    
    // Load API key
    const apiKey = storageManager.getApiKey();
    if (apiKey && this.apiKeyInput) {
        this.apiKeyInput.value = apiKey;
    }
}

/**
 * Check API key status on startup
 */
async checkApiKeyStatus() {
    const apiKey = storageManager.getApiKey();
    if (apiKey) {
        try {
            const result = await apiManager.validateApiKey(apiKey);
            if (!result.valid) {
                this.showToast('Stored API key appears invalid', 'warning');
            }
        } catch (error) {
            console.warn('Could not validate API key:', error);
        }
    }
}

/**
 * Update character count display
 */
updateCharCount() {
    if (!this.ideaInput || !this.charCount) return;
    
    const length = this.ideaInput.value.length;
    const maxLength = parseInt(this.ideaInput.getAttribute('maxlength')) || 2000;
    
    this.charCount.textContent = length;
    
    // Add warning color if approaching limit
    if (length > maxLength * 0.9) {
        this.charCount.style.color = 'var(--warning-color)';
    } else if (length > maxLength * 0.8) {
        this.charCount.style.color = 'var(--info-color)';
    } else {
        this.charCount.style.color = 'var(--text-muted)';
    }
}

/**
 * Save API key to storage
 */
saveApiKey() {
    if (!this.apiKeyInput) return;
    
    const apiKey = this.apiKeyInput.value.trim();
    storageManager.saveApiKey(apiKey);
}

/**
 * Validate API key format
 */
async validateApiKey() {
    if (!this.apiKeyInput) return;
    
    const apiKey = this.apiKeyInput.value.trim();
    if (!apiKey) return;
    
    const result = apiManager.validateApiKey(apiKey);
    if (!result.valid) {
        this.showToast(result.error, 'warning');
    }
}

/**
 * Process idea with AI
 */
async processIdea() {
    const idea = this.ideaInput?.value.trim();
    const apiKey = this.apiKeyInput?.value.trim();
    
    if (!idea) {
        this.showToast('Please enter an idea to process', 'warning');
        this.ideaInput?.focus();
        return;
    }
    
    if (!apiKey) {
        this.showToast('Please enter your OpenAI API key', 'warning');
        this.apiKeyInput?.focus();
        return;
    }
    
    this.setProcessing(true);
    
    try {
        // Estimate cost
        const inputTokens = apiManager.estimateTokens(apiManager.systemPrompt + idea);
        const estimatedCost = apiManager.estimateCost('openai', 'gpt-3.5-turbo', inputTokens, 500);
        
        if (estimatedCost > 0.10) { // Warn if cost > 10 cents
            const confirmed = confirm(`This request will cost approximately $${estimatedCost.toFixed(4)}. Continue?`);
            if (!confirmed) {
                this.setProcessing(false);
                return;
            }
        }
        
        const result = await apiManager.processIdeaWithRetry(idea, apiKey);
        
        if (result.success) {
            this.displayProcessedIdea(result.data);
            this.saveProcessedIdea(result.data, idea);
            this.showToast('Idea processed successfully!', 'success');
            
            // Clear input after successful processing
            setTimeout(() => this.clearInput(), 1000);
        } else {
            throw new Error('Processing failed');
        }
        
    } catch (error) {
        console.error('Processing error:', error);
        this.displayError(error.message);
        this.showToast(error.message, 'error');
    } finally {
        this.setProcessing(false);
    }
}

/**
 * Set processing state
 * @param {boolean} isProcessing - Processing state
 */
setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    
    if (this.processBtn) {
        this.processBtn.disabled = isProcessing;
        this.processBtn.innerHTML = isProcessing ? 
            '⏳ Processing...' : 
            '⚡ Process Idea';
    }
    
    if (this.processingOverlay) {
        this.processingOverlay.style.display = isProcessing ? 'flex' : 'none';
    }
    
    // Disable other inputs during processing
    if (this.ideaInput) this.ideaInput.disabled = isProcessing;
    if (this.apiKeyInput) this.apiKeyInput.disabled = isProcessing;
}

/**
 * Display processed idea
 * @param {Object} processedIdea - Processed idea data
 */
displayProcessedIdea(processedIdea) {
    if (!this.outputArea) return;
    
    this.currentIdea = processedIdea;
    const html = apiManager.formatProcessedIdeaForDisplay(processedIdea);
    
    this.outputArea.innerHTML = `
        <div class="result">
            ${html}
            <div class="controls">
                <button class="btn btn-primary" onclick="app.saveCurrentToBank()">
                    💾 Save to Ideas Bank
                </button>
                <button class="btn btn-secondary" onclick="app.copyCurrentResult()">
                    📋 Copy Result
                </button>
                <button class="btn btn-secondary" onclick="app.editCurrentResult()">
                    ✏️ Edit Result
                </button>
            </div>
        </div>
    `;
}

/**
 * Display error in output area
 * @param {string} error - Error message
 */
displayError(error) {
    if (!this.outputArea) return;
    
    this.outputArea.innerHTML = `
        <div class="error-state" style="text-align: center; padding: 2rem; color: var(--danger-color);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
            <h3>Processing Failed</h3>
            <p>${this.escapeHtml(error)}</p>
            <button class="btn btn-secondary" onclick="app.clearOutput()" style="margin-top: 1rem;">
                Try Again
            </button>
        </div>
    `;
}

/**
 * Save processed idea to storage
 * @param {Object} processedIdea - Processed idea data
 * @param {string} originalIdea - Original idea text
 */
saveProcessedIdea(processedIdea, originalIdea) {
    const ideaData = {
        title: processedIdea.title,
        originalIdea: originalIdea,
        processedResult: processedIdea.rawResponse || JSON.stringify(processedIdea),
        structured: processedIdea
    };
    
    storageManager.addIdea(ideaData);
    this.updateDisplay();
}

/**
 * Save current displayed idea to bank
 */
saveCurrentToBank() {
    if (!this.currentIdea) {
        this.showToast('No idea to save', 'warning');
        return;
    }
    
    const ideaData = {
        title: this.currentIdea.title,
        originalIdea: this.currentIdea.originalIdea,
        processedResult: this.currentIdea.rawResponse || JSON.stringify(this.currentIdea),
        structured: this.currentIdea
    };
    
    const success = storageManager.addIdea(ideaData);
    if (success) {
        this.showToast('Idea saved to bank!', 'success');
        this.updateDisplay();
    } else {
        this.showToast('Failed to save idea', 'error');
    }
}

/**
 * Copy current result to clipboard
 */
async copyCurrentResult() {
    if (!this.currentIdea) {
        this.showToast('No result to copy', 'warning');
        return;
    }
    
    try {
        const text = this.formatIdeaForCopy(this.currentIdea);
        await navigator.clipboard.writeText(text);
        this.showToast('Result copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        this.showToast('Failed to copy result', 'error');
    }
}

/**
 * Format idea for copying
 * @param {Object} idea - Idea object
 * @returns {string} Formatted text
 */
formatIdeaForCopy(idea) {
    let text = `# ${idea.title}\n\n`;
    text += `## Project Description\n${idea.description}\n\n`;
    
    if (idea.actionPlan && idea.actionPlan.length > 0) {
        text += `## Action Plan\n`;
        idea.actionPlan.forEach((step, index) => {
            text += `${index + 1}. ${step.description}\n`;
        });
        text += '\n';
    }
    
    if (idea.prerequisites && idea.prerequisites.length > 0) {
        text += `## Prerequisites\n`;
        idea.prerequisites.forEach(prereq => {
            text += `- ${prereq}\n`;
        });
        text += '\n';
    }
    
    text += `## Original Idea\n${idea.originalIdea}\n`;
    
    return text;
}

/**
 * Clear input area
 */
clearInput() {
    if (this.ideaInput) {
        this.ideaInput.value = '';
        this.updateCharCount();
        this.ideaInput.focus();
    }
}

/**
 * Clear output area
 */
clearOutput() {
    if (this.outputArea) {
        this.outputArea.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>Your structured project will appear here</h3>
                <p>Enter an idea and click "Process Idea" to get started</p>
            </div>
        `;
    }
    this.currentIdea = null;
}

/**
 * Toggle voice input
 */
toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        this.showToast('Voice recognition not supported in this browser', 'error');
        return;
    }
    
    if (this.isRecording) {
        this.stopVoiceRecording();
    } else {
        this.startVoiceRecording();
    }
}

/**
 * Start voice recording
 */
startVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onstart = () => {
        this.isRecording = true;
        if (this.voiceBtn) {
            this.voiceBtn.innerHTML = '🛑 Stop Recording';
            this.voiceBtn.classList.add('recording');
        }
        this.showToast('Listening... Speak your idea', 'info');
    };
    
    this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        if (this.ideaInput) {
            this.ideaInput.value = transcript;
            this.updateCharCount();
        }
    };
    
    this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.showToast(`Voice recognition error: ${event.error}`, 'error');
        this.stopVoiceRecording();
    };
    
    this.recognition.onend = () => {
        this.stopVoiceRecording();
    };
    
    try {
        this.recognition.start();
    } catch (error) {
        this.showToast('Failed to start voice recognition', 'error');
        this.stopVoiceRecording();
    }
}

/**
 * Stop voice recording
 */
stopVoiceRecording() {
    if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
    }
    
    this.isRecording = false;
    
    if (this.voiceBtn) {
        this.voiceBtn.innerHTML = '🎤 Voice Input';
        this.voiceBtn.classList.remove('recording');
    }
}

/**
 * Paste from clipboard
 */
async pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
            if (this.ideaInput) {
                this.ideaInput.value = text.trim();
                this.updateCharCount();
                this.ideaInput.focus();
            }
            this.showToast('Text pasted from clipboard', 'success');
        } else {
            this.showToast('Clipboard is empty', 'warning');
        }
    } catch (error) {
        console.error('Paste failed:', error);
        this.showToast('Failed to paste from clipboard', 'error');
    }
}

/**
 * Handle search input
 * @param {string} query - Search query
 */
handleSearch(query) {
    this.currentSearch = query.trim();
    this.currentPage = 1;
    this.updateIdeasDisplay();
}

/**
 * Handle sort change
 * @param {string} sortBy - Sort criteria
 */
handleSort(sortBy) {
    this.currentSort = sortBy;
    this.currentPage = 1;
    this.updateIdeasDisplay();
    
    // Save setting
    storageManager.saveSettings({ sortBy });
}

/**
 * Update main display
 */
updateDisplay() {
    this.updateStats();
    this.updateIdeasDisplay();
}

/**
 * Update statistics display
 */
updateStats() {
    const stats = storageManager.getStats();
    
    if (this.totalIdeas) this.totalIdeas.textContent = stats.totalIdeas;
    if (this.thisMonth) this.thisMonth.textContent = stats.thisMonth;
    if (this.avgLength) this.avgLength.textContent = stats.avgLength;
    if (this.totalWords) this.totalWords.textContent = stats.totalWords;
}

/**
 * Update ideas display
 */
updateIdeasDisplay() {
    let ideas = storageManager.getIdeas();
    
    // Apply search
    if (this.currentSearch) {
        ideas = storageManager.searchIdeas(this.currentSearch);
    }
    
    // Apply sort
    ideas = storageManager.sortIdeas(ideas, this.currentSort);
    
    // Calculate pagination
    const totalPages = Math.ceil(ideas.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageIdeas = ideas.slice(startIndex, endIndex);
    
    // Display ideas
    this.renderIdeas(pageIdeas);
    
    // Update pagination
    this.updatePagination(this.currentPage, totalPages, ideas.length);
}

/**
 * Render ideas in the container
 * @param {Array} ideas - Ideas to render
 */
renderIdeas(ideas) {
    if (!this.ideasContainer) return;
    
    if (ideas.length === 0) {
        this.ideasContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💡</div>
                <h3>${this.currentSearch ? 'No matching ideas found' : 'No ideas saved yet'}</h3>
                <p>${this.currentSearch ? 'Try a different search term' : 'Process your first idea above to get started!'}</p>
            </div>
        `;
        return;
    }
    
    const ideasHtml = ideas.map(idea => this.renderIdeaCard(idea)).join('');
    this.ideasContainer.innerHTML = ideasHtml;
}

/**
 * Render a single idea card
 * @param {Object} idea - Idea object
 * @returns {string} HTML string
 */
renderIdeaCard(idea) {
    const title = this.extractTitle(idea) || 'Untitled Idea';
    const preview = this.truncateText(idea.originalIdea, 100);
    const wordCount = (idea.originalIdea || '').split(/\s+/).length;
    
    return `
        <div class="idea-card" data-id="${idea.id}">
            <h4>${this.escapeHtml(title)}</h4>
            <p><strong>Original:</strong> ${this.escapeHtml(preview)}</p>
            <div class="idea-meta">
                <span>${idea.created || 'Unknown date'}</span>
                <span>${wordCount} words</span>
            </div>
            <div class="idea-actions">
                <button class="btn btn-secondary btn-small" onclick="app.viewIdea(${idea.id})">
                    👁️ View
                </button>
                <button class="btn btn-secondary btn-small" onclick="app.copyIdea(${idea.id})">
                    📋 Copy
                </button>
                <button class="btn btn-secondary btn-small" onclick="app.editIdea(${idea.id})">
                    ✏️ Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="app.deleteIdea(${idea.id})">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

/**
 * Extract title from idea
 * @param {Object} idea - Idea object
 * @returns {string} Extracted title
 */
extractTitle(idea) {
    if (idea.title) return idea.title;
    if (idea.structured?.title) return idea.structured.title;
    
    // Try to extract from processed result
    if (idea.processedResult) {
        const match = idea.processedResult.match(/\*\*Project Title:\*\*\s*(.*?)(?:\n|$)/i);
        if (match) return match[1].trim();
    }
    
    // Fallback to first few words of original idea
    const words = (idea.originalIdea || '').split(/\s+/).slice(0, 5);
    return words.join(' ') + (words.length === 5 ? '...' : '');
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated text
 */
truncateText(text, length) {
    if (!text || text.length <= length) return text || '';
    return text.substring(0, length) + '...';
}

/**
 * Update pagination display
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total pages
 * @param {number} totalItems - Total items
 */
updatePagination(currentPage, totalPages, totalItems) {
    if (!this.pagination) return;
    
    if (totalPages <= 1) {
        this.pagination.style.display = 'none';
        return;
    }
    
    this.pagination.style.display = 'flex';
    
    if (this.prevPage) {
        this.prevPage.disabled = currentPage <= 1;
    }
    
    if (this.nextPage) {
        this.nextPage.disabled = currentPage >= totalPages;
    }
    
    if (this.pageInfo) {
        this.pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalItems} items)`;
    }
}

/**
 * Change page
 * @param {number} direction - Direction to change (-1 or 1)
 */
changePage(direction) {
    const ideas = this.currentSearch ? 
        storageManager.searchIdeas(this.currentSearch) : 
        storageManager.getIdeas();
    const totalPages = Math.ceil(ideas.length / this.itemsPerPage);
    
    const newPage = this.currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        this.currentPage = newPage;
        this.updateIdeasDisplay();
    }
}

/**
 * View idea in modal
 * @param {number} id - Idea ID
 */
viewIdea(id) {
    const idea = storageManager.getIdeaById(id);
    if (!idea) {
        this.showToast('Idea not found', 'error');
        return;
    }
    
    this.openIdeaModal(idea);
}

/**
 * Open idea modal
 * @param {Object} idea - Idea object
 */
openIdeaModal(idea) {
    if (!this.ideaModal) return;
    
    this.currentIdea = idea;
    
    if (this.modalTitle) {
        this.modalTitle.textContent = this.extractTitle(idea);
    }
    
    if (this.modalBody) {
        let content = '';
        
        if (idea.structured) {
            content = apiManager.formatProcessedIdeaForDisplay(idea.structured);
        } else if (idea.processedResult) {
            content = `<div class="result-section"><pre>${this.escapeHtml(idea.processedResult)}</pre></div>`;
        } else {
            content = `<div class="result-section"><h3>Original Idea</h3><p>${this.escapeHtml(idea.originalIdea)}</p></div>`;
        }
        
        this.modalBody.innerHTML = content;
    }
    
    this.ideaModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Close idea modal
 */
closeIdeaModal() {
    if (this.ideaModal) {
        this.ideaModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    this.currentIdea = null;
}

/**
 * Copy idea to clipboard
 * @param {number} id - Idea ID
 */
async copyIdea(id) {
    const idea = storageManager.getIdeaById(i
```
