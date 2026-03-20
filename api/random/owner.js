const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  meta: {
    name: "Ownersv2 Video",
    description: "Returns a random ownersv2 video from a predefined list of video URLs or local files",
    author: "Jay",
    version: "1.0.0",
    category: "random",
    method: "GET",
    path: "/owners",
    media_type: "video/mp4"
  },
  
  onStart: async function({ req, res }) {
    try {
      // Predefined list of video sources (URLs or local file paths)
      const VIDEO_SOURCES = [
        "assets/videos/jujinciciprajiks.mp4",  // Local file path
        "assets/videos/kaizenega.mp4",         // Local file path
        // Add more video URLs or paths here
      ];
      
      // Filter out empty strings and select a random video source
      const validSources = VIDEO_SOURCES.filter(source => source && source.trim() !== "");
      
      if (validSources.length === 0) {
        return res.status(404).json({ 
          status: false, 
          error: "No valid video sources available" 
        });
      }
      
      const selectedSource = validSources[Math.floor(Math.random() * validSources.length)];
      
      // Check if the source is a local file (not a URL)
      const isLocalFile = !selectedSource.startsWith("http://") && !selectedSource.startsWith("https://");
      
      if (isLocalFile) {
        // Handle local file
        const filePath = path.join(__dirname, selectedSource);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ 
            status: false, 
            error: `Local video file not found: ${selectedSource}` 
          });
        }
        
        // Read and stream the local file
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        // Handle range requests for video streaming
        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const file = fs.createReadStream(filePath, { start, end });
          
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
          });
          file.pipe(res);
        } else {
          // Stream the entire file
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
          });
          fs.createReadStream(filePath).pipe(res);
        }
      } else {
        // Handle remote URL
        const response = await axios.get(selectedSource, {
          responseType: 'stream',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        // Set video headers
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', response.headers['content-length']);
        
        // Stream the video
        response.data.pipe(res);
      }
      
    } catch (error) {
      console.error("Ownersv2 API Error:", error.message);
      
      res.status(500).json({
        status: false,
        error: "Failed to fetch random video",
        details: error.message
      });
    }
  }
};
