module.exports = function(RED) {
    const axios = require('axios');

    function PerplexityIntentNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.config = RED.nodes.getNode(config.config);
        this.intents = config.intents || [];
        this.model = config.model || 'sonar';
        this.outputType = config.outputType || 'separate';

        if (!this.config) {
            this.error("Chýba Perplexity konfigurácia");
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

        node.on('input', async function(msg) {
            try {
                node.status({ fill: "blue", shape: "dot", text: "Analyzuje sa intent..." });

                const apiKey = node.config.getApiKey();

                if (!apiKey) {
                    node.error("Nie je dostupný API key");
                    node.status({ fill: "red", shape: "ring", text: "Chyba: Žiadny API key" });
                    return;
                }

                const userMessage = typeof msg.payload === 'string' ? msg.payload : msg.payload.text;

                if (!userMessage) {
                    node.error("Chýba správa na analýzu");
                    return;
                }

                const prompt = createIntentPrompt(node.intents, userMessage);

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

                const perplexityResponse = response.data.choices[0].message.content.trim();
                const intentIndex = parseInt(perplexityResponse);

                if (isNaN(intentIndex) || intentIndex < 0 || intentIndex > node.intents.length) {
                    msg.intent = {
                        matched: false,
                        name: 'unknown',
                        confidence: 0,
                        originalMessage: userMessage
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
                        originalMessage: userMessage
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
                    originalMessage: userMessage
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
                node.error(`Chyba pri detekcii intentu: ${error.message}`, msg);
                node.status({ fill: "red", shape: "ring", text: "Chyba" });
            }
        });

        if (node.outputType === 'separate') {
            this.outputs = node.intents.length + 1;
        } else {
            this.outputs = 1;
        }
    }

    RED.nodes.registerType("ai-intent", PerplexityIntentNode);
};
