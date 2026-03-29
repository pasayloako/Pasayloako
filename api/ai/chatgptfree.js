// api/chatgptfree.js

const axios = require("axios");

module.exports = {
  meta: {
    name: "ChatGPT Free",
    description: "Send a prompt to ChatGPT models for free",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/chatgptfree?prompt="
  },
  
  onStart: async function({ req, res }) {
    try {
      let { prompt, model = "chatgpt4" } = req.query;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          error: "Missing required parameter: prompt",
          usage: {
            example: "/chatgptfree?prompt=Hello, how are you?",
            parameters: {
              prompt: "Your question or message",
              model: "Optional: chatgpt4 or chatgpt3 (default: chatgpt4)"
            }
          }
        });
      }
      
      // Available models
      const modelList = {
        chatgpt4: {
          api: "https://stablediffusion.fr/gpt4/predict2",
          referer: "https://stablediffusion.fr/chatgpt4"
        },
        chatgpt3: {
          api: "https://stablediffusion.fr/gpt3/predict",
          referer: "https://stablediffusion.fr/chatgpt3"
        }
      };
      
      // Validate model
      if (!modelList[model]) {
        return res.status(400).json({
          success: false,
          error: `Invalid model. Available models: ${Object.keys(modelList).join(", ")}`,
          available_models: Object.keys(modelList)
        });
      }
      
      console.log(`🤖 ChatGPT Request: "${prompt.substring(0, 50)}..." using ${model}`);
      
      // Get referer to receive cookies
      const refererResp = await axios.get(modelList[model].referer, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36"
        },
        timeout: 10000
      });
      
      const setCookie = refererResp.headers && refererResp.headers["set-cookie"];
      const cookieHeader = Array.isArray(setCookie) ? setCookie.join("; ") : undefined;
      
      // Send request to ChatGPT API
      const response = await axios.post(
        modelList[model].api,
        { prompt },
        {
          headers: {
            "accept": "*/*",
            "content-type": "application/json",
            "origin": "https://stablediffusion.fr",
            "referer": modelList[model].referer,
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36"
          },
          timeout: 60000
        }
      );
      
      res.json({
        success: true,
        author: "Jaybohol",
        result: {
          prompt: prompt,
          model: model,
          answer: response.data.message || response.data.answer || "No response received"
        }
      });
      
    } catch (error) {
      console.error("ChatGPT Free Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        error: error?.message || "Internal server error",
        details: error.response?.data
      });
    }
  }
};
