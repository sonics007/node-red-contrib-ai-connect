module.exports = function(RED) {
    function PerplexityConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Store provider selection
        this.provider = config.provider || 'perplexity';

        // Store all API keys from credentials
        this.apiKeys = {
            perplexity: this.credentials.perplexityApiKey,
            claude: this.credentials.claudeApiKey,
            gemini: this.credentials.geminiApiKey,
            grok: this.credentials.grokApiKey,
            deepseek: this.credentials.deepseekApiKey,
            openai: this.credentials.openaiApiKey
        };

        /**
         * Get API key for the configured provider
         */
        this.getApiKey = function(provider) {
            const targetProvider = provider || node.provider;
            const apiKey = node.apiKeys[targetProvider];

            if (!apiKey) {
                throw new Error(`API key pre ${targetProvider} nie je nakonfigurovaný. Prosím nastavte ho v konfigurácii.`);
            }
            return apiKey;
        };

        /**
         * Get provider
         */
        this.getProvider = function() {
            return node.provider;
        };

        /**
         * Validate API key format for specific provider
         */
        this.validateApiKey = function(provider) {
            const targetProvider = provider || node.provider;
            const apiKey = node.apiKeys[targetProvider];

            if (!apiKey) {
                return { valid: false, error: `API key pre ${targetProvider} nie je nastavený` };
            }

            // Basic validation - check if it's not empty
            if (apiKey.trim().length === 0) {
                return { valid: false, error: 'API key nemôže byť prázdny' };
            }

            return { valid: true };
        };
    }

    RED.nodes.registerType("ai-config", PerplexityConfigNode, {
        credentials: {
            perplexityApiKey: { type: "password" },
            claudeApiKey: { type: "password" },
            geminiApiKey: { type: "password" },
            grokApiKey: { type: "password" },
            deepseekApiKey: { type: "password" },
            openaiApiKey: { type: "password" }
        }
    });

    // Spätná kompatibilita - starý názov
    RED.nodes.registerType("perplexity-config", PerplexityConfigNode, {
        credentials: {
            perplexityApiKey: { type: "password" },
            claudeApiKey: { type: "password" },
            geminiApiKey: { type: "password" },
            grokApiKey: { type: "password" },
            deepseekApiKey: { type: "password" },
            openaiApiKey: { type: "password" }
        }
    });

    // HTTP endpoint pre validáciu API kľúča
    RED.httpAdmin.post('/ai-config/validate-key', async function(req, res) {
        const axios = require('axios');
        const { apiKey, provider } = req.body;

        if (!apiKey || !provider) {
            return res.json({
                valid: false,
                error: 'API kľúč a poskytovateľ sú povinné'
            });
        }

        // API endpoints pre rôznych poskytovateľov
        const endpoints = {
            perplexity: 'https://api.perplexity.ai/chat/completions',
            claude: 'https://api.anthropic.com/v1/messages',
            gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
            grok: 'https://api.x.ai/v1/chat/completions',
            deepseek: 'https://api.deepseek.com/chat/completions',
            openai: 'https://api.openai.com/v1/chat/completions'
        };

        const endpoint = endpoints[provider];
        if (!endpoint) {
            return res.json({
                valid: false,
                error: `Nepodporovaný poskytovateľ: ${provider}`
            });
        }

        try {
            // Test request pre každého poskytovateľa
            if (provider === 'perplexity' || provider === 'grok' || provider === 'deepseek' || provider === 'openai') {
                const modelMap = {
                    perplexity: 'sonar',
                    grok: 'grok-beta',
                    deepseek: 'deepseek-chat',
                    openai: 'gpt-4o-mini'
                };
                await axios.post(endpoint, {
                    model: modelMap[provider],
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 10
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
            } else if (provider === 'claude') {
                await axios.post(endpoint, {
                    model: 'claude-3-haiku-20240307',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                }, {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    }
                });
            } else if (provider === 'gemini') {
                await axios.get(`${endpoint}?key=${apiKey}`);
            }

            res.json({ valid: true, message: 'API kľúč je platný' });
        } catch (error) {
            let errorMessage = 'Neplatný API kľúč';

            if (error.response) {
                const errorData = error.response.data;

                // Grok - check for credits error
                if (provider === 'grok' && errorData && errorData.error) {
                    if (errorData.error.includes('credits') || errorData.error.includes('permission')) {
                        errorMessage = `Grok API vyžaduje kredity. ${errorData.error}`;
                    } else {
                        errorMessage = `Grok API: ${errorData.error}`;
                    }
                } else if (error.response.status === 401) {
                    errorMessage = 'Neplatný API kľúč (401 Unauthorized)';
                } else if (error.response.status === 403) {
                    if (provider === 'grok') {
                        errorMessage = 'Prístup zamietnutý (403) - Grok API pravdepodobne nemá kredity';
                    } else {
                        errorMessage = 'Prístup zamietnutý (403 Forbidden)';
                    }
                } else if (error.response.status === 429) {
                    errorMessage = 'Príliš veľa požiadaviek - API kľúč je platný ale limit bol dosiahnutý';
                } else {
                    errorMessage = `Chyba: ${error.response.status} - ${error.response.statusText}`;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            res.json({
                valid: false,
                error: errorMessage
            });
        }
    });

    // Spätná kompatibilita - starý endpoint
    RED.httpAdmin.post('/perplexity-config/validate-key', async function(req, res) {
        const axios = require('axios');
        const { apiKey, provider } = req.body;

        if (!apiKey || !provider) {
            return res.json({
                valid: false,
                error: 'API kľúč a poskytovateľ sú povinné'
            });
        }

        const endpoints = {
            perplexity: 'https://api.perplexity.ai/chat/completions',
            claude: 'https://api.anthropic.com/v1/messages',
            gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
            grok: 'https://api.x.ai/v1/chat/completions',
            deepseek: 'https://api.deepseek.com/chat/completions',
            openai: 'https://api.openai.com/v1/chat/completions'
        };

        const endpoint = endpoints[provider];
        if (!endpoint) {
            return res.json({
                valid: false,
                error: `Nepodporovaný poskytovateľ: ${provider}`
            });
        }

        try {
            if (provider === 'perplexity' || provider === 'grok' || provider === 'deepseek' || provider === 'openai') {
                const modelMap = {
                    perplexity: 'sonar',
                    grok: 'grok-beta',
                    deepseek: 'deepseek-chat',
                    openai: 'gpt-4o-mini'
                };
                await axios.post(endpoint, {
                    model: modelMap[provider],
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 10
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
            } else if (provider === 'claude') {
                await axios.post(endpoint, {
                    model: 'claude-3-haiku-20240307',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                }, {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    }
                });
            } else if (provider === 'gemini') {
                await axios.get(`${endpoint}?key=${apiKey}`);
            }

            res.json({ valid: true, message: 'API kľúč je platný' });
        } catch (error) {
            let errorMessage = 'Neplatný API kľúč';

            if (error.response) {
                const errorData = error.response.data;

                // Grok - check for credits error
                if (provider === 'grok' && errorData && errorData.error) {
                    if (errorData.error.includes('credits') || errorData.error.includes('permission')) {
                        errorMessage = `Grok API vyžaduje kredity. ${errorData.error}`;
                    } else {
                        errorMessage = `Grok API: ${errorData.error}`;
                    }
                } else if (error.response.status === 401) {
                    errorMessage = 'Neplatný API kľúč (401 Unauthorized)';
                } else if (error.response.status === 403) {
                    if (provider === 'grok') {
                        errorMessage = 'Prístup zamietnutý (403) - Grok API pravdepodobne nemá kredity';
                    } else {
                        errorMessage = 'Prístup zamietnutý (403 Forbidden)';
                    }
                } else if (error.response.status === 429) {
                    errorMessage = 'Príliš veľa požiadaviek - API kľúč je platný ale limit bol dosiahnutý';
                } else {
                    errorMessage = `Chyba: ${error.response.status} - ${error.response.statusText}`;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            res.json({
                valid: false,
                error: errorMessage
            });
        }
    });
};
