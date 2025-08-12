/**

- API Manager - Handles all external API communications
- Currently supports OpenAI GPT models with extensible architecture
  */

class APIManager {
constructor() {
this.apiEndpoints = {
openai: ‘https://api.openai.com/v1/chat/completions’,
anthropic: ‘https://api.anthropic.com/v1/messages’,
// Add more endpoints as needed
};

```
    this.defaultModels = {
        openai: 'gpt-3.5-turbo',
        anthropic: 'claude-3-sonnet-20240229'
    };
    
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    
    this.systemPrompt = this.createSystemPrompt();
}

/**
 * Create the system prompt for idea processing
 * @returns {string} System prompt
 */
createSystemPrompt() {
    return `You are an AI assistant that helps structure raw ideas into comprehensive project plans.
```

Your task is to take a raw idea and break it down into exactly 4 sections with specific formatting:

**Project Title:** [A clear, engaging title that captures the essence of the idea]

**Project Description:** [A comprehensive description of what the project aims to achieve, its purpose, target audience, and key features. This should be 2-3 detailed sentences.]

**Five-Point Action Plan:**

1. [First specific, actionable step]
1. [Second specific, actionable step]
1. [Third specific, actionable step]
1. [Fourth specific, actionable step]
1. [Fifth specific, actionable step]

**Prerequisites:**

- [Tool, resource, or skill needed]
- [Another prerequisite]
- [Another prerequisite]

**Original Idea:** [The exact original text provided for comparison]

Important formatting requirements:

- Use the exact section headers shown above with ** markdown formatting
- Keep the action plan as a numbered list
- Keep prerequisites as a bulleted list with dashes
- Be specific and actionable in your recommendations
- Ensure each section is clearly separated

The response should be well-structured, professional, and immediately actionable.`;
}

```
/**
 * Process an idea using OpenAI API
 * @param {string} idea - The raw idea text
 * @param {string} apiKey - OpenAI API key
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Processed result
 */
async processIdeaWithOpenAI(idea, apiKey, options = {}) {
    const {
        model = this.defaultModels.openai,
        temperature = 0.7,
        maxTokens = 1500,
        timeout = 30000
    } = options;

    if (!idea || !idea.trim()) {
        throw new Error('Idea text is required');
    }

    if (!apiKey || !apiKey.trim()) {
        throw new Error('API key is required');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(this.apiEndpoints.openai, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: this.systemPrompt
                    },
                    {
                        role: 'user',
                        content: `Please process this idea: "${idea.trim()}"`
                    }
                ],
                max_tokens: maxTokens,
                temperature: temperature,
                stream: false
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(this.parseOpenAIError(response.status, errorData));
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI API');
        }

        const processedContent = data.choices[0].message.content;
        const parsedResult = this.parseProcessedIdea(processedContent, idea);

        return {
            success: true,
            data: parsedResult,
            usage: data.usage,
            model: model,
            provider: 'openai'
        };

    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        
        throw error;
    }
}

/**
 * Process idea with retry logic
 * @param {string} idea - The raw idea text
 * @param {string} apiKey - API key
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Processed result
 */
async processIdeaWithRetry(idea, apiKey, options = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
            const result = await this.processIdeaWithOpenAI(idea, apiKey, options);
            return result;
        } catch (error) {
            lastError = error;
            
            // Don't retry on client errors (4xx)
            if (error.message.includes('Invalid API key') || 
                error.message.includes('quota exceeded') ||
                error.message.includes('rate limit')) {
                throw error;
            }
            
            if (attempt < this.maxRetries) {
                console.warn(`API call failed (attempt ${attempt}/${this.maxRetries}):`, error.message);
                await this.delay(this.retryDelay * attempt);
            }
        }
    }
    
    throw lastError;
}

/**
 * Parse OpenAI API errors into user-friendly messages
 * @param {number} status - HTTP status code
 * @param {Object} errorData - Error response data
 * @returns {string} User-friendly error message
 */
parseOpenAIError(status, errorData) {
    const errorCode = errorData.error?.code;
    const errorMessage = errorData.error?.message || 'Unknown error';

    switch (status) {
        case 401:
            return 'Invalid API key. Please check your OpenAI API key and try again.';
            
        case 402:
            return 'You have exceeded your OpenAI API quota. Please check your billing details.';
            
        case 429:
            if (errorCode === 'rate_limit_exceeded') {
                return 'Rate limit exceeded. Please wait a moment and try again.';
            }
            return 'Too many requests. Please wait a moment and try again.';
            
        case 400:
            if (errorMessage.includes('maximum context length')) {
                return 'Your idea is too long. Please try with a shorter description.';
            }
            return `Request error: ${errorMessage}`;
            
        case 500:
        case 502:
        case 503:
        case 504:
            return 'OpenAI service is temporarily unavailable. Please try again in a moment.';
            
        default:
            return `API Error (${status}): ${errorMessage}`;
    }
}

/**
 * Parse the processed idea response into structured data
 * @param {string} content - Raw API response content
 * @param {string} originalIdea - Original idea text
 * @returns {Object} Parsed idea structure
 */
parseProcessedIdea(content, originalIdea) {
    const result = {
        title: '',
        description: '',
        actionPlan: [],
        prerequisites: [],
        originalIdea: originalIdea,
        rawResponse: content
    };

    try {
        // Extract title
        const titleMatch = content.match(/\*\*Project Title:\*\*\s*(.*?)(?:\n|$)/i);
        if (titleMatch) {
            result.title = titleMatch[1].trim();
        }

        // Extract description
        const descMatch = content.match(/\*\*Project Description:\*\*\s*((?:(?!\*\*).)*)/is);
        if (descMatch) {
            result.description = descMatch[1].trim();
        }

        // Extract action plan
        const actionMatch = content.match(/\*\*Five-Point Action Plan:\*\*\s*((?:(?!\*\*Prerequisites)(?!\*\*Original).)*)/is);
        if (actionMatch) {
            const actionText = actionMatch[1].trim();
            const actionItems = actionText.split(/\n\d+\./).filter(item => item.trim());
            
            result.actionPlan = actionItems.map((item, index) => {
                let cleanItem = item.replace(/^\d+\.\s*/, '').trim();
                return {
                    step: index + 1,
                    description: cleanItem
                };
            }).filter(item => item.description);
        }

        // Extract prerequisites
        const prereqMatch = content.match(/\*\*Prerequisites:\*\*\s*((?:(?!\*\*Original).)*)/is);
        if (prereqMatch) {
            const prereqText = prereqMatch[1].trim();
            const prereqItems = prereqText.split(/\n-/).filter(item => item.trim());
            
            result.prerequisites = prereqItems.map(item => 
                item.replace(/^-\s*/, '').trim()
            ).filter(item => item);
        }

        // Fallback: try to extract any numbered list for action plan
        if (result.actionPlan.length === 0) {
            const numberedItems = content.match(/\d+\.\s*(.+)/g);
            if (numberedItems) {
                result.actionPlan = numberedItems.slice(0, 5).map((item, index) => ({
                    step: index + 1,
                    description: item.replace(/^\d+\.\s*/, '').trim()
                }));
            }
        }

        // Fallback: try to extract any bulleted list for prerequisites
        if (result.prerequisites.length === 0) {
            const bulletItems = content.match(/[-•]\s*(.+)/g);
            if (bulletItems) {
                result.prerequisites = bulletItems.map(item => 
                    item.replace(/^[-•]\s*/, '').trim()
                );
            }
        }

    } catch (error) {
        console.warn('Error parsing processed idea:', error);
        // Return basic structure with raw content if parsing fails
        result.description = content;
    }

    return result;
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @param {string} provider - API provider
 * @returns {Object} Validation result
 */
validateApiKey(apiKey, provider = 'openai') {
    if (!apiKey || typeof apiKey !== 'string') {
        return {
            valid: false,
            error: 'API key is required'
        };
    }

    const key = apiKey.trim();

    switch (provider) {
        case 'openai':
            if (!key.startsWith('sk-')) {
                return {
                    valid: false,
                    error: 'OpenAI API key must start with "sk-"'
                };
            }
            if (key.length < 20) {
                return {
                    valid: false,
                    error: 'OpenAI API key appears to be too short'
                };
            }
            break;
            
        case 'anthropic':
            if (!key.startsWith('sk-ant-')) {
                return {
                    valid: false,
                    error: 'Anthropic API key must start with "sk-ant-"'
                };
            }
            break;
            
        default:
            // Generic validation for unknown providers
            if (key.length < 10) {
                return {
                    valid: false,
                    error: 'API key appears to be too short'
                };
            }
    }

    return {
        valid: true,
        error: null
    };
}

/**
 * Test API key by making a simple request
 * @param {string} apiKey - API key to test
 * @param {string} provider - API provider
 * @returns {Promise<Object>} Test result
 */
async testApiKey(apiKey, provider = 'openai') {
    const validation = this.validateApiKey(apiKey, provider);
    if (!validation.valid) {
        return {
            valid: false,
            error: validation.error
        };
    }

    try {
        const testIdea = 'Create a simple mobile app';
        const result = await this.processIdeaWithOpenAI(testIdea, apiKey, {
            maxTokens: 100,
            timeout: 10000
        });

        return {
            valid: true,
            error: null,
            model: result.model
        };

    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Get available models for a provider
 * @param {string} provider - API provider
 * @returns {Array} Available models
 */
getAvailableModels(provider = 'openai') {
    switch (provider) {
        case 'openai':
            return [
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
                { id: 'gpt-4', name: 'GPT-4', description: 'More capable, slower' },
                { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'Latest GPT-4 model' }
            ];
            
        case 'anthropic':
            return [
                { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' }
            ];
            
        default:
            return [];
    }
}

/**
 * Estimate API cost for a request
 * @param {string} provider - API provider
 * @param {string} model - Model name
 * @param {number} inputTokens - Estimated input tokens
 * @param {number} outputTokens - Estimated output tokens
 * @returns {number} Estimated cost in USD
 */
estimateCost(provider, model, inputTokens, outputTokens) {
    // Pricing as of 2024 (these should be updated regularly)
    const pricing = {
        openai: {
            'gpt-3.5-turbo': { input: 0.0010, output: 0.0020 }, // per 1K tokens
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }
        }
    };

    const modelPricing = pricing[provider]?.[model];
    if (!modelPricing) {
        return null;
    }

    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
}

/**
 * Estimate tokens in text (rough approximation)
 * @param {string} text - Text to analyze
 * @returns {number} Estimated token count
 */
estimateTokens(text) {
    if (!text || typeof text !== 'string') {
        return 0;
    }
    
    // Rough approximation: 4 characters = 1 token
    // This is approximate and varies by language and content
    return Math.ceil(text.length / 4);
}

/**
 * Format processed idea for display
 * @param {Object} processedIdea - Processed idea object
 * @returns {string} Formatted HTML string
 */
formatProcessedIdeaForDisplay(processedIdea) {
    const {
        title = 'Untitled Project',
        description = '',
        actionPlan = [],
        prerequisites = [],
        originalIdea = ''
    } = processedIdea;

    let html = '';

    // Title and Description
    html += `
        <div class="result-section">
            <h3>🎯 ${this.escapeHtml(title)}</h3>
            <p>${this.escapeHtml(description)}</p>
        </div>
    `;

    // Action Plan
    if (actionPlan.length > 0) {
        html += `
            <div class="result-section">
                <h3>🗺️ Five-Point Action Plan</h3>
                <ol>
        `;
        
        actionPlan.forEach(step => {
            html += `<li>${this.escapeHtml(step.description)}</li>`;
        });
        
        html += `</ol>`;
        
        // Prerequisites
        if (prerequisites.length > 0) {
            html += `<h4>📋 Prerequisites</h4><ul>`;
            prerequisites.forEach(prereq => {
                html += `<li>${this.escapeHtml(prereq)}</li>`;
            });
            html += `</ul>`;
        }
        
        html += `</div>`;
    }

    // Original Idea
    html += `
        <div class="result-section">
            <h3>💭 Original Idea</h3>
            <p><em>${this.escapeHtml(originalIdea)}</em></p>
        </div>
    `;

    return html;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Delay helper for retries
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get API status and health check
 * @param {string} provider - API provider
 * @returns {Promise<Object>} API status
 */
async getApiStatus(provider = 'openai') {
    try {
        // This could be expanded to check actual API status endpoints
        return {
            provider,
            status: 'unknown',
            message: 'Status check not implemented for this provider'
        };
    } catch (error) {
        return {
            provider,
            status: 'error',
            message: error.message
        };
    }
}
```

}

// Create global API manager instance
window.apiManager = new APIManager();