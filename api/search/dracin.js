// api/dracin.js - With multiple fallback uploaders

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
      
      const audioBuffer = await generateDracinTTS(text, parsedSpeed, useBg, bgVol);
      
      // Try multiple upload services
      let audioUrl = null;
      
      // Try 0x0.st first
      try {
        audioUrl = await uploadTo0x0(audioBuffer);
      } catch (e) {
        console.log("0x0.st failed, trying tmp.ninja...");
        
        // Try tmp.ninja
        try {
          audioUrl = await uploadToTmpNinja(audioBuffer);
        } catch (e2) {
          console.log("tmp.ninja failed, trying base64 fallback...");
        }
      }
      
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
          audio: audioUrl || `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
          settings: {
            speed: parsedSpeed,
            background_music: useBg,
            music_volume: bgVol
          },
          ...(!audioUrl && { note: "Using base64 audio (upload services unavailable)" })
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

async function generateDracinTTS(text, speed = 1.0, useBg = true, bgVol = 0.3) {
  const url = 'https://ricky01anjay-suaraind.hf.space/generate';
  
  try {
    const response = await axios.get(url, {
      params: { text, speed, use_bg: useBg, bg_vol: bgVol },
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const audioBuffer = Buffer.from(response.data);
    
    if (audioBuffer.length < 1000 || audioBuffer.toString('utf8', 0, 10).includes('LAME')) {
      throw new Error("Generated audio is invalid or corrupted");
    }
    
    return audioBuffer;
  } catch (error) {
    console.error("Dracin TTS API Error:", error.message);
    throw new Error(`Failed to generate Dracin TTS: ${error.message}`);
  }
}

// Primary upload: 0x0.st (fast, reliable)
async function uploadTo0x0(buffer) {
  const form = new FormData();
  form.append("file", buffer, "audio.mp3");
  
  const response = await axios.post("https://0x0.st", form, {
    headers: form.getHeaders(),
    timeout: 30000
  });
  
  const url = response.data.trim();
  if (url && url.startsWith('http')) {
    console.log(`✅ Uploaded to 0x0.st: ${url}`);
    return url;
  }
  throw new Error("0x0.st upload failed");
}

// Fallback upload: tmp.ninja
async function uploadToTmpNinja(buffer) {
  const formData = new FormData();
  formData.append('file', buffer, { filename: `dracin-${Date.now()}.mp3` });
  
  const response = await axios.post('https://tmp.ninja/api.php', formData, {
    headers: formData.getHeaders(),
    timeout: 15000
  });
  
  if (response.data && response.data.url) {
    console.log(`✅ Uploaded to tmp.ninja: ${response.data.url}`);
    return response.data.url;
  }
  throw new Error("tmp.ninja upload failed");
}
