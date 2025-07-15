const express = require('express');
const cors = require('cors');
const { AzureOpenAI } = require('openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure logging
const logger = {
    info: (message) => console.log(`[INFO] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`)
};

// Azure OpenAI Configuration
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || "YOUR_AZURE_OPENAI_API_KEY";
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "https://your-resource-name.openai.azure.com/";
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
const DEPLOYMENT_NAME = process.env.DEPLOYMENT_NAME || "gpt-35-turbo";

// Initialize Azure OpenAI client
const client = new AzureOpenAI({
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
    endpoint: AZURE_OPENAI_ENDPOINT
});

// Store conversation history and user preferences
const conversations = {};
const userPreferences = {};

// Define system prompts for different modes and personalities
const SYSTEM_PROMPTS = {
    modes: {
        general: "You are a helpful AI assistant. Be concise and friendly in your responses.",
        story: "You are a creative storytelling AI. Help users create engaging stories, provide plot ideas, develop characters, and guide narrative development. Ask questions to understand what kind of story they want to create and collaborate with them.",
        learning: "You are an educational AI tutor. Help users learn new concepts by breaking them down into digestible parts. Use examples, analogies, and interactive questions to reinforce learning. Adapt your teaching style to the user's level.",
        interview: "You are an interview preparation AI. Help users practice for job interviews by asking relevant questions, providing feedback on answers, and offering tips. Ask about the position they're applying for to customize the experience.",
        debate: "You are a debate partner AI. Engage in structured debates on various topics. Present counterarguments, ask probing questions, and help users strengthen their reasoning skills. Always remain respectful and constructive."
    },
    personalities: {
        neutral: "",
        humorous: "Add a touch of humor to your responses when appropriate. Use witty remarks, puns, and light-hearted observations while maintaining helpfulness.",
        stoic: "Respond with stoic wisdom and philosophy. Be calm, rational, and focus on what can be controlled. Reference stoic principles when relevant and maintain a composed, thoughtful demeanor.",
        friendly: "Be extra warm, enthusiastic, and encouraging. Use positive language, show genuine interest in the user's topics, and maintain an upbeat, supportive tone.",
        professional: "Maintain a formal, business-like tone. Be precise, structured, and professional in all interactions while remaining helpful and clear."
    }
};

function getConversationId(req) {
    return req.ip || req.connection.remoteAddress || 'default';
}

function getSystemPrompt(mode, personality) {
    const modePrompt = SYSTEM_PROMPTS.modes[mode] || SYSTEM_PROMPTS.modes.general;
    const personalityPrompt = SYSTEM_PROMPTS.personalities[personality] || "";
    
    if (personalityPrompt) {
        return `${modePrompt}\n\nPersonality: ${personalityPrompt}`;
    }
    return modePrompt;
}

// Routes
app.get('/', (req, res) => {
    res.send("Enhanced Azure AI Chatbot Backend is running!");
});

app.post('/chat', async (req, res) => {
    try {
        const { message, mode = 'general', personality = 'neutral' } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'No message provided' });
        }
        
        const conversationId = getConversationId(req);
        
        // Store user preferences
        userPreferences[conversationId] = { mode, personality };
        
        // Initialize conversation history if not exists or if mode/personality changed
        const systemPrompt = getSystemPrompt(mode, personality);
        if (!conversations[conversationId] || conversations[conversationId][0].content !== systemPrompt) {
            conversations[conversationId] = [
                { role: "system", content: systemPrompt }
            ];
        }
        
        // Add user message to conversation history
        conversations[conversationId].push({ role: "user", content: message });
        
        // Keep only last 15 messages to manage token limits
        if (conversations[conversationId].length > 15) {
            const systemMsg = conversations[conversationId][0];
            conversations[conversationId] = [systemMsg, ...conversations[conversationId].slice(-14)];
        }
        
        logger.info(`Processing message from ${conversationId} in ${mode} mode with ${personality} personality`);
        
        // Adjust parameters based on mode
        let temperature = 0.7;
        let maxTokens = 500;
        
        switch (mode) {
            case "story":
                temperature = 0.9;
                maxTokens = 700;
                break;
            case "learning":
                temperature = 0.5;
                maxTokens = 600;
                break;
            case "interview":
                temperature = 0.6;
                maxTokens = 400;
                break;
            case "debate":
                temperature = 0.8;
                maxTokens = 500;
                break;
        }
        
        // Call Azure OpenAI API
        const response = await client.chat.completions.create({
            model: DEPLOYMENT_NAME,
            messages: conversations[conversationId],
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: 0.9,
            frequency_penalty: 0,
            presence_penalty: 0
        });
        
        // Extract the assistant's response
        const assistantResponse = response.choices[0].message.content;
        
        // Add assistant response to conversation history
        conversations[conversationId].push({ role: "assistant", content: assistantResponse });
        
        logger.info(`Response generated for ${conversationId}`);
        
        res.json({ response: assistantResponse });
        
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        
        if (error.code === 'AuthenticationError') {
            return res.status(401).json({ error: 'Authentication failed. Please check your Azure OpenAI credentials.' });
        }
        
        if (error.code === 'RateLimitError') {
            return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }
        
        if (error.code === 'APIError') {
            return res.status(500).json({ error: `API error: ${error.message}` });
        }
        
        res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
});

app.post('/clear', (req, res) => {
    try {
        const conversationId = getConversationId(req);
        if (conversations[conversationId]) {
            delete conversations[conversationId];
        }
        if (userPreferences[conversationId]) {
            delete userPreferences[conversationId];
        }
        res.json({ message: 'Conversation cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/set_preferences', (req, res) => {
    try {
        const { mode = 'general', personality = 'neutral' } = req.body;
        const conversationId = getConversationId(req);
        
        userPreferences[conversationId] = { mode, personality };
        
        // Clear conversation to apply new system prompt
        if (conversations[conversationId]) {
            delete conversations[conversationId];
        }
        
        res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/get_preferences', (req, res) => {
    try {
        const conversationId = getConversationId(req);
        const prefs = userPreferences[conversationId] || { mode: 'general', personality: 'neutral' };
        res.json(prefs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/modes', (req, res) => {
    res.json({
        modes: Object.keys(SYSTEM_PROMPTS.modes),
        personalities: Object.keys(SYSTEM_PROMPTS.personalities)
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        azure_openai_configured: !!(AZURE_OPENAI_API_KEY && AZURE_OPENAI_API_KEY !== "YOUR_AZURE_OPENAI_API_KEY"),
        features: {
            modes: Object.keys(SYSTEM_PROMPTS.modes),
            personalities: Object.keys(SYSTEM_PROMPTS.personalities)
        }
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    // Check if Azure credentials are configured
    if (AZURE_OPENAI_API_KEY === "YOUR_AZURE_OPENAI_API_KEY") {
        console.log("WARNING: Please configure your Azure OpenAI credentials in the .env file");
        console.log("Create a .env file with:");
        console.log("AZURE_OPENAI_API_KEY=your_actual_api_key");
        console.log("AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/");
        console.log("DEPLOYMENT_NAME=your_deployment_name");
    }
    
    console.log("Enhanced Azure AI Chatbot with multiple modes and personalities");
    console.log("Available modes: general, story, learning, interview, debate");
    console.log("Available personalities: neutral, humorous, stoic, friendly, professional");
    console.log(`Server running on http://localhost:${PORT}`);
});