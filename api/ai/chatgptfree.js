const axios = require("axios");

// Web search functions
async function performWebSearch(query) {
  try {
    // Option 1: Using a free search API (Brave, DuckDuckGo, or custom)
    // DuckDuckGo's free API (no key required)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    
    const results = response.data.RelatedTopics || [];
    const searchResults = results.slice(0, 5).map((item, idx) => ({
      id: idx + 1,
      title: item.Text?.split(' - ')[0] || item.Text?.substring(0, 100),
      snippet: item.Text,
      url: item.FirstURL || '#'
    }));
    
    return searchResults;
  } catch (error) {
    console.error('Search error:', error.message);
    return [];
  }
}

async function fetchWebPage(url) {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
      maxContentLength: 50000 // Limit to 50KB
    });
    
    // Simple text extraction (remove HTML tags)
    const text = response.data
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000); // Limit to 3000 chars
    
    return {
      url: url,
      title: url.split('/').pop() || url,
      content: text
    };
  } catch (error) {
    console.error('Fetch error:', error.message);
    return null;
  }
}

// Check if request needs web search
function needsWebSearch(prompt) {
  const searchKeywords = [
    'search', 'find', 'look up', 'what is', 'who is', 'latest', 'news',
    'current', 'today', 'recent', 'weather', 'price', 'stock'
  ];
  return searchKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
}

module.exports = {
  meta: {
    name: "ChatGPT Search",
    description: "ChatGPT with web search capability",
    author: "Jaybohol",
    version: "2.0.0",
    category: "ai",
    method: "GET",
    path: "/chatgptsearch"
  },
  
  onStart: async function({ req, res }) {
    try {
      let { prompt, model = "chatgpt4", web_search = "auto" } = req.query;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          error: "Missing required parameter: prompt",
          usage: {
            example: "/chatgptsearch?prompt=Who won the latest election?&web_search=true",
            parameters: {
              prompt: "Your question or message",
              model: "chatgpt4 or chatgpt3 (default: chatgpt4)",
              web_search: "auto, true, or false (default: auto)"
            }
          }
        });
      }
      
      // Determine if web search is needed
      let shouldSearch = false;
      if (web_search === 'true') {
        shouldSearch = true;
      } else if (web_search === 'auto') {
        shouldSearch = needsWebSearch(prompt);
      }
      
      let searchResults = null;
      let webContext = "";
      
      // Perform web search if needed
      if (shouldSearch) {
        console.log(`🔍 Performing web search for: "${prompt.substring(0, 50)}..."`);
        
        // Extract search query from prompt
        let searchQuery = prompt;
        const searchCommands = ['search for', 'find', 'look up', 'what is the latest'];
        for (const cmd of searchCommands) {
          if (prompt.toLowerCase().includes(cmd)) {
            const parts = prompt.toLowerCase().split(cmd);
            if (parts[1]) {
              searchQuery = parts[1].trim();
              break;
            }
          }
        }
        
        searchResults = await performWebSearch(searchQuery);
        
        if (searchResults && searchResults.length > 0) {
          webContext = "\n\n[WEB SEARCH RESULTS]:\n";
          searchResults.forEach((result, idx) => {
            webContext += `${idx + 1}. ${result.title}\n   ${result.snippet}\n   URL: ${result.url}\n`;
          });
          webContext += "\nPlease use these search results to answer the user's question. Cite your sources.\n";
        } else {
          webContext = "\n\n[WEB SEARCH]: No results found for the query.\n";
        }
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
      
      // Enhance prompt with web context
      let enhancedPrompt = prompt;
      if (webContext) {
        enhancedPrompt = prompt + webContext;
      }
      
      console.log(`🤖 ChatGPT Request: "${enhancedPrompt.substring(0, 100)}..." using ${model}`);
      
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
        { prompt: enhancedPrompt },
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
        web_search_used: shouldSearch,
        search_results: searchResults,
        result: {
          prompt: prompt,
          model: model,
          answer: response.data.message || response.data.answer || "No response received"
        }
      });
      
    } catch (error) {
      console.error("ChatGPT Search Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        error: error?.message || "Internal server error",
        details: error.response?.data
      });
    }
  }
};
