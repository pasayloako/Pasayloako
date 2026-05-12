const axios = require('axios');

const meta = {
  name: 'flux pro v1.1 ultra',
  path: '/flux?prompt=',
  category: 'image generation'
};

async function onStart({ req, res }) {
  const { prompt } = req.query;
  
  if (!prompt) {
    return res.status(400).json({
      error: 'Prompt parameter is required'
    });
  }
  
  try {
    const response = await axios.post('https://fal-image-generator.vercel.app/api/generate-images', {
      prompt: prompt,
      provider: "fal",
      modelId: "fal-ai/flux-pro/v1.1-ultra"
    });
    
    const imageBuffer = Buffer.from(response.data.image, 'base64');
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  } catch (error) {
    console.error('FlUX API Error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({
        status: false,
        error: 'Image generation failed'
      });
    }
  }
}

module.exports = { meta, onStart };
