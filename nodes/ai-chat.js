module.exports = function(RED) {
    const axios = require('axios');

    function PerplexityChatNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.config = RED.nodes.getNode(config.config);
        this.provider = config.provider || 'perplexity';
        this.model = config.model || 'sonar';
        this.maxTokens = parseInt(config.maxTokens) || 1024;
        this.temperature = parseFloat(config.temperature) || 0.7;
        this.systemPrompt = config.systemPrompt || '';
        this.webSearch = config.webSearch !== false; // default true
        this.searchDomainFilter = config.searchDomainFilter || '';
        this.searchRecencyFilter = config.searchRecencyFilter || '';

        // Initialize token usage tracking
        this.tokenUsage = {
            total: { input: 0, output: 0, total: 0 },
            lastRequest: null,
            requestCount: 0,
            startTime: Date.now()
        };

        if (!this.config) {
            this.error("Chýba AI konfigurácia");
            return;
        }

        // API handlers for different providers
        const apiHandlers = {
            perplexity: async (messages, apiKey) => {
                const requestData = {
                    model: node.model,
                    messages: messages
                };

                if (node.maxTokens) requestData.max_tokens = node.maxTokens;
                if (node.temperature !== undefined) requestData.temperature = node.temperature;

                // Add web search options if enabled
                if (node.webSearch) {
                    const webSearchOptions = {};
                    if (node.searchDomainFilter) {
                        webSearchOptions.search_domain_filter =
                            node.searchDomainFilter.split(',').map(d => d.trim()).filter(d => d);
                    }
                    if (node.searchRecencyFilter) {
                        webSearchOptions.search_recency_filter = node.searchRecencyFilter;
                    }
                    if (Object.keys(webSearchOptions).length > 0) {
                        requestData.web_search_options = webSearchOptions;
                    }
                }

                const response = await axios.post(
                    'https://api.perplexity.ai/chat/completions',
                    requestData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );

                return {
                    content: response.data.choices[0].message.content,
                    usage: response.data.usage,
                    model: response.data.model,
                    citations: response.data.citations,
                    rawResponse: response.data
                };
            },

            claude: async (messages, apiKey) => {
                // Claude uses different message format - system is separate
                const systemMessage = messages.find(m => m.role === 'system');
                const conversationMessages = messages.filter(m => m.role !== 'system');

                const requestData = {
                    model: node.model,
                    messages: conversationMessages,
                    max_tokens: node.maxTokens || 4096
                };

                if (systemMessage) requestData.system = systemMessage.content;
                if (node.temperature !== undefined) requestData.temperature = node.temperature;

                const response = await axios.post(
                    'https://api.anthropic.com/v1/messages',
                    requestData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01'
                        }
                    }
                );

                return {
                    content: response.data.content[0].text,
                    usage: response.data.usage,
                    model: response.data.model,
                    rawResponse: response.data
                };
            },

            gemini: async (messages, apiKey) => {
                // Gemini uses different message format
                const systemMessage = messages.find(m => m.role === 'system');
                const conversationMessages = messages.filter(m => m.role !== 'system');

                // Ensure we have at least one message
                if (conversationMessages.length === 0) {
                    throw new Error('Gemini requires at least one user message');
                }

                const contents = conversationMessages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }));

                const requestData = {
                    contents: contents
                };

                // Only add generationConfig if we have values to set
                const generationConfig = {};
                if (node.maxTokens) {
                    generationConfig.maxOutputTokens = node.maxTokens;
                }
                if (node.temperature !== undefined && node.temperature !== null) {
                    generationConfig.temperature = node.temperature;
                }

                // Only add generationConfig if it has properties
                if (Object.keys(generationConfig).length > 0) {
                    requestData.generationConfig = generationConfig;
                }

                if (systemMessage) {
                    requestData.systemInstruction = {
                        parts: [{ text: systemMessage.content }]
                    };
                }

                try {
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${node.model}:generateContent?key=${apiKey}`,
                        requestData,
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            timeout: 60000 // 60 second timeout
                        }
                    );

                    // Check if response has expected structure
                    if (!response.data.candidates || response.data.candidates.length === 0) {
                        throw new Error('Gemini API returned no candidates');
                    }

                    return {
                        content: response.data.candidates[0].content.parts[0].text,
                        usage: response.data.usageMetadata || {},
                        model: node.model,
                        rawResponse: response.data
                    };
                } catch (error) {
                    // Enhanced error for Gemini
                    if (error.response?.data?.error) {
                        throw new Error(`Gemini API Error: ${error.response.data.error.message || JSON.stringify(error.response.data.error)}`);
                    }
                    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                        throw new Error('Gemini API timeout - požiadavka trvala príliš dlho (>60s)');
                    }
                    throw error;
                }
            },

            grok: async (messages, apiKey) => {
                // Grok uses OpenAI-compatible API
                const requestData = {
                    model: node.model,
                    messages: messages
                };

                if (node.maxTokens) requestData.max_tokens = node.maxTokens;
                if (node.temperature !== undefined) requestData.temperature = node.temperature;

                const response = await axios.post(
                    'https://api.x.ai/v1/chat/completions',
                    requestData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );

                return {
                    content: response.data.choices[0].message.content,
                    usage: response.data.usage,
                    model: response.data.model,
                    rawResponse: response.data
                };
            },

            deepseek: async (messages, apiKey) => {
                // DeepSeek uses OpenAI-compatible API
                const requestData = {
                    model: node.model,
                    messages: messages
                };

                if (node.maxTokens) requestData.max_tokens = node.maxTokens;
                if (node.temperature !== undefined) requestData.temperature = node.temperature;

                const response = await axios.post(
                    'https://api.deepseek.com/chat/completions',
                    requestData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );

                return {
                    content: response.data.choices[0].message.content,
                    usage: response.data.usage,
                    model: response.data.model,
                    rawResponse: response.data
                };
            },

            openai: async (messages, apiKey) => {
                // OpenAI ChatGPT API
                const requestData = {
                    model: node.model,
                    messages: messages
                };

                if (node.maxTokens) requestData.max_tokens = node.maxTokens;
                if (node.temperature !== undefined) requestData.temperature = node.temperature;

                const response = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    requestData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );

                return {
                    content: response.data.choices[0].message.content,
                    usage: response.data.usage,
                    model: response.data.model,
                    rawResponse: response.data
                };
            }
        };

        node.on('input', async function(msg) {
            // Get provider (use override from msg if available) - declare outside try block for error handling
            const provider = msg.provider || node.provider;

            try {
                node.status({ fill: "blue", shape: "dot", text: "Spracováva sa..." });

                const apiKey = node.config.getApiKey(provider);

                if (!apiKey) {
                    node.error(`Nie je dostupný API key pre ${provider}. Prosím nastav ho v konfigurácii.`);
                    node.status({ fill: "red", shape: "ring", text: "Chyba: Žiadny API key" });
                    return;
                }

                let messages = [];

                // Parse input - support string, array, or object with messages
                if (Array.isArray(msg.payload)) {
                    messages = msg.payload;
                } else if (typeof msg.payload === 'string') {
                    messages = [{
                        role: 'user',
                        content: msg.payload
                    }];
                } else if (msg.payload.messages) {
                    messages = msg.payload.messages;
                }

                // Add system prompt if configured
                if (node.systemPrompt && messages[0]?.role !== 'system') {
                    messages.unshift({
                        role: 'system',
                        content: node.systemPrompt
                    });
                }

                // Get API handler for provider
                const handler = apiHandlers[provider];
                if (!handler) {
                    throw new Error(`Nepodporovaný provider: ${provider}`);
                }

                // Make API request
                const result = await handler(messages, apiKey);

                // Track token usage
                if (result.usage) {
                    // Handle different token naming conventions
                    let inputTokens = 0;
                    let outputTokens = 0;
                    let totalTokens = 0;

                    // Gemini uses different field names
                    if (result.usage.promptTokenCount !== undefined) {
                        // Gemini format
                        inputTokens = result.usage.promptTokenCount || 0;
                        outputTokens = result.usage.candidatesTokenCount || 0;
                        totalTokens = result.usage.totalTokenCount || (inputTokens + outputTokens);
                    } else {
                        // OpenAI/Claude/Perplexity format
                        inputTokens = result.usage.prompt_tokens || result.usage.input_tokens || 0;
                        outputTokens = result.usage.completion_tokens || result.usage.output_tokens || 0;
                        totalTokens = result.usage.total_tokens || (inputTokens + outputTokens);
                    }

                    node.tokenUsage.total.input += inputTokens;
                    node.tokenUsage.total.output += outputTokens;
                    node.tokenUsage.total.total += totalTokens;
                    node.tokenUsage.requestCount++;
                    node.tokenUsage.lastRequest = {
                        input: inputTokens,
                        output: outputTokens,
                        total: totalTokens,
                        provider: provider,
                        model: result.model,
                        timestamp: Date.now()
                    };
                }

                // Add assistant response to messages history
                messages.push({
                    role: 'assistant',
                    content: result.content
                });

                msg.payload = result.content;
                msg.ai = {
                    provider: provider,
                    response: result.rawResponse,
                    messages: messages,
                    usage: result.usage,
                    model: result.model,
                    citations: result.citations
                };

                node.status({ fill: "green", shape: "dot", text: "Hotovo" });
                node.send([msg, null]);

                setTimeout(() => {
                    node.status({});
                }, 3000);

            } catch (error) {
                let errorMessage = error.message;
                let statusText = "Chyba";

                // Enhanced error handling for specific providers
                if (error.response?.data) {
                    const errorData = error.response.data;

                    // Grok - check for credits error
                    if (provider === 'grok' && errorData.error) {
                        if (errorData.error.includes('credits') || errorData.error.includes('permission')) {
                            errorMessage = `Grok API: ${errorData.error}`;
                            statusText = "Grok: Chýbajú kredity";
                        }
                    }

                    // Claude - specific error messages
                    if (provider === 'claude' && errorData.error) {
                        errorMessage = `Claude API: ${errorData.error.message || errorData.error}`;
                    }

                    // Gemini - specific error messages
                    if (provider === 'gemini' && errorData.error) {
                        errorMessage = `Gemini API: ${errorData.error.message || errorData.error}`;
                    }

                    // Perplexity - specific error messages
                    if (provider === 'perplexity' && errorData.error) {
                        errorMessage = `Perplexity API: ${errorData.error.message || errorData.error}`;
                    }
                }

                node.error(`Chyba pri volaní ${provider} API: ${errorMessage}`, msg);
                node.status({ fill: "red", shape: "ring", text: statusText });

                msg.error = {
                    message: errorMessage,
                    statusCode: error.response?.status,
                    data: error.response?.data
                };
                node.send([null, msg]);
            }
        });
    }

    RED.nodes.registerType("ai-chat", PerplexityChatNode);

    // HTTP endpoint to get token usage stats
    RED.httpAdmin.get('/ai-chat/:id/usage', function(req, res) {
        const node = RED.nodes.getNode(req.params.id);
        if (node && node.tokenUsage) {
            res.json({
                success: true,
                usage: node.tokenUsage
            });
        } else {
            res.json({
                success: false,
                error: 'Node not found or no usage data'
            });
        }
    });

    // HTTP endpoint to reset token usage stats
    RED.httpAdmin.post('/ai-chat/:id/usage/reset', function(req, res) {
        const node = RED.nodes.getNode(req.params.id);
        if (node && node.tokenUsage) {
            node.tokenUsage = {
                total: { input: 0, output: 0, total: 0 },
                lastRequest: null,
                requestCount: 0,
                startTime: Date.now()
            };
            res.json({
                success: true,
                message: 'Token usage reset'
            });
        } else {
            res.json({
                success: false,
                error: 'Node not found'
            });
        }
    });
};
