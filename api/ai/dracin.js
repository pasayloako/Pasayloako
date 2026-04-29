// api/dracin.js

const axios = require("axios");
const crypto = require("crypto");

module.exports = {
  meta: {
    name: "Dracin Text-to-Speech",
    description: "AI Voice with Drama China (Dracin) style - converts text to speech with Chinese drama narrator style",
    author: "Jaybohol",
    version: "2.1.0",
    category: "ai",
    method: "GET",
    path: "/dracin/tts?text="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { text, speed = 1.0, music = "true", volume = 0.3, stream = "false", format = "json" } = req.query;
      
      if (!text) {
        return res.status(400).json({
          status: false,
          author: "Jaybohol",
          error: "Text is required",
          usage: "/api/dracin/tts?text=Hello%20World",
          example: "/api/dracin/tts?text=在中国戏剧中，叙事者的声音非常独特"
        });
      }
      
      if (text.length > 500) {
        return res.status(413).json({
          status: false,
          error: "Text too long. Maximum 500 characters"
        });
      }
      
      // Validate parameters
      let parsedSpeed = parseFloat(speed);
      if (isNaN(parsedSpeed) || parsedSpeed < 0.5 || parsedSpeed > 2.0) parsedSpeed = 1.0;
      
      let useBg = music === "true" || music === "1" || music === "yes";
      let bgVol = parseFloat(volume);
      if (isNaN(bgVol) || bgVol < 0.1 || bgVol > 1.0) bgVol = 0.3;
      
      console.log(`🎙️ Generating Dracin TTS: "${text.substring(0, 50)}..."`);
      
      // Generate TTS audio
      const audioBuffer = await generateDracinTTS(text, parsedSpeed, useBg, bgVol);
      
      // Stream directly if requested
      if (stream === "true" || format === "audio") {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline; filename="dracin-tts.mp3"');
        return res.send(audioBuffer);
      }
      
      // Upload to free hosting (multiple fallbacks)
      const audioUrl = await uploadToHosting(audioBuffer);
      
      res.json({
        status: true,
        author: "Jaybohol",
        result: {
          text: text,
          audio_url: audioUrl,
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
      
      // Fallback response with alternative TTS
      try {
        const fallbackAudio = await generateFallbackTTS(text);
        if (fallbackAudio) {
          const fallbackUrl = await uploadToHosting(fallbackAudio);
          return res.json({
            status: true,
            warning: "Using fallback TTS engine",
            result: {
              text: text,
              audio_url: fallbackUrl,
              fallback: true
            }
          });
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError.message);
      }
      
      res.status(500).json({
        status: false,
        author: "Jaybohol",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// ============= DRACIN TTS GENERATOR =============

async function generateDracinTTS(text, speed = 1.0, useBg = true, bgVol = 0.3) {
  // Try multiple TTS endpoints
  const endpoints = [
    {
      url: 'https://ricky01anjay-suaraind.hf.space/generate',
      params: { text, speed, use_bg: useBg, bg_vol: bgVol }
    },
    {
      url: 'https://sukasuka-chinese-tts.hf.space/generate',
      params: { text, speed: speed, voice: "drama" }
    },
    {
      url: 'https://api.voicemaker.in/v1.0/text-to-speech',
      params: { text, voice: "zh-CN-DramaNarrator", speed: speed }
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, {
        params: endpoint.params,
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'audio/mpeg,audio/*'
        }
      });
      
      const audioBuffer = Buffer.from(response.data);
      
      if (audioBuffer.length > 5000) { // Valid audio file
        console.log(`✅ TTS generated from: ${endpoint.url}`);
        return audioBuffer;
      }
    } catch (error) {
      console.log(`Endpoint ${endpoint.url} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error("All TTS endpoints failed");
}

// ============= FALLBACK TTS (Google Translate) =============

async function generateFallbackTTS(text) {
  try {
    // Google Translate TTS as fallback
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=tw-ob`;
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error("Fallback TTS failed:", error.message);
    return null;
  }
}

// ============= FILE HOSTING (Multiple Options) =============

async function uploadToHosting(buffer) {
  // Try multiple hosting services
  const hosts = [
    () => uploadToTempSh(buffer),
    () => uploadToFileIo(buffer),
    () => uploadToGoFile(buffer)
  ];
  
  for (const uploader of hosts) {
    try {
      const url = await uploader();
      if (url) return url;
    } catch (error) {
      console.log("Hosting upload failed:", error.message);
      continue;
    }
  }
  
  // If all uploads fail, return data URI
  return `data:audio/mpeg;base64,${buffer.toString('base64')}`;
}

async function uploadToTempSh(buffer) {
  const formData = new FormData();
  formData.append('file', buffer, { filename: `dracin-${Date.now()}.mp3` });
  
  const response = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  
  if (response.data && response.data.data && response.data.data.url) {
    return response.data.data.url.replace('/tmpfiles.org/', '/tmpfiles.org/dl/');
  }
  throw new Error('Temp.sh upload failed');
}

async function uploadToFileIo(buffer) {
  const formData = new FormData();
  formData.append('file', buffer, `dracin-${Date.now()}.mp3`);
  
  const response = await axios.post('https://file.io/', formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  
  if (response.data && response.data.success && response.data.link) {
    return response.data.link;
  }
  throw new Error('File.io upload failed');
}

async function uploadToGoFile(buffer) {
  const formData = new FormData();
  formData.append('file', buffer, `dracin-${Date.now()}.mp3`);
  
  const response = await axios.post('https://gofile.io/uploadFile', formData, {
    headers: formData.getHeaders(),
    timeout: 20000
  });
  
  if (response.data && response.data.data && response.data.data.downloadPage) {
    return response.data.data.downloadPage;
  }
  throw new Error('GoFile upload failed');
}

// Add FormData if not already available
let FormData;
try {
  FormData = require('form-data');
} catch (e) {
  // Fallback for environments without form-data
  FormData = class FormData {
    constructor() {
      this._data = [];
    }
    append(key, value, filename) {
      this._data.push({ key, value, filename });
    }
    getHeaders() {
      return { 'Content-Type': 'multipart/form-data' };
    }
  };
}
