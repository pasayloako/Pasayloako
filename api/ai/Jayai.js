const axios = require("axios");
const fs = require("fs");

// Memory per user for conversation context
const memory = {};

function saveMemory(uid) {
  try {
    if (uid) {
      fs.writeFileSync(`toolbot_memory_${uid}.json`, JSON.stringify(memory[uid], null, 2), 'utf8');
    }
  } catch (e) {
    console.error('Error saving toolbot memory:', e.message);
  }
}

function loadMemory(uid) {
  try {
    const file = `toolbot_memory_${uid}.json`;
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading toolbot memory:', e.message);
  }
  return null;
}

const meta = {
  name: "Jay Ai",
  path: "/toolbot?query=",
  method: "get",
  category: "ai"
};

async function onStart({ req, res }) {
  const { query, system, uid } = req.query;

  if (!query) {
    return res.status(400).json({
      status: false,
      error: "Missing required parameter: query",
      usage: "/api/toolbot?query=your question here&system=JAY-API+ENGINE&uid=123",
      example: "/api/toolbot?query=What is JavaScript?"
    });
  }

  // Initialize memory for user
  if (uid && !memory[uid]) {
    const saved = loadMemory(uid);
    memory[uid] = saved || [];
  }

  // Add user message to memory
  if (uid) {
    memory[uid].push({ role: "user", content: query, timestamp: Date.now() });
  }

  // Build system parameter (default to JAY-API ENGINE)
  const systemParam = system || "JAY-API ENGINE";

  try {
    // Call the working API
    const response = await axios.get(
      `https://api.sxtream.my.id/ai/toolbot?query=${encodeURIComponent(query)}&system=${encodeURIComponent(systemParam)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    let aiResponse = null;
    
    // Parse response based on the actual format
    if (response.data && response.data.status === true) {
      aiResponse = response.data.result || response.data.response || "No response from API";
    } else if (response.data && response.data.result) {
      aiResponse = response.data.result;
    } else if (response.data && response.data.response) {
      aiResponse = response.data.response;
    } else {
      aiResponse = "I received your message but couldn't process it. Please try again.";
    }

    // Save assistant response to memory
    if (uid && aiResponse) {
      memory[uid].push({ role: "assistant", content: aiResponse, timestamp: Date.now() });
      
      // Keep memory manageable (last 50 messages)
      if (memory[uid].length > 50) {
        memory[uid] = memory[uid].slice(-50);
      }
      saveMemory(uid);
    }

    res.json({
      status: true,
      response: aiResponse,
      system: systemParam,
      query: query,
      uid: uid || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("JayAi API Error:", error.message);
    
    res.status(500).json({
      status: false,
      error: error.message,
      query: query,
      suggestion: "Please check your connection or try again later."
    });
  }
}

module.exports = { meta, onStart };
