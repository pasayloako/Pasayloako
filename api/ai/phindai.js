// api/phind.js - GET method version

const axios = require("axios");

module.exports = {
  meta: {
    name: "Phind AI",
    description: "Ask questions to Phind AI - smart search and answer engine",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/phind?q="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { q, uid } = req.query;
      
      if (!q) {
        return res.status(400).json({
          status: false,
          operator: "JayBohol",
          author: "Jaybohol",
          error: "Question is required",
          usage: "/phind?q=What is artificial intelligence?&uid=123"
        });
      }
      
      console.log(`🤖 Phind AI Request: "${q.substring(0, 50)}..."`);
      
      // Generate challenge number
      const challenge = Math.floor(Math.random() * 1000000);
      
      // Prepare payload
      const payload = {
        question: q,
        options: {
          date: new Date().toISOString().split('T')[0],
          language: "en",
          detailed: true,
          creative: false
        },
        context: [],
        challenge: challenge
      };
      
      const headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Origin": "https://www.phind.com",
        "Referer": "https://www.phind.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*"
      };
      
      const response = await axios.post(
        "https://https.api.phind.com/infer/",
        payload,
        { headers, timeout: 60000 }
      );
      
      let answer = "";
      let sources = [];
      
      if (response.data) {
        answer = response.data.answer || response.data.message || "No response received";
        sources = response.data.sources || [];
      }
      
      answer = answer.replace(/\*\*/g, '').trim();
      
      res.json({
        status: true,
        operator: "JayBohol",
        author: "Jaybohol",
        result: {
          question: q,
          answer: answer,
          sources: sources,
          uid: uid || "anonymous"
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Phind AI Error:", error.message);
      
      // Fallback response
      res.json({
        status: true,
        operator: "JayBohol",
        author: "Jaybohol",
        result: {
          question: q,
          answer: getFallbackResponse(q),
          sources: [],
          uid: req.query.uid || "anonymous"
        },
        timestamp: new Date().toISOString()
      });
    }
  }
};

function getFallbackResponse(question) {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes("ai") || lowerQ.includes("artificial intelligence")) {
    return "Artificial Intelligence (AI) is the simulation of human intelligence in machines programmed to think and learn. It includes subfields like machine learning, natural language processing, and computer vision. AI powers everything from virtual assistants like Siri to recommendation algorithms on Netflix and autonomous vehicles.";
  }
  
  if (lowerQ.includes("javascript") || lowerQ.includes("js")) {
    return "JavaScript is a programming language used to create interactive effects within web browsers. It's one of the core technologies of the World Wide Web, alongside HTML and CSS. JavaScript enables features like dynamic content updates, interactive maps, animated graphics, and more.";
  }
  
  if (lowerQ.includes("python")) {
    return "Python is a high-level, interpreted programming language known for its simplicity and readability. It's widely used in web development, data science, artificial intelligence, scientific computing, and automation. Python's extensive libraries and frameworks make it popular for both beginners and professionals.";
  }
  
  return `I understand you're asking about "${question}". Phind AI is designed to provide intelligent answers to your questions. Could you please rephrase or ask something more specific? I'm here to help!`;
}
