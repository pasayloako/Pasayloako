const axios = require('axios');

module.exports = {
  meta: {
    name: "Cosplay (Video)",
    description: "Fetch random cosplay videos",
    author: "selov",
    version: "1.0.0",
    category: "random",
    method: "GET",
    path: "/cosplay"
  },
  
  onStart: async function({ req, res }) {
    try {
      const owner = 'LeiamNashRebirth';
      const repo = 'cosplay';
      const branch = 'main';
      
      const repoUrl = `https://github.com/${owner}/${repo}/tree/${branch}/`;
      const response = await axios.get(repoUrl);
      const html = response.data;
      
      const videoFileRegex = /href="\/LeiamNashRebirth\/cosplay\/blob\/main\/([^"]+\.mp4)"/g;
      const videoFiles = [];
      let match;
      
      while ((match = videoFileRegex.exec(html)) !== null) {
        videoFiles.push(match[1]);
      }
      
      if (videoFiles.length === 0) {
        return res.status(404).json({ status: false, error: "No videos found in the repository" });
      }
      
      const randomVideo = videoFiles[Math.floor(Math.random() * videoFiles.length)];
      const videoUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${randomVideo}`;
      
      res.json({
        status: true,
        videoUrl
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: "Failed to fetch random video"
      });
    }
  }
};
