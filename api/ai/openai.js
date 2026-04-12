// api/ai/openai.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Directory to store memory files
const memoryDir = path.join(__dirname, '../../memory');

// Ensure the memory directory exists
function ensureMemoryDirExists() {
    if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
        console.log('Memory directory created:', memoryDir);
    }
}

ensureMemoryDirExists();

// OpenAI API Key - DIRECTLY HARDCODE (since you want to avoid dotenv)
// IMPORTANT: In production, use environment variables. Hardcoding is for testing only.
const OPENAI_API_KEY = "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"; // <-- PUT YOUR API KEY HERE

const meta = {
    name: 'OpenAI Chat',
    description: 'Chat with OpenAI GPT-4 with conversation memory',
    author: 'Jaybohol',
    version: '1.0.0',
    category: 'ai',
    method: 'GET',
    path: '/openai?prompt=&uid='
};

async function saveMemory(uid, conversationHistory) {
    const filePath = path.join(memoryDir, `memory_${uid}.json`);
    try {
        const jsonData = JSON.stringify(conversationHistory, null, 2);
        fs.writeFileSync(filePath, jsonData, 'utf8');
        console.log(`Memory saved for UID ${uid}`);
    } catch (error) {
        console.error(`Memory save error for UID ${uid}:`, error.message);
    }
}

function loadMemory(uid) {
    const filePath = path.join(memoryDir, `memory_${uid}.json`);
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            console.log(`Memory loaded for UID ${uid}`);
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Memory load error for UID ${uid}:`, error.message);
    }
    return null;
}

function deleteMemory(uid) {
    const filePath = path.join(memoryDir, `memory_${uid}.json`);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Memory deleted for UID ${uid}`);
            return true;
        }
    } catch (error) {
        console.error(`Memory delete error for UID ${uid}:`, error.message);
    }
    return false;
}

async function onStart({ req, res }) {
    try {
        const { prompt, uid, clear, model = "gpt-4o-mini" } = req.query;

        if (!prompt && clear !== 'true') {
            return res.status(400).json({
                status: false,
                error: 'Prompt parameter is required',
                usage: '/openai?prompt=hello&uid=123',
                example: '/openai?prompt=What is AI?&uid=user123'
            });
        }

        if (!uid) {
            return res.status(400).json({
                status: false,
                error: 'UID parameter is required',
                usage: '/openai?prompt=hello&uid=123'
            });
        }

        // Clear memory
        if (clear === 'true') {
            const deleted = deleteMemory(uid);
            return res.json({
                status: true,
                message: deleted ? 'Conversation history cleared' : 'No conversation history found',
                uid: uid
            });
        }

        // Check API key
        if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
            return res.status(500).json({
                status: false,
                error: 'OpenAI API key not configured',
                message: 'Please add your OpenAI API key to the code'
            });
        }

        // Load existing conversation history
        let conversationHistory = loadMemory(uid);
        if (!conversationHistory) {
            conversationHistory = [
                { role: "system", content: "You are a helpful assistant. Respond in a friendly, helpful manner." }
            ];
        }

        // Add user message
        conversationHistory.push({ role: "user", content: prompt });

        // Keep only last 20 messages to manage token limit
        if (conversationHistory.length > 21) {
            // Keep system message + last 20 messages
            const systemMsg = conversationHistory[0];
            const recentMsgs = conversationHistory.slice(-20);
            conversationHistory = [systemMsg, ...recentMsgs];
        }

        // Make API request to OpenAI
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: model,
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 1000
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                timeout: 30000
            }
        );

        // Extract AI response
        const aiResponse = response.data.choices[0].message.content;

        // Add AI response to conversation history
        conversationHistory.push({ role: "assistant", content: aiResponse });

        // Save memory
        saveMemory(uid, conversationHistory);

        // Send response
        res.json({
            status: true,
            author: "Jaybohol",
            result: {
                response: aiResponse,
                model: model,
                uid: uid,
                conversation_length: conversationHistory.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('OpenAI API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        res.status(500).json({
            status: false,
            error: error.response?.data?.error?.message || error.message,
            details: error.response?.data
        });
    }
}

module.exports = { meta, onStart };
