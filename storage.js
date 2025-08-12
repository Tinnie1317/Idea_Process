/**

- Storage Manager - Handles all local storage operations
- Provides a centralized way to manage data persistence
  */

class StorageManager {
constructor() {
this.storageKeys = {
IDEAS: ‘ai_ideas_processor_ideas’,
API_KEY: ‘ai_ideas_processor_api_key’,
SETTINGS: ‘ai_ideas_processor_settings’,
STATS: ‘ai_ideas_processor_stats’
};

```
    this.defaultSettings = {
        theme: 'light',
        autoSave: true,
        sortBy: 'newest',
        itemsPerPage: 10,
        showStats: true,
        enableNotifications: true
    };
    
    this.init();
}

/**
 * Initialize storage manager
 */
init() {
    try {
        // Test if localStorage is available
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (error) {
        console.warn('localStorage not available, using memory storage');
        this.useMemoryStorage = true;
        this.memoryStorage = {};
    }
}

/**
 * Get item from storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Stored value or default
 */
getItem(key, defaultValue = null) {
    try {
        if (this.useMemoryStorage) {
            return this.memoryStorage[key] || defaultValue;
        }
        
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error getting item from storage:', error);
        return defaultValue;
    }
}

/**
 * Set item in storage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
setItem(key, value) {
    try {
        if (this.useMemoryStorage) {
            this.memoryStorage[key] = value;
            return true;
        }
        
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error setting item in storage:', error);
        return false;
    }
}

/**
 * Remove item from storage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
removeItem(key) {
    try {
        if (this.useMemoryStorage) {
            delete this.memoryStorage[key];
            return true;
        }
        
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing item from storage:', error);
        return false;
    }
}

/**
 * Clear all storage
 * @returns {boolean} Success status
 */
clear() {
    try {
        if (this.useMemoryStorage) {
            this.memoryStorage = {};
            return true;
        }
        
        // Only clear our app's data
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}

/**
 * Get all ideas from storage
 * @returns {Array} Array of ideas
 */
getIdeas() {
    const ideas = this.getItem(this.storageKeys.IDEAS, []);
    return Array.isArray(ideas) ? ideas : [];
}

/**
 * Save ideas to storage
 * @param {Array} ideas - Array of ideas to save
 * @returns {boolean} Success status
 */
saveIdeas(ideas) {
    if (!Array.isArray(ideas)) {
        console.error('Ideas must be an array');
        return false;
    }
    
    return this.setItem(this.storageKeys.IDEAS, ideas);
}

/**
 * Add a new idea
 * @param {Object} idea - Idea object to add
 * @returns {boolean} Success status
 */
addIdea(idea) {
    try {
        const ideas = this.getIdeas();
        const newIdea = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            created: new Date().toLocaleDateString(),
            ...idea
        };
        
        ideas.unshift(newIdea);
        const success = this.saveIdeas(ideas);
        
        if (success) {
            this.updateStats();
        }
        
        return success;
    } catch (error) {
        console.error('Error adding idea:', error);
        return false;
    }
}

/**
 * Update an existing idea
 * @param {number} id - Idea ID
 * @param {Object} updates - Updates to apply
 * @returns {boolean} Success status
 */
updateIdea(id, updates) {
    try {
        const ideas = this.getIdeas();
        const index = ideas.findIndex(idea => idea.id === id);
        
        if (index === -1) {
            console.error('Idea not found:', id);
            return false;
        }
        
        ideas[index] = {
            ...ideas[index],
            ...updates,
            lastModified: new Date().toISOString()
        };
        
        return this.saveIdeas(ideas);
    } catch (error) {
        console.error('Error updating idea:', error);
        return false;
    }
}

/**
 * Delete an idea
 * @param {number} id - Idea ID to delete
 * @returns {boolean} Success status
 */
deleteIdea(id) {
    try {
        const ideas = this.getIdeas();
        const filteredIdeas = ideas.filter(idea => idea.id !== id);
        
        if (filteredIdeas.length === ideas.length) {
            console.error('Idea not found:', id);
            return false;
        }
        
        const success = this.saveIdeas(filteredIdeas);
        
        if (success) {
            this.updateStats();
        }
        
        return success;
    } catch (error) {
        console.error('Error deleting idea:', error);
        return false;
    }
}

/**
 * Get a specific idea by ID
 * @param {number} id - Idea ID
 * @returns {Object|null} Idea object or null if not found
 */
getIdeaById(id) {
    const ideas = this.getIdeas();
    return ideas.find(idea => idea.id === id) || null;
}

/**
 * Search ideas
 * @param {string} query - Search query
 * @param {Array} fields - Fields to search in
 * @returns {Array} Filtered ideas
 */
searchIdeas(query, fields = ['title', 'originalIdea', 'processedResult']) {
    const ideas = this.getIdeas();
    
    if (!query || !query.trim()) {
        return ideas;
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    return ideas.filter(idea => {
        return fields.some(field => {
            const value = idea[field];
            if (typeof value === 'string') {
                return value.toLowerCase().includes(searchTerm);
            }
            return false;
        });
    });
}

/**
 * Sort ideas
 * @param {Array} ideas - Ideas to sort
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted ideas
 */
sortIdeas(ideas, sortBy = 'newest') {
    const sortedIdeas = [...ideas];
    
    switch (sortBy) {
        case 'newest':
            return sortedIdeas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
        case 'oldest':
            return sortedIdeas.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
        case 'title':
            return sortedIdeas.sort((a, b) => {
                const titleA = (a.title || a.originalIdea || '').toLowerCase();
                const titleB = (b.title || b.originalIdea || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
            
        case 'length':
            return sortedIdeas.sort((a, b) => {
                const lengthA = (a.originalIdea || '').length;
                const lengthB = (b.originalIdea || '').length;
                return lengthB - lengthA;
            });
            
        default:
            return sortedIdeas;
    }
}

/**
 * Get API key from storage
 * @returns {string|null} API key or null
 */
getApiKey() {
    return this.getItem(this.storageKeys.API_KEY);
}

/**
 * Save API key to storage
 * @param {string} apiKey - API key to save
 * @returns {boolean} Success status
 */
saveApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return this.removeItem(this.storageKeys.API_KEY);
    }
    
    return this.setItem(this.storageKeys.API_KEY, apiKey.trim());
}

/**
 * Get user settings
 * @returns {Object} User settings
 */
getSettings() {
    const settings = this.getItem(this.storageKeys.SETTINGS, {});
    return { ...this.defaultSettings, ...settings };
}

/**
 * Save user settings
 * @param {Object} settings - Settings to save
 * @returns {boolean} Success status
 */
saveSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        console.error('Settings must be an object');
        return false;
    }
    
    const currentSettings = this.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    
    return this.setItem(this.storageKeys.SETTINGS, newSettings);
}

/**
 * Get app statistics
 * @returns {Object} Statistics object
 */
getStats() {
    return this.getItem(this.storageKeys.STATS, {
        totalIdeas: 0,
        thisMonth: 0,
        totalWords: 0,
        avgLength: 0,
        lastUpdated: null
    });
}

/**
 * Update statistics
 */
updateStats() {
    try {
        const ideas = this.getIdeas();
        const now = new Date();
        const thisMonth = ideas.filter(idea => {
            const ideaDate = new Date(idea.timestamp);
            return ideaDate.getMonth() === now.getMonth() && 
                   ideaDate.getFullYear() === now.getFullYear();
        });

        const totalWords = ideas.reduce((sum, idea) => {
            const text = (idea.originalIdea || '') + ' ' + (idea.processedResult || '');
            return sum + text.split(/\s+/).length;
        }, 0);

        const avgLength = ideas.length > 0 
            ? Math.round(ideas.reduce((sum, idea) => 
                sum + (idea.originalIdea || '').length, 0) / ideas.length)
            : 0;

        const stats = {
            totalIdeas: ideas.length,
            thisMonth: thisMonth.length,
            totalWords,
            avgLength,
            lastUpdated: new Date().toISOString()
        };

        this.setItem(this.storageKeys.STATS, stats);
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

/**
 * Export all data
 * @returns {Object} All app data
 */
exportData() {
    try {
        return {
            ideas: this.getIdeas(),
            settings: this.getSettings(),
            stats: this.getStats(),
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
    } catch (error) {
        console.error('Error exporting data:', error);
        return null;
    }
}

/**
 * Import data
 * @param {Object} data - Data to import
 * @param {boolean} merge - Whether to merge with existing data
 * @returns {Object} Import result
 */
importData(data, merge = false) {
    try {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }

        const result = {
            success: false,
            imported: 0,
            errors: []
        };

        // Import ideas
        if (Array.isArray(data.ideas)) {
            let existingIdeas = merge ? this.getIdeas() : [];
            const newIdeas = data.ideas.filter(idea => 
                idea && typeof idea === 'object'
            );

            if (merge) {
                // Avoid duplicates when merging
                const existingIds = new Set(existingIdeas.map(idea => idea.id));
                const uniqueNewIdeas = newIdeas.filter(idea => 
                    !existingIds.has(idea.id)
                );
                existingIdeas = [...uniqueNewIdeas, ...existingIdeas];
            } else {
                existingIdeas = newIdeas;
            }

            this.saveIdeas(existingIdeas);
            result.imported = newIdeas.length;
        }

        // Import settings
        if (data.settings && typeof data.settings === 'object') {
            const currentSettings = merge ? this.getSettings() : this.defaultSettings;
            this.saveSettings({ ...currentSettings, ...data.settings });
        }

        // Update stats
        this.updateStats();

        result.success = true;
        return result;

    } catch (error) {
        console.error('Error importing data:', error);
        return {
            success: false,
            imported: 0,
            errors: [error.message]
        };
    }
}

/**
 * Get storage usage info
 * @returns {Object} Storage usage information
 */
getStorageInfo() {
    try {
        if (this.useMemoryStorage) {
            return {
                type: 'memory',
                available: true,
                size: JSON.stringify(this.memoryStorage).length
            };
        }

        const totalSize = Object.values(this.storageKeys)
            .reduce((size, key) => {
                const item = localStorage.getItem(key);
                return size + (item ? item.length : 0);
            }, 0);

        return {
            type: 'localStorage',
            available: true,
            size: totalSize,
            quota: this.getStorageQuota()
        };

    } catch (error) {
        return {
            type: 'unknown',
            available: false,
            error: error.message
        };
    }
}

/**
 * Get storage quota (estimate)
 * @returns {number} Estimated storage quota in bytes
 */
getStorageQuota() {
    try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                return estimate.quota;
            });
        }
        // Fallback estimate (most browsers allow 5-10MB for localStorage)
        return 5 * 1024 * 1024; // 5MB
    } catch (error) {
        return 5 * 1024 * 1024; // 5MB fallback
    }
}

/**
 * Create backup
 * @returns {string} Backup data as JSON string
 */
createBackup() {
    try {
        const backupData = {
            ...this.exportData(),
            backupType: 'full',
            appName: 'AI Ideas Processor'
        };
        
        return JSON.stringify(backupData, null, 2);
    } catch (error) {
        console.error('Error creating backup:', error);
        return null;
    }
}

/**
 * Restore from backup
 * @param {string} backupString - Backup JSON string
 * @returns {Object} Restore result
 */
restoreBackup(backupString) {
    try {
        const backupData = JSON.parse(backupString);
        
        if (!backupData.appName || backupData.appName !== 'AI Ideas Processor') {
            throw new Error('Invalid backup file');
        }
        
        return this.importData(backupData, false);
    } catch (error) {
        console.error('Error restoring backup:', error);
        return {
            success: false,
            imported: 0,
            errors: [error.message]
        };
    }
}
```

}

// Create global storage manager instance
window.storageManager = new StorageManager();