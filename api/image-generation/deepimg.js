// api/deepimg.js

const axios = require("axios");

module.exports = {
  meta: {
    name: "DeepImg AI",
    description: "Generate images from text prompt using deepimg.ai API",
    author: "Jaybohol",
    version: "1.0.0",
    category: "image generation",
    method: "GET",
    path: "/deepimg?prompt="
  },
  
  onStart: async function({ req, res }) {
    try {
      let { prompt, style = "default", size = "1:1" } = req.query;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          error: "Missing required parameter: prompt",
          usage: {
            example: "/deepimg?prompt=girl%20wearing%20glasses",
            parameters: {
              prompt: "Text prompt for image generation (required)",
              style: "Image style: default, ghibli, cyberpunk, anime, portrait, chibi, pixel art, oil painting, 3d (default: default)",
              size: "Image size: 1:1, 3:2, 2:3 (default: 1:1)"
            }
          }
        });
      }
      
      // Style mapping
      const styleList = {
        default: "-style Realism",
        ghibli: "-style Ghibli Art",
        cyberpunk: "-style Cyberpunk",
        anime: "-style Anime",
        portrait: "-style Portrait",
        chibi: "-style Chibi",
        "pixel art": "-style Pixel Art",
        "oil painting": "-style Oil Painting",
        "3d": "-style 3D"
      };
      
      // Size mapping
      const sizeList = {
        "1:1": "1024x1024",
        "3:2": "1080x720",
        "2:3": "720x1080"
      };
      
      // Validate style
      if (!styleList[style]) {
        return res.status(400).json({
          success: false,
          error: `Invalid style. Available styles: ${Object.keys(styleList).join(", ")}`,
          available_styles: Object.keys(styleList)
        });
      }
      
      // Validate size
      if (!sizeList[size]) {
        return res.status(400).json({
          success: false,
          error: `Invalid size. Available sizes: ${Object.keys(sizeList).join(", ")}`,
          available_sizes: Object.keys(sizeList)
        });
      }
      
      console.log(`🎨 Generating image for: "${prompt}" (style: ${style}, size: ${size})`);
      
      // Generate random device ID
      const deviceId = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
      
      // Headers
      const headers = {
        "Content-Type": "application/json",
        "origin": "https://deepimg.ai",
        "referer": "https://deepimg.ai/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"
      };
      
      // Request body
      const payload = {
        device_id: deviceId,
        prompt: `${prompt} ${styleList[style]}`,
        size: sizeList[size],
        n: "1",
        output_format: "png"
      };
      
      // Send request to DeepImg API
      const response = await axios.post(
        "https://api-preview.apirouter.ai/api/v1/deepimg/flux-1-dev",
        payload,
        { headers, timeout: 60000 }
      );
      
      const imageUrl = response.data?.data?.images?.[0]?.url;
      
      if (!imageUrl) {
        return res.status(500).json({
          success: false,
          error: "No image URL returned from API",
          details: response.data
        });
      }
      
      res.json({
        success: true,
        author: "Jaybohol",
        result: {
          prompt: prompt,
          style: style,
          size: size,
          image_url: imageUrl
        }
      });
      
    } catch (error) {
      console.error("DeepImg Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        error: error?.message || "Internal server error",
        details: error.response?.data
      });
    }
  }
};
