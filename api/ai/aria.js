// api/aria.js

const axios = require("axios");
const qs = require("qs");

// Store conversations in memory
const conversations = {};

// Font formatting
function formatFont(text) {
  const fontMapping = {
    a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷", k: "𝗸", l: "𝗹", m: "𝗺",
    n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁", u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇",
    A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝", K: "𝗞", L: "𝗟", M: "𝗠",
    N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧", U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭"
  };
  return text.split("").map(char => fontMapping[char] || char).join("");
}

function boldFont(text) {
  return text.replace(/\*\*(.*?)\*\*/g, (match, p1) => formatFont(p1));
}

module.exports = {
  meta: {
    name: "Aria AI",
    description: "Ask questions using Aria AI from Opera Mini (Conversational)",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/aria?ask=&uid="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { ask, uid } = req.query;
      
      // Validate parameters
      if (!ask) {
        return res.status(400).json({
          status: false,
          operator: "JayBohol",
          author: "Jaybohol",
          error: "Question is required",
          usage: "/aria?ask=Hello&uid=123"
        });
      }
      
      if (!uid) {
        return res.status(400).json({
          status: false,
          operator: "JayBohol",
          author: "Jaybohol",
          error: "User ID (uid) is required",
          usage: "/aria?ask=Hello&uid=123"
        });
      }
      
      const question = ask.toLowerCase();
      console.log(`🤖 Aria AI Request - User ${uid}: "${question.substring(0, 50)}..."`);
      
      // Initialize conversation for this user
      if (!conversations[uid]) {
        conversations[uid] = [];
      }
      
      // Add user message to conversation
      conversations[uid].push({ role: "user", content: question });
      
      // Get access token
      const tokenData = qs.stringify({
        client_id: "ofa",
        grant_type: "refresh_token",
        refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI5ODY3MTgyMTgiLCJjaWQiOiJvZmEiLCJ2ZXIiOiIyIiwiaWF0IjoxNzM1NTQ0MzAzLCJqdGkiOiJiOGRoV0Z4TTc3MTczNTU0NDMwMyJ9.EAJrJflcetOzXUdCfQve306QTe_h3Zac76XxjS5Xg1c",
        scope: "shodan:aria user:read"
      });
      
      const tokenResponse = await axios.post(
        "https://oauth2.opera-api.com/oauth2/v1/token/",
        tokenData,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36 OPR/87.0.0.0",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          timeout: 15000
        }
      );
      
      const accessToken = tokenResponse.data.access_token;
      
      // Build conversation context
      const recentMessages = conversations[uid];
      const simulatedQuery = recentMessages
        .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");
      
      // Send chat request
      const chatResponse = await axios.post(
        "https://composer.opera-api.com/api/v1/a-chat",
        {
          query: simulatedQuery,
          stream: true,
          linkify: true,
          linkify_version: 3,
          sia: true,
          supported_commands: [],
          media_attachments: []
        },
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Origin": "opera-aria://ui",
            "Referer": "opera-aria://ui",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36 OPR/87.0.0.0"
          },
          timeout: 30000
        }
      );
      
      // Parse streaming response
      let messages = chatResponse.data
        .split("\n")
        .filter(line => line.startsWith("data: "))
        .map(line => line.replace("data: ", "").trim())
        .filter(line => line && line !== "[DONE]")
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(item => item && item.message)
        .map(item => item.message.replace(/\ud83d\ude0a/g, ""));
      
      if (messages.length > 0) {
        let reply = messages.join("");
        reply = boldFont(reply);
        
        // Save assistant response to conversation
        conversations[uid].push({ role: "assistant", content: reply });
        
        // Keep only last 20 messages to prevent memory issues
        if (conversations[uid].length > 40) {
          conversations[uid] = conversations[uid].slice(-40);
        }
        
        res.json({
          status: true,
          operator: "JayBohol",
          author: "Jaybohol",
          result: {
            question: ask,
            answer: reply,
            uid: uid,
            conversation_length: conversations[uid].length
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          status: false,
          operator: "JayBohol",
          error: "No response from Aria AI",
          message: "Please try again later."
        });
      }
      
    } catch (error) {
      console.error("Aria AI Error:", error.message);
      
      res.status(500).json({
        status: false,
        operator: "JayBohol",
        author: "Jaybohol",
        error: error.message || "Failed to get Aria AI response",
        timestamp: new Date().toISOString()
      });
    }
  }
};
