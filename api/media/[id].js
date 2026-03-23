// file: api/media/[id].js

module.exports = {
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
      
      console.log(`🔊 Audio request for ID: ${id}`);
      
      // Check if audio exists in cache
      if (!global.audioCache || !global.audioCache.has(id)) {
        return res.status(404).json({
          success: false,
          error: "Audio not found or expired",
          message: "Audio files are only stored for 5 minutes. Please generate again."
        });
      }
      
      const audioBuffer = global.audioCache.get(id);
      
      // Set correct headers for MP3 audio
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="tsundere-audio.mp3"');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send the audio buffer
      return res.send(audioBuffer);
      
    } catch (error) {
      console.error("Media Error:", error.message);
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};
