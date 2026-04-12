const axios = require('axios');
const conversations = new Map();

const meta = {
  name: 'TypeGPT',
  path: '/typegpt?query=&uid=&model=',
  method: 'get',
  category: 'ai',
  description: ''
};

const models = {
  "data": [
    {"id": "deepseek-r1-0528-turbo"},
    {"id": "kimi-k2-eco"},
    {"id": "glm-4.5"},
    {"id": "llama-4-scout"},
    {"id": "qwen3-coder"},
    {"id": "kimi-k2-turbo"},
    {"id": "llama3.1-8b"},
    {"id": "deepseek-v3-0324"},
    {"id": "deepseek-r1-distill-qwen-32b"},
    {"id": "qwen3-235b-a22b"},
    {"id": "qwen3-coder-turbo"},
    {"id": "deepseek-v3-0324-turbo"},
    {"id": "kimi-k2"},
    {"id": "gpt-oss-120b"},
    {"id": "gemma-3-27b-it"},
    {"id": "llama3.3-70b"},
    {"id": "deepseek-r1-0528"},
    {"id": "qwen3-235b-a22b-2507-instruct"},
    {"id": "qwen3-235b-a22b-2507-thinking"},
    {"id": "qwen3-235b-a22b-2507-thinking-turbo"},
    {"id": "multilingual-e5-large-instruct"},
    {"id": "gemma-3n-e4b-it"},
    {"id": "deepseek-r1-distill-llama-70b"},
    {"id": "deepseek-v3.1"}
  ],
  "success": true
};

async function onStart({ req, res }) {
  const { query, uid, model, system } = req.query;

  if (!query || !uid || !model) {
    const availModels = models.data.map(m => m.id);
    return res.status(400).json({
      error: "Please provide 'query', 'uid' and 'model'.",
      example: "/typegpt?query=hi&uid=69&model=deepseek-v3.1",
      avail_models: availModels
    });
  }

  try {
    let messages = conversations.get(uid) || [];
    if (system) messages.unshift({ role: 'system', content: system });
    messages.push({ role: 'user', content: query });
    const response = await axios.post('https://chat.typegpt.net/api/openai/v1/chat/completions', 
      {
        model,
        messages,
        stream: true,
        temperature: 0.5,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: 1
      },
      {
        headers: {
          "Content-Type": "application/json",
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          "sec-ch-ua": "\"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
          "sec-ch-ua-arch": "\"\"",
          "sec-ch-ua-bitness": "\"\"",
          "sec-ch-ua-full-version": "\"137.0.7337.0\"",
          "sec-ch-ua-full-version-list": "\"Chromium\";v=\"137.0.7337.0\", \"Not/A)Brand\";v=\"24.0.0.0\"",
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-model": "\"SM-A057F\"",
          "sec-ch-ua-platform": "\"Android\"",
          "sec-ch-ua-platform-version": "\"15.0.0\""
        },
        responseType: 'stream'
      }
    );

    let fullResponse = '';
    const chunks = [];

    response.data.on('data', chunk => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              chunks.push(content);
            }
          } catch (e) {}
        }
      }
    });

    response.data.on('end', () => {
      messages.push({ role: 'assistant', content: fullResponse });
      conversations.set(uid, messages);
      
      res.json({
        result: fullResponse,
        avail_models: models.data.map(m => m.id)
      });
    });

  } catch (error) {
    res.status(400).json({
      error: error.message,
      avail_models: models.data.map(m => m.id)
    });
  }
}

module.exports = { meta, onStart };
