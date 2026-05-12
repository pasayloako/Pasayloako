const axios = require('axios');

const meta = {
  name: 'pollinations',
  path: '/pollinations?prompt=',
  category: 'image generation'
};

async function onStart({ req, res }) {
  const { prompt } = req.query;

  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const response = await axios.get(`https://image.pollinations.ai/prompt/${encodedPrompt}?model=turbo`, {
      responseType: 'arraybuffer'
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.send(response.data);
  } catch (error) {
    console.error('Pollinations API Error:', error.message);
    res.status(500).json({ error: 'Image generation failed' });
  }
}

module.exports = { meta, onStart };
