// api/bibleai.js

const axios = require("axios");

// Valid API key
const VALID_API_KEY = "selovasx2024";

module.exports = {
  meta: {
    name: "BibleAI",
    description: "AI-powered Bible assistant that answers questions based on Scripture",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/bibleai?prompt=&apikey="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { prompt, model = "chatgpt4", apikey } = req.query;
      
      // API Key Authentication
      if (!apikey) {
        return res.status(401).json({
          success: false,
          error: "API key is required",
          usage: "/bibleai?prompt=What does John 3:16 mean?&apikey=selovasx2024"
        });
      }
      
      if (apikey !== VALID_API_KEY) {
        return res.status(403).json({
          success: false,
          error: "Invalid API key"
        });
      }
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameter: prompt",
          usage: "/bibleai?prompt=What does John 3:16 mean?&apikey=selovasx2024"
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
      
      if (!modelList[model]) {
        return res.status(400).json({
          success: false,
          error: `Invalid model. Available: ${Object.keys(modelList).join(", ")}`
        });
      }
      
      // System prompt for Bible expert
      const systemPrompt = `You are BibleAI, an AI-powered Bible assistant. Answer Bible questions accurately with Scripture references. Be warm and helpful.`;
      
      const fullPrompt = `${systemPrompt}\n\nQuestion: ${prompt}\n\nAnswer:`;
      
      console.log(` BibleAI: "${prompt.substring(0, 50)}..."`);
      
      // Get cookies
      const refererResp = await axios.get(modelList[model].referer, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        },
        timeout: 10000
      });
      
      const setCookie = refererResp.headers && refererResp.headers["set-cookie"];
      const cookieHeader = Array.isArray(setCookie) ? setCookie.join("; ") : undefined;
      
      // Send request
      const response = await axios.post(
        modelList[model].api,
        { prompt: fullPrompt },
        {
          headers: {
            "accept": "*/*",
            "content-type": "application/json",
            "origin": "https://stablediffusion.fr",
            "referer": modelList[model].referer,
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
          },
          timeout: 60000
        }
      );
      
      let answer = response.data.message || response.data.answer || "No response received";
      
      // Clean up answer
      answer = answer.replace(/^.*?Answer:\s*/i, '');
      answer = answer.trim();
      
      // Return answer only
      res.json({
        success: true,
        answer: answer
      });
      
    } catch (error) {
      console.error("BibleAI Error:", error.message);
      
      // Fallback response
      const fallback = getFallbackResponse(req.query.prompt);
      
      res.json({
        success: true,
        answer: fallback.answer
      });
    }
  }
};

// ============= FALLBACK RESPONSES =============

function getFallbackResponse(question) {
  const lowerQuestion = (question || "").toLowerCase();
  
  // John 3:16
  if (lowerQuestion.includes("john 3:16") || lowerQuestion.includes("john 3 16")) {
    return {
      answer: "John 3:16: 'For God so loved the world that he gave his only Son, that whoever believes in him should not perish but have eternal life.' This verse shows God's immense love—He gave His only Son so that anyone who believes will receive eternal life. It's the heart of the Gospel."
    };
  }
  
  // Malungkot / Sad / Lonely
  if (lowerQuestion.includes("malungkot") || lowerQuestion.includes("lonely") || lowerQuestion.includes("sad")) {
    return {
      answer: "Psalm 147:3 says, 'He heals the brokenhearted and binds up their wounds.' You are not alone. God is with you. Jesus said in Matthew 28:20, 'I am with you always, to the end of the age.'"
    };
  }
  
  // Love
  if (lowerQuestion.includes("love")) {
    return {
      answer: "1 Corinthians 13:4-7: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud...' And 1 John 4:8 says, 'God is love.' Love is not just a feeling—it's the very nature of God."
    };
  }
  
  // Faith
  if (lowerQuestion.includes("faith")) {
    return {
      answer: "Hebrews 11:1: 'Faith is the assurance of things hoped for, the conviction of things not seen.' Faith is trusting God even when we can't see the outcome. It grows by hearing God's Word (Romans 10:17)."
    };
  }
  
  // Prayer
  if (lowerQuestion.includes("pray")) {
    return {
      answer: "Prayer is simply talking to God. Jesus taught us in Matthew 6:9-13. 1 Thessalonians 5:17 says, 'Pray without ceasing.' Bring everything to God in prayer with thanksgiving (Philippians 4:6)."
    };
  }
  
  // David and Goliath
  if (lowerQuestion.includes("david") && lowerQuestion.includes("goliath")) {
    return {
      answer: "1 Samuel 17 tells how young David defeated the giant Goliath with a sling and a stone, saying, 'I come to you in the name of the Lord Almighty.' This story teaches that God doesn't look at our size—He looks at our faith."
    };
  }
  
  // Default
  return {
    answer: "Thank you for your question. The Bible has wisdom for every area of life. Ask about a specific verse (like 'John 3:16'), a theme (like 'love' or 'faith'), or a Bible story. I'm here to help you explore God's Word."
  };
}
