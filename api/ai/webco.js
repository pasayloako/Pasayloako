// api/webpilot.js

const axios = require("axios");

const meta = {
  name: 'Webco',
  description: 'Web search with concise 80-100 word responses',
  author: 'Jaybohol',
  version: '1.0.0',
  category: 'ai',
  method: 'GET',
  path: '/webpilot?q='
};

class WebPilotAPI {
  constructor() {
    this.url = "https://api.webpilotai.com/rupee/v1/search";
    this.config = {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: "Bearer null",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.webpilot.ai/search?lang=en-US&threadId=1bc910c4-4e48-4461-8dbc-937c67996dce"
      }
    };
  }

  async fetchData(prompt) {
    // Add word limit instruction to the prompt
    const limitedPrompt = `${prompt} - Answer in 80 to 100 words only. Be concise and direct.`;
    
    const data = { q: limitedPrompt, threadId: "" };
    const response = await axios.post(this.url, data, this.config);
    const fullResponse = this.parseRes(response.data);
    
    // Ensure response is between 80-100 words
    return this.limitToWordCount(fullResponse, 80, 100);
  }

  parseRes(output) {
    return output
      .split("\n")
      .filter(line => line.startsWith("data:"))
      .map(line => {
        try {
          return JSON.parse(line.slice(5)).data.content || "";
        } catch {
          return "";
        }
      })
      .join("");
  }

  limitToWordCount(text, minWords = 80, maxWords = 100) {
    if (!text) return "No response generated.";
    
    // Split into words
    let words = text.trim().split(/\s+/);
    
    // If too short, add a note
    if (words.length < minWords) {
      return text + " " + " ".repeat(minWords - words.length);
    }
    
    // If too long, trim to max words
    if (words.length > maxWords) {
      words = words.slice(0, maxWords);
      return words.join(" ") + "...";
    }
    
    return text;
  }
}

async function onStart({ req, res }) {
  try {
    const prompt = req.query.q;
    if (!prompt) {
      return res.status(400).json({ 
        status: false,
        error: "Missing query parameter 'q'",
        usage: "/webpilot?q=What is artificial intelligence?"
      });
    }

    const wp = new WebPilotAPI();
    const result = await wp.fetchData(prompt);
    
    // Count words in response
    const wordCount = result.trim().split(/\s+/).length;
    
    res.json({
      status: true,
      author: "Jaybohol",
      result: {
        query: prompt,
        response: result,
        word_count: wordCount,
        target_words: "80-100"
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("WebPilot Error:", err.message);
    res.status(500).json({ 
      status: false, 
      error: err.message 
    });
  }
}

module.exports = { meta, onStart, WebPilotAPI };
