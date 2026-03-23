// api/media/[id].js
// This file handles requests like: /api/media/some-audio-id

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
      // Get the audio ID from URL parameter
      // In Express, this would be req.params.id
      // In your API structure, the ID might be in req.query or req.params
      const id = req.params?.id || req.query?.id;
      
      console.log(`🔊 Audio request for ID: ${id}`);
      
      // Check if cache exists
      if (!global.audioCache) {
        console.log("❌ No audio cache found");
        return res.status(404).json({
          success: false,
          error: "No audio cache found. Please generate TTS first."
        });
      }
      
      // Check if audio exists in cache
      if (!global.audioCache.has(id)) {
        console.log(`❌ Audio not found. Available IDs: ${Array.from(global.audioCache.keys()).join(', ')}`);
        return res.status(404).json({
          success: false,
          error: "Audio not found or expired",
          message: "Audio files are only stored for 5 minutes. Please generate again."
        });
      }
      
      const audioBuffer = global.audioCache.get(id);
      console.log(`✅ Audio found! Size: ${audioBuffer.length} bytes`);
      
      // Set headers for MP3 audio
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="tsundere-audio.mp3"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      
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
