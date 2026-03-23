const axios = require("axios");
const crypto = require("crypto");

module.exports = {
  meta: {
    name: "Tsundere Text-to-Speech",
    description: "AI Voice with Tsundere style - converts text to speech with tsundere tone (cute/playful)",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "POST",
    path: "/api/ai/tsundere"
  },
  
  onStart: async function({ req, res }) {
    try {
      const { text, voice = "Kore", language = "id-ID", speed = 1.1, pitch = 2.5 } = req.body;
      
      if (!text) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          message: "Parameter 'text' wajib diisi."
        });
      }
      
      // Validate text length
      if (text.length > 500) {
        return res.status(413).json({
          success: false,
          author: "Jaybohol",
          message: "Text too long. Maximum 500 characters."
        });
      }
      
      // Parse parameters
      let parsedSpeed = parseFloat(speed);
      if (isNaN(parsedSpeed) || parsedSpeed < 0.5 || parsedSpeed > 2.0) parsedSpeed = 1.1;
      
      let parsedPitch = parseFloat(pitch);
      if (isNaN(parsedPitch) || parsedPitch < 0.5 || parsedPitch > 5.0) parsedPitch = 2.5;
      
      const selectedVoice = voice || "Kore";
      const selectedLanguage = language || "id-ID";
      
      console.log(`🎙️ Generating Tsundere TTS: "${text.substring(0, 50)}..."`);
      
      // Generate TTS audio
      const audioBuffer = await generateTsundereTTS(text, selectedVoice, selectedLanguage, parsedSpeed, parsedPitch);
      
      // Generate unique ID for the audio
      const audioId = generateAudioId(text);
      
      // Store audio temporarily
      if (!global.audioCache) global.audioCache = new Map();
      global.audioCache.set(audioId, audioBuffer);
      
      // Clean up after 5 minutes
      setTimeout(() => {
        global.audioCache.delete(audioId);
      }, 5 * 60 * 1000);
      
      // Get the domain from the request
      const domain = `${req.protocol}://${req.get('host')}`;
      const audioUrl = `${domain}/api/media/${audioId}`;
      
      res.json({
        success: true,
        author: "Jaybohol",
        result: {
          text: text,
          audio: audioUrl
        }
      });
      
    } catch (error) {
      console.error("Tsundere TTS Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        message: error.message || "Failed to generate Tsundere TTS"
      });
    }
  }
};

// ============= MEDIA ENDPOINT (for serving audio) =============

// Add this as a separate API endpoint for serving audio files
module.exports.media = {
  meta: {
    name: "Tsundere Media",
    description: "Serve generated Tsundere TTS audio files",
    author: "Jaybohol",
    version: "1.0.0",
    category: "media",
    method: "GET",
    path: "/api/media/:id"
  },
  
  onStart: async function({ req, res }) {
    try {
      const { id } = req.params;
      
      if (!global.audioCache || !global.audioCache.has(id)) {
        return res.status(404).json({
          success: false,
          message: "Audio not found or expired"
        });
      }
      
      const audioBuffer = global.audioCache.get(id);
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'inline');
      res.send(audioBuffer);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// ============= HELPER FUNCTIONS =============

function generateFakeIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join('.');
}

function generateAudioId(text) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${text}${timestamp}`).digest('hex');
  return `${hash.substring(0, 32)}:${random}`;
}

async function generateTsundereTTS(text, voice, language, speed, pitch) {
  const url = 'https://api.screenapp.io/v2/proxy/google/tts';
  const fakeIP = generateFakeIP();
  
  const payload = {
    "input": text,
    "model": "gemini-2.5-flash-tts",
    "voice": voice,
    "language_code": language,
    "response_format": "mp3",
    "speaking_rate": speed,
    "pitch": pitch,
    "volume_gain_db": 0
  };
  
  const headers = {
    'authority': 'api.screenapp.io',
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://screenapp.io',
    'referer': 'https://screenapp.io/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    'x-forwarded-for': fakeIP,
    'client-ip': fakeIP,
    'via': '1.1 google'
  };
  
  try {
    const response = await axios({
      method: 'post',
      url: url,
      data: payload,
      headers: headers,
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const audioBuffer = Buffer.from(response.data);
    
    if (audioBuffer.length < 1000) {
      throw new Error("Generated audio is too small, possibly invalid");
    }
    
    return audioBuffer;
  } catch (error) {
    console.error("Tsundere TTS API Error:", error.message);
    
    if (error.response) {
      throw new Error(`TTS Error: ${error.response.status}`);
    }
    throw new Error(error.message || 'Failed to generate Tsundere TTS');
  }
}
