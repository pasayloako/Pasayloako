// gemini.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Storage for conversations
const CONVERSATIONS_DIR = path.join(__dirname, 'gemini_conversations');
if (!fs.existsSync(CONVERSATIONS_DIR)) {
  fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
}

// API Keys
const GOOGLE_API_KEY = "gAIzaSyAQ4j_pC3YQCNeuKyZoGnvu2Rk0ozw7cU0";
const OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY";
const NEWS_API_KEY = "YOUR_NEWS_API_KEY";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Load conversation
function loadConversation(uid) {
  const file = path.join(CONVERSATIONS_DIR, `${uid}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

// Save conversation
function saveConversation(uid, messages) {
  const file = path.join(CONVERSATIONS_DIR, `${uid}.json`);
  const trimmed = messages.slice(-100);
  fs.writeFileSync(file, JSON.stringify(trimmed, null, 2));
}

function clearConversation(uid) {
  const file = path.join(CONVERSATIONS_DIR, `${uid}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// Weather Tool
async function weatherSearch(location) {
  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "YOUR_OPENWEATHER_API_KEY") {
    return "⚠️ Weather API key not configured. Get free key from openweathermap.org";
  }
  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
      params: { q: location, appid: OPENWEATHER_API_KEY, units: 'metric' },
      timeout: 10000
    });
    const data = response.data;
    return `🌤️ WEATHER in ${location}:\nTemperature: ${data.main.temp}°C\nFeels like: ${data.main.feels_like}°C\nHumidity: ${data.main.humidity}%\nCondition: ${data.weather[0].description}\nWind: ${data.wind.speed} m/s`;
  } catch (error) {
    return `Weather error: ${error.message}`;
  }
}

// News Tool
async function newsSearch(topic) {
  if (!NEWS_API_KEY || NEWS_API_KEY === "YOUR_NEWS_API_KEY") {
    return "⚠️ News API key not configured. Get free key from newsapi.org";
  }
  try {
    const response = await axios.get(`https://newsapi.org/v2/everything`, {
      params: { q: topic, sortBy: 'publishedAt', pageSize: 5, apiKey: NEWS_API_KEY },
      timeout: 10000
    });
    if (response.data.articles && response.data.articles.length > 0) {
      let result = `📰 LATEST NEWS about "${topic}":\n\n`;
      response.data.articles.forEach((article, i) => {
        result += `${i + 1}. ${article.title}\n   ${article.description || 'No description'}\n   Source: ${article.source.name}\n   URL: ${article.url}\n\n`;
      });
      return result;
    }
    return "No news found.";
  } catch (error) {
    return `News error: ${error.message}`;
  }
}

// YouTube Search Tool
async function youtubeSearch(query) {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: { part: 'snippet', maxResults: 5, q: query, type: 'video', key: GOOGLE_API_KEY },
      timeout: 10000
    });
    if (response.data.items && response.data.items.length > 0) {
      let result = `🎥 YOUTUBE RESULTS for "${query}":\n\n`;
      response.data.items.forEach((item, i) => {
        result += `${i + 1}. ${item.snippet.title}\n   Channel: ${item.snippet.channelTitle}\n   https://www.youtube.com/watch?v=${item.id.videoId}\n\n`;
      });
      return result;
    }
    return "No YouTube videos found.";
  } catch (error) {
    return `YouTube error: ${error.message}`;
  }
}

// Web Search Tool
async function webSearch(query) {
  try {
    const ddgResponse = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, {
      timeout: 10000
    });
    let result = `🔍 SEARCH RESULTS for "${query}":\n\n`;
    if (ddgResponse.data.AbstractText) {
      result += `📌 ${ddgResponse.data.AbstractText}\n`;
    } else {
      result += "No results found.\n";
    }
    return result;
  } catch (error) {
    return `Search error: ${error.message}`;
  }
}

// Detect tool from query
function detectTool(query) {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('weather') || lowerQuery.includes('temperature')) {
    const cityMatch = query.match(/(?:in|at|for)\s+([a-zA-Z\s,]+)/i);
    return { tool: 'weather', query: cityMatch ? cityMatch[1].trim() : "Manila" };
  }
  if (lowerQuery.includes('news') || lowerQuery.includes('latest')) {
    const topicMatch = query.match(/(?:about|on|for)\s+([a-zA-Z\s]+)/i);
    return { tool: 'news', query: topicMatch ? topicMatch[1].trim() : "technology" };
  }
  if (lowerQuery.includes('youtube') || lowerQuery.includes('video')) {
    return { tool: 'youtube', query: query.replace(/youtube|video|search for/i, '').trim() };
  }
  if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
    return { tool: 'search', query: query.replace(/search|find|look up/i, '').trim() };
  }
  return { tool: 'chat', query: query };
}

// Gemini AI Chat
async function geminiChat(history, systemPrompt) {
  try {
    let contents = [];
    if (systemPrompt) {
      contents.push({ role: "user", parts: [{ text: systemPrompt }] });
      contents.push({ role: "model", parts: [{ text: "OK" }] });
    }
    for (const msg of history) {
      if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "assistant" && !msg.tool) {
        contents.push({ role: "model", parts: [{ text: msg.content }] });
      }
    }
    const response = await axios.post(`${GEMINI_API_URL}?key=${GOOGLE_API_KEY}`, {
      contents: contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    }, { timeout: 30000 });
    if (response.data?.candidates?.[0]) {
      return response.data.candidates[0].content.parts[0].text;
    }
    return "No response generated.";
  } catch (error) {
    return `AI Error: ${error.message}`;
  }
}

module.exports = {
  meta: {
    name: "Gemini AI",
    description: "Google Gemini AI with tools for weather, news, YouTube, and search",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/gemini?query=&uid="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { query, uid, system, clear } = req.query;
      
      if (clear === 'true' && uid) {
        clearConversation(uid);
        return res.json({ status: true, message: "History cleared" });
      }
      
      if (!query) {
        return res.status(400).json({
          status: false,
          error: "Query is required",
          usage: "/gemini?query=hi&uid=123",
          examples: {
            chat: "/gemini?query=What is AI?&uid=123",
            weather: "/gemini?query=weather in Manila&uid=123",
            news: "/gemini?query=latest news about technology&uid=123",
            youtube: "/gemini?query=funny cat videos&uid=123",
            search: "/gemini?query=search for Python&uid=123"
          }
        });
      }
      
      if (!uid) {
        return res.status(400).json({
          status: false,
          error: "User ID (uid) is required",
          usage: "/gemini?query=hi&uid=123"
        });
      }
      
      // Auto-detect tool
      const detected = detectTool(query);
      let response = "";
      let toolUsed = detected.tool;
      
      // Execute tool if detected
      if (detected.tool === 'weather') {
        response = await weatherSearch(detected.query);
      } else if (detected.tool === 'news') {
        response = await newsSearch(detected.query);
      } else if (detected.tool === 'youtube') {
        response = await youtubeSearch(detected.query);
      } else if (detected.tool === 'search') {
        response = await webSearch(detected.query);
      } else {
        // Chat mode - use Gemini AI
        const history = loadConversation(uid);
        response = await geminiChat(history, system);
        
        // Save to history
        history.push({ role: "user", content: query, timestamp: new Date().toISOString() });
        history.push({ role: "assistant", content: response, timestamp: new Date().toISOString() });
        saveConversation(uid, history);
      }
      
      res.json({
        status: true,
        author: "Jaybohol",
        result: {
          query: query,
          response: response,
          tool: toolUsed,
          uid: uid
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Gemini Error:", error.message);
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  }
};
