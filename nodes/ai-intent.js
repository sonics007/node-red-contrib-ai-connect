module.exports = function(RED) {
    const axios = require('axios');

    function AIIntentNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.config = RED.nodes.getNode(config.config);
        this.provider = config.provider || 'perplexity';
        this.intents = config.intents || [];
        this.model = config.model || 'sonar';
        this.outputType = config.outputType || 'separate';

        if (!this.config) {
            this.error("Chýba AI konfigurácia");
            return;
        }

        function createIntentPrompt(intents, userMessage) {
            const intentDescriptions = intents.map((intent, idx) =>
                `${idx + 1}. ${intent.name}: ${intent.description || 'Žiadny popis'}`
            ).join('\n');

            return `Analyzuj nasledujúcu správu používateľa a vyber najvhodnejší intent zo zoznamu.

Dostupné intenty:
${intentDescriptions}

Používateľská správa: "${userMessage}"

Odpovedz iba číslom intentu (1-${intents.length}) ktorý najlepšie zodpovedá správe.
Ak žiadny intent nezodpovedá, odpovedz "0".`;
        }

        // API handlers for different providers
        const apiHandlers = {
            perplexity: async (prompt, apiKey) => {
                const response = await axios.post(
                    'https://api.perplexity.ai/chat/completions',
                    {
                        model: node.model,
                        max_tokens: 50,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );
                return response.data.choices[0].message.content.trim();
            },

            claude: async (prompt, apiKey) => {
                const response = await axios.post(
                    'https://api.anthropic.com/v1/messages',
                    {
                        model: node.model,
                        max_tokens: 50,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01'
                        }
                    }
                );
                return response.data.content[0].text.trim();
            },

            gemini: async (prompt, apiKey) => {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/${node.model}:generateContent?key=${apiKey}`,
                    {
                        contents: [{
                            role: 'user',
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            maxOutputTokens: 50
                        }
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
                return response.data.candidates[0].content.parts[0].text.trim();
            },

            grok: async (prompt, apiKey) => {
                const response = await axios.post(
                    'https://api.x.ai/v1/chat/completions',
                    {
                        model: node.model,
                        max_tokens: 50,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );
                return response.data.choices[0].message.content.trim();
            },

            deepseek: async (prompt, apiKey) => {
                const response = await axios.post(
                    'https://api.deepseek.com/chat/completions',
                    {
                        model: node.model,
                        max_tokens: 50,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );
                return response.data.choices[0].message.content.trim();
            },

            openai: async (prompt, apiKey) => {
                const response = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: node.model,
                        max_tokens: 50,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    }
                );
                return response.data.choices[0].message.content.trim();
            }
        };

        node.on('input', async function(msg) {
            // Get provider (use override from msg if available)
            const provider = msg.provider || node.provider;

            try {
                node.status({ fill: "blue", shape: "dot", text: `Analyzuje sa (${provider})...` });

                const apiKey = node.config.getApiKey(provider);

                if (!apiKey) {
                    node.error(`Nie je dostupný API key pre ${provider}`);
                    node.status({ fill: "red", shape: "ring", text: "Chyba: Žiadny API key" });
                    return;
                }

                const userMessage = typeof msg.payload === 'string' ? msg.payload : msg.payload.text;

                if (!userMessage) {
                    node.error("Chýba správa na analýzu");
                    return;
                }

                const prompt = createIntentPrompt(node.intents, userMessage);

                // Get API handler for provider
                const handler = apiHandlers[provider];
                if (!handler) {
                    throw new Error(`Nepodporovaný provider: ${provider}`);
                }

                // Make API request
                const aiResponse = await handler(prompt, apiKey);
                const intentIndex = parseInt(aiResponse);

                if (isNaN(intentIndex) || intentIndex < 0 || intentIndex > node.intents.length) {
                    msg.intent = {
                        matched: false,
                        name: 'unknown',
                        confidence: 0,
                        originalMessage: userMessage,
                        provider: provider
                    };
                    node.status({ fill: "yellow", shape: "ring", text: "Neznámy intent" });

                    if (node.outputType === 'separate') {
                        const outputs = new Array(node.intents.length + 1).fill(null);
                        outputs[node.intents.length] = msg;
                        node.send(outputs);
                    } else {
                        node.send(msg);
                    }
                    return;
                }

                if (intentIndex === 0) {
                    msg.intent = {
                        matched: false,
                        name: 'none',
                        confidence: 0,
                        originalMessage: userMessage,
                        provider: provider
                    };
                    node.status({ fill: "yellow", shape: "ring", text: "Žiadny intent" });

                    if (node.outputType === 'separate') {
                        const outputs = new Array(node.intents.length + 1).fill(null);
                        outputs[node.intents.length] = msg;
                        node.send(outputs);
                    } else {
                        node.send(msg);
                    }
                    return;
                }

                const matchedIntent = node.intents[intentIndex - 1];
                msg.intent = {
                    matched: true,
                    name: matchedIntent.name,
                    description: matchedIntent.description,
                    confidence: 1,
                    originalMessage: userMessage,
                    provider: provider
                };

                node.status({ fill: "green", shape: "dot", text: `Intent: ${matchedIntent.name}` });

                if (node.outputType === 'separate') {
                    const outputs = new Array(node.intents.length + 1).fill(null);
                    outputs[intentIndex - 1] = msg;
                    node.send(outputs);
                } else {
                    node.send(msg);
                }

                setTimeout(() => {
                    node.status({});
                }, 3000);

            } catch (error) {
                let errorMessage = error.message;

                // Enhanced error handling for specific providers
                if (error.response?.data) {
                    const errorData = error.response.data;

                    if (provider === 'grok' && errorData.error) {
                        if (errorData.error.includes('credits') || errorData.error.includes('permission')) {
                            errorMessage = `Grok API: ${errorData.error}`;
                        }
                    }

                    if (provider === 'claude' && errorData.error) {
                        errorMessage = `Claude API: ${errorData.error.message || errorData.error}`;
                    }

                    if (provider === 'gemini' && errorData.error) {
                        errorMessage = `Gemini API: ${errorData.error.message || errorData.error}`;
                    }
                }

                node.error(`Chyba pri detekcii intentu (${provider}): ${errorMessage}`, msg);
                node.status({ fill: "red", shape: "ring", text: "Chyba" });
            }
        });

        if (node.outputType === 'separate') {
            this.outputs = node.intents.length + 1;
        } else {
            this.outputs = 1;
        }
    }

    RED.nodes.registerType("ai-intent", AIIntentNode);
};
