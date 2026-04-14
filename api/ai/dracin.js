// api/dracin.js

const axios = require("axios");
const FormData = require("form-data");

module.exports = {
  meta: {
    name: "Dracin Text-to-Speech",
    description: "AI Voice with Drama China (Dracin) style - converts text to speech with Chinese drama narrator style",
    author: "Jaybohol",
    version: "2.0.0",
    category: "ai",
    method: "GET",
    path: "/dracin/tts?text=&speed=&music=&volume="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { text, speed = 1.0, music = "true", volume = 0.3, stream = "false" } = req.query;
      
      if (!text) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Text is required",
          usage: "/dracin/tts?text=Hello%20World&speed=1.0&music=true&volume=0.3"
        });
      }
      
      // Validate text length
      if (text.length > 500) {
        return res.status(413).json({
          status: false,
          error: "Text too long. Maximum 500 characters"
        });
      }
      
      // Parse parameters
      let parsedSpeed = parseFloat(speed);
      if (isNaN(parsedSpeed) || parsedSpeed < 0.5 || parsedSpeed > 2.0) parsedSpeed = 1.0;
      
      let useBg = music === "true" || music === "1" || music === "yes";
      let bgVol = parseFloat(volume);
      if (isNaN(bgVol) || bgVol < 0.1 || bgVol > 1.0) bgVol = 0.3;
      
      console.log(`🎙️ Generating Dracin TTS: "${text.substring(0, 50)}..."`);
      
      // Generate TTS audio
      const audioBuffer = await generateDracinTTS(text, parsedSpeed, useBg, bgVol);
      
      // Upload to Uguu.se
      const audioUrl = await uploadToUguu(audioBuffer);
      
      // Stream directly if requested
      if (stream === "true") {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline; filename="dracin-tts.mp3"');
        return res.send(audioBuffer);
      }
      
      res.json({
        status: true,
        operator: "Jaybohol",
        result: {
          text: text,
          audio: audioUrl,
          settings: {
            speed: parsedSpeed,
            background_music: useBg,
            music_volume: bgVol
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Dracin TTS Error:", error.message);
      
      // Fallback: Return base64 if upload fails
      try {
        const audioBuffer = await generateDracinTTS(text, parsedSpeed, useBg, bgVol);
        const base64Audio = audioBuffer.toString('base64');
        
        res.json({
          status: true,
          operator: "Jaybohol",
          result: {
            text: text,
            audio: `data:audio/mpeg;base64,${base64Audio}`,
            settings: {
              speed: parsedSpeed,
              background_music: useBg,
              music_volume: bgVol
            },
            note: "Base64 audio (upload service unavailable)"
          },
          timestamp: new Date().toISOString()
        });
      } catch (fallbackError) {
        res.status(500).json({
          status: false,
          operator: "Jaybohol",
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
};

// ============= DRACIN TTS GENERATOR =============

async function generateDracinTTS(text, speed = 1.0, useBg = true, bgVol = 0.3) {
  const url = 'https://ricky01anjay-suaraind.hf.space/generate';
  
  try {
    const response = await axios.get(url, {
      params: {
        text: text,
        speed: speed,
        use_bg: useBg,
        bg_vol: bgVol
      },
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const audioBuffer = Buffer.from(response.data);
    
    // Check if the buffer contains valid MP3 data
    if (audioBuffer.length < 1000) {
      throw new Error("Generated audio is invalid or corrupted");
    }
    
    return audioBuffer;
  } catch (error) {
    console.error("Dracin TTS API Error:", error.message);
    
    if (error.response) {
      throw new Error(`External API Error: ${error.response.status} - ${error.response.statusText}`);
    }
    throw new Error(`Dracin TTS External API Error: ${error.message}`);
  }
}

// ============= UGUU.SE UPLOAD =============

async function uploadToUguu(buffer) {
  try {
    const formData = new FormData();
    formData.append('files[]', buffer, { filename: `dracin-${Date.now()}.mp3` });
    
    const response = await axios.post('https://uguu.se/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    // Uguu.se returns different response formats
    let url = null;
    
    if (typeof response.data === 'string') {
      // Text response (csv or plain text)
      const lines = response.data.trim().split('\n');
      if (lines[0] && lines[0].startsWith('http')) {
        url = lines[0].trim();
      }
    } else if (response.data && response.data.files && response.data.files[0]) {
      // JSON response
      url = response.data.files[0].url;
    } else if (response.data && response.data.url) {
      url = response.data.url;
    } else if (Array.isArray(response.data) && response.data[0]) {
      url = response.data[0].url || response.data[0];
    }
    
    if (url && url.startsWith('http')) {
      console.log(`✅ Uploaded to Uguu.se: ${url}`);
      return url;
    }
    
    throw new Error("Uguu.se upload failed: Invalid response format");
    
  } catch (error) {
    console.error("Uguu.se Upload Error:", error.message);
    throw new Error("Failed to upload audio to Uguu.se");
  }
}
