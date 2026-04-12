// api/gemini.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============= STORAGE SETUP =============
const CONVERSATIONS_DIR = path.join(__dirname, '../data/gemini_conversations');
const DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CONVERSATIONS_DIR)) {
  fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
}

// ============= API KEYS =============
const GOOGLE_API_KEY = "gAIzaSyAQ4j_pC3YQCNeuKyZoGnvu2Rk0ozw7cU0";
const OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY"; // Get from openweathermap.org
const NEWS_API_KEY = "YOUR_NEWS_API_KEY"; // Get from newsapi.org

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ============= CONVERSATION MEMORY FUNCTIONS =============
function loadConversation(uid) {
  const file = path.join(CONVERSATIONS_DIR, `${uid}.json`);
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveConversation(uid, messages) {
  const file = path.join(CONVERSATIONS_DIR, `${uid}.json`);
  const trimmed = messages.slice(-100);
  fs.writeFileSync(file, JSON.stringify(trimmed, null, 2));
}

function clearConversation(uid) {
  const file = path.join(CONVERSATIONS_DIR, `${uid}.json`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

// ============= TOOLS =============

// 1. Multi Web Search (DuckDuckGo + Wikipedia)
async function multiWebSearch(query) {
  try {
    // DuckDuckGo search
    const ddgResponse = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      timeout: 10000
    });
    
    let ddgResult = "";
    if (ddgResponse.data.AbstractText) {
      ddgResult = ddgResponse.data.AbstractText;
    } else if (ddgResponse.data.RelatedTopics && ddgResponse.data.RelatedTopics[0]?.Text) {
      ddgResult = ddgResponse.data.RelatedTopics[0].Text;
    } else {
      ddgResult = "No DuckDuckGo results found.";
    }
    
    // Wikipedia search
    let wikiResult = "";
    try {
      const wikiResponse = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, {
        timeout: 10000
      });
      if (wikiResponse.data && wikiResponse.data.extract) {
        wikiResult = wikiResponse.data.extract;
      } else {
        wikiResult = "No Wikipedia summary found.";
      }
    } catch (e) {
      wikiResult = "Wikipedia search failed.";
    }
    
    return `🔍 **SEARCH RESULTS for "${query}"**\n\n📌 **DuckDuckGo:**\n${ddgResult}\n\n📖 **Wikipedia:**\n${wikiResult}`;
    
  } catch (error) {
    return `Search error: ${error.message}`;
  }
}

// 2. YouTube Search
async function youtubeSearch(query) {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        maxResults: 5,
        q: query,
        type: 'video',
        key: GOOGLE_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.items && response.data.items.length > 0) {
      let result = `🎥 **YOUTUBE RESULTS for "${query}"**\n\n`;
      response.data.items.forEach((item, i) => {
        const videoId = item.id.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        result += `${i + 1}. **${item.snippet.title}**\n`;
        result += `   Channel: ${item.snippet.channelTitle}\n`;
        result += `   🔗 ${videoUrl}\n\n`;
      });
      return result;
    }
    return "No YouTube videos found.";
  } catch (error) {
    return `YouTube error: ${error.message}`;
  }
}

// 3. Weather Search
async function weatherSearch(location) {
  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "YOUR_OPENWEATHER_API_KEY") {
    return "⚠️ Weather API key not configured. Please set OPENWEATHER_API_KEY in the code.";
  }
  
  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
      params: {
        q: location,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      },
      timeout: 10000
    });
    
    const data = response.data;
    const weatherDesc = data.weather[0].description;
    const icon = getWeatherIcon(weatherDesc);
    
    return `${icon} **WEATHER in ${location}**\n\n` +
      `🌡️ Temperature: **${data.main.temp}°C** (feels like ${data.main.feels_like}°C)\n` +
      `💧 Humidity: **${data.main.humidity}%**\n` +
      `🌤️ Condition: **${weatherDesc}**\n` +
      `💨 Wind: **${data.wind.speed} m/s**\n` +
      `📈 Min/Max: ${data.main.temp_min}°C / ${data.main.temp_max}°C`;
      
  } catch (error) {
    if (error.response?.status === 404) {
      return `❌ Location "${location}" not found. Please check the city name.`;
    }
    return `Weather error: ${error.message}`;
  }
}

function getWeatherIcon(description) {
  const desc = description.toLowerCase();
  if (desc.includes('rain')) return '🌧️';
  if (desc.includes('cloud')) return '☁️';
  if (desc.includes('sun')) return '☀️';
  if (desc.includes('clear')) return '☀️';
  if (desc.includes('snow')) return '❄️';
  if (desc.includes('thunder')) return '⛈️';
  if (desc.includes('fog') || desc.includes('mist')) return '🌫️';
  return '🌡️';
}

