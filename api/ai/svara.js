const axios = require("axios");

module.exports = {
  meta: {
    name: "Svara Text-to-Speech",
    description: "Convert text to speech using Svara AI with multiple voice options",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/svara/tts?text=&voice="
  },
  
  onStart: async function({ req, res }) {
    try {
      // Get parameters from query string (GET method)
      const { text, voice } = req.query;
      
      // Validate required parameters
      if (!text) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Text is required",
          usage: {
            example: "/svara/tts?text=Hello%20World&voice=bella",
            parameters: {
              text: "Text to convert to speech (max 300 characters)",
              voice: "Voice name (e.g., bella, adam, alloy)"
            }
          }
        });
      }
      
      if (!voice) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Voice parameter is required",
          available_voices: Object.keys(voiceMap).slice(0, 20).join(", ") + "..."
        });
      }
      
      // Validate text length
      if (text.length > 300) {
        return res.status(413).json({
          status: false,
          operator: "Jaybohol",
          error: "Text too long",
          details: {
            max_length: 300,
            current_length: text.length
          }
        });
      }
      
      // Get voice ID
      const voiceId = getVoiceId(voice);
      if (!voiceId) {
        return res.status(422).json({
          status: false,
          operator: "Jaybohol",
          error: "Invalid voice name",
          available_voices: Object.keys(voiceMap).join(", ")
        });
      }
      
      // Generate speech
      const result = await generateSpeech(text, voiceId);
      
      if (result.success) {
        res.json({
          status: true,
          operator: "Jaybohol",
          text: text,
          text_length: text.length,
          voice: voice,
          voice_id: voiceId,
          audio_url: result.audio_url,
          credits: "Jaybohol",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(result.code || 500).json({
          status: false,
          operator: "Jaybohol",
          error: result.error,
          details: result.details
        });
      }
      
    } catch (error) {
      console.error("Svara TTS Error:", error.message);
      
      res.status(500).json({
        status: false,
        operator: "Jaybohol",
        error: "Failed to generate speech",
        details: error.message
      });
    }
  }
};

// ============= VOICE MAPPING =============

const voiceMap = {
  // American English - Female
  'alloy': 'af_alloy',
  'aoede': 'af_aoede',
  'bella': 'af_bella',
  'heart': 'af_heart',
  'jessica': 'af_jessica',
  'kore': 'af_kore',
  'nicole': 'af_nicole',
  'nova': 'af_nova',
  'river': 'af_river',
  'sarah': 'af_sarah',
  'sky': 'af_sky',
  
  // American English - Male
  'adam': 'am_adam',
  'echo': 'am_echo',
  'eric': 'am_eric',
  'fenrir': 'am_fenrir',
  'liam': 'am_liam',
  'michael': 'am_michael',
  'onyx': 'am_onyx',
  'puck': 'am_puck',
  'santa': 'am_santa',
  
  // British English - Female
  'alice': 'bf_alice',
  'emma': 'bf_emma',
  'isabella': 'bf_isabella',
  'lily': 'bf_lily',
  
  // British English - Male
  'daniel': 'bm_daniel',
  'fable': 'bm_fable',
  'george': 'bm_george',
  'lewis': 'bm_lewis',
  
  // Hindi - Female
  'anaya': 'hf_alpha',
  'riya': 'hf_beta',
  
  // Hindi - Male
  'arjun': 'hm_omega',
  'kabir': 'hm_psi',
  
  // Other
  'dora': 'ef_dora',
  'santiago': 'em_alex',
  'noel': 'em_santa',
  'siwis': 'ff_siwis',
  
  // Japanese - Female
  'aiko': 'jf_alpha',
  'gongitsune': 'jf_gongitsune',
  'nezumi': 'jf_nezumi',
  'tebukuro': 'jf_tebukuro',
  
  // Japanese - Male
  'kumo': 'jm_kumo',
  
  // Indonesian - Female
  'sara': 'if_sara',
  
  // Indonesian - Male
  'nicola': 'im_nicola',
  
  // Portuguese - Female
  'doras': 'pf_dora',
  
  // Portuguese - Male
  'alex': 'pm_alex',
  'antonio': 'pm_santa',
  
  // Chinese - Female
  'xiaobei': 'zf_xiaobei',
  'xiaoni': 'zf_xiaoni',
  'xiaoxiao': 'zf_xiaoxiao',
  'xiaoyi': 'zf_xiaoyi',
  
  // Chinese - Male
  'yunjian': 'zm_yunjian',
  'yunxi': 'zm_yunxi',
  'yunxia': 'zm_yunxia',
  'yunyang': 'zm_yunyang'
};

function getVoiceId(voiceName) {
  const normalized = voiceName.toLowerCase().trim();
  return voiceMap[normalized] || null;
}

// ============= SVARA API CONFIGURATION =============

// Customer ID from Uint8Array
const cidBytes = new Uint8Array([
  0x24, 0x52, 0x43, 0x41, 0x6e, 0x6f, 0x6e, 0x79,
  0x6d, 0x6f, 0x75, 0x73, 0x49, 0x44, 0x3a, 0x31,
  0x33, 0x65, 0x38, 0x37, 0x35, 0x33, 0x61, 0x65,
  0x36, 0x31, 0x39, 0x34, 0x63, 0x37, 0x62, 0x39,
  0x32, 0x37, 0x33, 0x32, 0x64, 0x36, 0x36, 0x64,
  0x37, 0x30, 0x32, 0x33, 0x30, 0x37, 0x32
]);

// Auth token from Uint8Array
const authBytes = new Uint8Array([
  0x77, 0x76, 0x65, 0x62, 0x6e, 0x79, 0x75, 0x36, 0x36, 0x36, 0x38, 0x37, 0x35, 0x36, 0x68, 0x34,
  0x35, 0x67, 0x66, 0x65, 0x63, 0x64, 0x66, 0x65, 0x67, 0x6e, 0x68, 0x6d, 0x75, 0x36, 0x6b, 0x6a,
  0x35, 0x68, 0x36, 0x34, 0x67, 0x35, 0x33, 0x66, 0x76, 0x72, 0x62, 0x67, 0x6e, 0x79, 0x35
]);

function decodeUint8Array(bytes) {
  return new TextDecoder().decode(bytes);
}

const CUSTOMER_ID = decodeUint8Array(cidBytes);
const AUTH_TOKEN = decodeUint8Array(authBytes);

const API_CONFIG = {
  baseUrl: 'https://svara.aculix.net',
  endpoint: '/generate-speech',
  headers: {
    'user-agent': 'NB Android/1.0.0',
    'accept-encoding': 'gzip',
    'content-type': 'application/json',
    'authorization': AUTH_TOKEN
  }
};

// ============= SPEECH GENERATION =============

async function generateSpeech(text, voiceId) {
  try {
    const requestBody = {
      customerId: CUSTOMER_ID,
      text: text,
      voice: voiceId
    };
    
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoint}`;
    
    const response = await axios.post(url, requestBody, {
      headers: API_CONFIG.headers,
      timeout: 30000
    });
    
    const { outputUrl } = response.data;
    
    return {
      success: true,
      audio_url: outputUrl,
      voice: voiceId,
      text_length: text.length
    };
    
  } catch (error) {
    console.error("Svara API Error:", error.message);
    
    if (error.response) {
      return {
        success: false,
        code: error.response.status,
        error: error.response.data?.message || "API request failed",
        details: error.response.data
      };
    }
    
    return {
      success: false,
      code: 500,
      error: error.message || "Internal server error",
      details: null
    };
  }
}
