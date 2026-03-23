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
      
      // Upload to temporary storage to get a URL
      const audioUrl = await uploadToTmp(audioBuffer, `dracin-${Date.now()}.mp3`);
      
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
    
    // Check if the buffer contains valid MP3 data (not just LAME header)
    if (audioBuffer.length < 1000 || audioBuffer.toString('utf8', 0, 10).includes('LAME')) {
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

// ============= UPLOAD TO TEMPORARY STORAGE =============

async function uploadToTmp(buffer, filename) {
  // Option 1: Upload to tmp.ninja
  try {
    const formData = new FormData();
    formData.append('file', buffer, { filename: filename });
    
    const response = await axios.post('https://tmp.ninja/api.php', formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    });
    
    if (response.data && response.data.url) {
      return response.data.url;
    }
  } catch (error) {
    console.log("tmp.ninja upload failed, trying alternative...");
  }
  
  // Option 2: Upload to catbox.moe
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', buffer, { filename: filename });
    
    const response = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    });
    
    if (response.data && response.data.startsWith('http')) {
      return response.data;
    }
  } catch (error) {
    console.log("catbox.moe upload failed");
  }
  
  // Option 3: Return base64 as fallback (with proper encoding)
  const base64Data = buffer.toString('base64');
  return `data:audio/mpeg;base64,${base64Data}`;
}
