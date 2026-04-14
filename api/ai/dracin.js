// api/dracin.js

const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

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
          usage: "/dracin/tts?text=Hello%20World"
        });
      }
      
      if (text.length > 500) {
        return res.status(413).json({
          status: false,
          error: "Text too long. Maximum 500 characters"
        });
      }
      
      let parsedSpeed = parseFloat(speed);
      if (isNaN(parsedSpeed) || parsedSpeed < 0.5 || parsedSpeed > 2.0) parsedSpeed = 1.0;
      
      let useBg = music === "true" || music === "1" || music === "yes";
      let bgVol = parseFloat(volume);
      if (isNaN(bgVol) || bgVol < 0.1 || bgVol > 1.0) bgVol = 0.3;
      
      console.log(`🎙️ Generating Dracin TTS: "${text.substring(0, 50)}..."`);
      
      // Generate TTS audio
      const audioBuffer = await generateDracinTTS(text, parsedSpeed, useBg, bgVol);
      
      // Upload to PixelDrain
      const audioUrl = await uploadToPixelDrain(audioBuffer);
      
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
      
      res.status(500).json({
        status: false,
        operator: "Jaybohol",
        error: error.message,
        timestamp: new Date().toISOString()
      });
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
    
    if (audioBuffer.length < 1000) {
      throw new Error("Generated audio is invalid or corrupted");
    }
    
    return audioBuffer;
  } catch (error) {
    console.error("Dracin TTS API Error:", error.message);
    throw new Error(`Failed to generate Dracin TTS: ${error.message}`);
  }
}

// ============= PIXELDRAIN UPLOAD (WORKING) =============

async function uploadToPixelDrain(buffer) {
  try {
    // Generate unique file ID
    const fileId = crypto.randomBytes(16).toString('hex');
    
    // Upload to PixelDrain using PUT method
    const response = await axios.put(`https://pixeldrain.com/api/file/${fileId}`, buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': buffer.length
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    if (response.status === 200 || response.status === 201) {
      const downloadUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
      console.log(`✅ Uploaded to PixelDrain: ${downloadUrl}`);
      return downloadUrl;
    }
    
    throw new Error(`Upload failed with status: ${response.status}`);
    
  } catch (error) {
    console.error("PixelDrain Upload Error:", error.message);
    
    // Alternative upload method using POST
    try {
      const formData = new FormData();
      formData.append('file', buffer, { filename: `dracin-${Date.now()}.mp3` });
      
      const altResponse = await axios.post('https://pixeldrain.com/api/file', formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      if (altResponse.data && altResponse.data.id) {
        const downloadUrl = `https://pixeldrain.com/api/file/${altResponse.data.id}?download`;
        console.log(`✅ Uploaded to PixelDrain (alternative): ${downloadUrl}`);
        return downloadUrl;
      }
      
      throw new Error("All upload methods failed");
      
    } catch (altError) {
      console.error("PixelDrain Alternative Error:", altError.message);
      throw new Error("Failed to upload audio to PixelDrain");
    }
  }
}