// 4. News Search
async function newsSearch(topic) {
  if (!NEWS_API_KEY || NEWS_API_KEY === "YOUR_NEWS_API_KEY") {
    return "⚠️ News API key not configured. Please set NEWS_API_KEY in the code.";
  }
  
  try {
    const response = await axios.get(`https://newsapi.org/v2/everything`, {
      params: {
        q: topic,
        sortBy: 'publishedAt',
        pageSize: 5,
        language: 'en',
        apiKey: NEWS_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.articles && response.data.articles.length > 0) {
      let result = `📰 **LATEST NEWS about "${topic}"**\n\n`;
      response.data.articles.forEach((article, i) => {
        result += `${i + 1}. **${article.title}**\n`;
        if (article.description) {
          result += `   📝 ${article.description.substring(0, 150)}${article.description.length > 150 ? '...' : ''}\n`;
        }
        result += `   📰 Source: ${article.source.name}\n`;
        result += `   🔗 ${article.url}\n\n`;
      });
      return result;
    }
    return "No news found for this topic.";
  } catch (error) {
    return `News error: ${error.message}`;
  }
}

// ============= TOOL DETECTION =============
function detectTool(query) {
  const lowerQuery = query.toLowerCase();
  
  // Weather detection
  const weatherKeywords = ['weather', 'temperature', 'forecast', 'climate', 'humidity', 'rain', 'sunny', 'cloudy', 'hot', 'cold'];
  if (weatherKeywords.some(kw => lowerQuery.includes(kw))) {
    const cityMatch = query.match(/(?:in|at|for)\s+([a-zA-Z\s,]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : "Manila";
    return { tool: 'weather', query: city };
  }
  
  // News detection
  const newsKeywords = ['news', 'latest', 'headlines', 'breaking', 'current events', 'what\\'s happening'];
  if (newsKeywords.some(kw => lowerQuery.includes(kw))) {
    const topicMatch = query.match(/(?:about|on|for)\s+([a-zA-Z\s]+)/i);
    const topic = topicMatch ? topicMatch[1].trim() : "technology";
    return { tool: 'news', query: topic };
  }
  
  // YouTube detection
  const youtubeKeywords = ['youtube', 'video', 'watch', 'music video', 'mv'];
  if (youtubeKeywords.some(kw => lowerQuery.includes(kw))) {
    const searchMatch = query.replace(/youtube|video|search for|find|play/i, '').trim();
    return { tool: 'youtube', query: searchMatch || query };
  }
  
  // Search detection
  const searchKeywords = ['search', 'find', 'look up', 'tell me about', 'what is', 'who is', 'define'];
  if (searchKeywords.some(kw => lowerQuery.includes(kw))) {
    const searchMatch = query.replace(/search|find|look up|tell me about|what is|who is|define/i, '').trim();
    return { tool: 'search', query: searchMatch || query };
  }
  
  return { tool: 'chat', query: query };
}

// ============= GEMINI AI CHAT =============
async function geminiChat(messages, systemPrompt = null) {
  try {
    let contents = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "System prompt received. I will follow these instructions." }]
      });
    }
    
    // Add conversation history
    for (const msg of messages) {
      if (msg.role === "user") {
        contents.push({
          role: "user",
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === "assistant" && !msg.tool) {
        contents.push({
          role: "model",
          parts: [{ text: msg.content }]
        });
      }
    }
    
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GOOGLE_API_KEY}`,
      {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    if (response.data && response.data.candidates && response.data.candidates[0]) {
      return response.data.candidates[0].content.parts[0].text;
    }
    
    return "No response generated.";
    
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    return `AI Error: ${error.response?.data?.error?.message || error.message}`;
  }
}

// ============= MAIN API =============
module.exports = {
  meta: {
    name: "Gemini AI Agent",
    description: "Google Gemini AI with web search, YouTube, weather, and news tools",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/gemini?query=&user="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { query, uid, system, clear, tool, format = "json" } = req.query;
      
      // Clear conversation history
      if (clear === 'true' && uid) {
        clearConversation(uid);
        return res.json({
          status: true,
          message: "Conversation history cleared successfully"
        });
      }
      
      // Validate required parameters
      if (!query) {
        return res.status(400).json({
          status: false,
          error: "Query is required",
          usage: "/gemini?query=What is AI?&uid=user123",
          example_weather: "/gemini?query=weather in Manila&uid=user123",
          example_news: "/gemini?query=latest news about technology&uid=user123",
          example_youtube: "/gemini?query=funny cat videos&uid=user123",
          example_search: "/gemini?query=search for Python tutorials&uid=user123"
        });
      }
      
      if (!uid) {
        return res.status(400).json({
          status: false,
          error: "User ID (uid) is required",
          usage: "/gemini?query=Hello&uid=user123"
        });
      }
      
      let finalResponse = "";
      let usedTool = "chat";
      let toolResult = null;
      
      // Use specified tool or auto-detect
      if (tool && ['weather', 'news', 'youtube', 'search'].includes(tool)) {
        usedTool = tool;
        switch (tool) {
          case 'weather':
            toolResult = await weatherSearch(query);
            break;
          case 'news':
            toolResult = await newsSearch(query);
            break;
          case 'youtube':
            toolResult = await youtubeSearch(query);
            break;
          case 'search':
            toolResult = await multiWebSearch(query);
            break;
        }
        finalResponse = toolResult;
      } else {
        // Auto-detect tool
        const detected = detectTool(query);
        usedTool = detected.tool;
        
        if (detected.tool !== 'chat') {
          switch (detected.tool) {
            case 'weather':
              toolResult = await weatherSearch(detected.query);
              break;
            case 'news':
              toolResult = await newsSearch(detected.query);
              break;
            case 'youtube':
              toolResult = await youtubeSearch(detected.query);
              break;
            case 'search':
              toolResult = await multiWebSearch(detected.query);
              break;
          }
          finalResponse = toolResult;
        }
      }
      
      // Load conversation history
      let history = loadConversation(uid);
      
      // If tool was used, save to history and return
      if (usedTool !== 'chat' && toolResult) {
        history.push({
          role: "user",
          content: query,
          timestamp: new Date().toISOString()
        });
        history.push({
          role: "assistant",
          content: finalResponse,
          tool: usedTool,
          timestamp: new Date().toISOString()
        });
        saveConversation(uid, history);
        
        // Format response
        if (format === "html") {
          res.setHeader('Content-Type', 'text/html');
          return res.send(formatHTML(query, finalResponse, usedTool, uid));
        }
        
        return res.json({
          status: true,
          user: uid,
          query: query,
          response: finalResponse,
          tool_used: usedTool,
          conversation_length: history.length,
          timestamp: new Date().toISOString()
        });
      }
      
      // Chat mode - use Gemini AI
      const aiResponse = await geminiChat(history, system);
      finalResponse = aiResponse;
      
      // Save to history
      history.push({
        role: "user",
        content: query,
        timestamp: new Date().toISOString()
      });
      history.push({
        role: "assistant",
        content: finalResponse,
        timestamp: new Date().toISOString()
      });
      saveConversation(uid, history);
      
      // Format response
      if (format === "html") {
        res.setHeader('Content-Type', 'text/html');
        return res.send(formatHTML(query, finalResponse, "chat", uid));
      }
      
      res.json({
        status: true,
        user: uid,
        query: query,
        response: finalResponse,
        tool_used: "chat",
        conversation_length: history.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Gemini Agent Error:", error.message);
      
      res.status(500).json({
        status: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// ============= HTML FORMATTER =============
function formatHTML(query, response, tool, uid) {
  // Extract YouTube links for video embedding
  const youtubeRegex = /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]+)/g;
  const matches = [...response.matchAll(youtubeRegex)];
  
  let videoHTML = "";
  if (matches.length > 0) {
    videoHTML = '<div class="videos">';
    for (const match of matches) {
      videoHTML += `
        <div class="video">
          <iframe src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allowfullscreen></iframe>
        </div>
      `;
    }
    videoHTML += '</div>';
    // Remove URLs from text
    response = response.replace(youtubeRegex, '');
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini AI Agent Response</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      color: white;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    .header .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-top: 10px;
    }
    .query-section {
      background: #f0f0f0;
      padding: 20px 30px;
      border-bottom: 1px solid #e0e0e0;
    }
    .query-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .query-text {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    .response-section {
      padding: 30px;
    }
    .response-text {
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .videos {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin: 20px 0;
    }
    .video {
      flex: 1;
      min-width: 250px;
    }
    .video iframe {
      width: 100%;
      height: 200px;
      border-radius: 12px;
    }
    .footer {
      background: #f8f8f8;
      padding: 15px 30px;
      font-size: 12px;
      color: #999;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    @media (max-width: 600px) {
      .header, .query-section, .response-section, .footer {
        padding: 20px;
      }
      .query-text {
        font-size: 16px;
      }
      .response-text {
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🤖 Gemini AI Agent</h1>
        <p>Powered by Google Gemini 2.0 Flash</p>
        <span class="badge">Tool: ${tool}</span>
      </div>
      <div class="query-section">
        <div class="query-label">Your Question</div>
        <div class="query-text">${escapeHtml(query)}</div>
      </div>
      <div class="response-section">
        <div class="response-text">${escapeHtml(response).replace(/\n/g, '<br>')}</div>
        ${videoHTML}
      </div>
      <div class="footer">
        User ID: ${escapeHtml(uid)} | Generated at ${new Date().toLocaleString()}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
