const axios = require("axios");

module.exports = {
  meta: {
    name: "Bible",
    description: "Get Bible verses by prompt (supports john 3:16, genesis 1:1, random)",
    author: "Jaybohol",
    version: "1.0.0",
    category: "religion",
    method: "GET",
    path: "/bible?prompt="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { prompt, version = "web" } = req.query;
      
      // Validate prompt parameter
      if (!prompt) {
        return res.status(400).json({
          status: false,
          error: "Prompt parameter is required",
          usage: {
            endpoint: "/bible?prompt=john 3:16",
            examples: [
              { prompt: "john 3:16", description: "Specific verse" },
              { prompt: "genesis 1", description: "Chapter" },
              { prompt: "psalm 23", description: "Psalm" },
              { prompt: "random", description: "Random verse" }
            ]
          }
        });
      }
      
      // Bible API endpoints
      const bibleApis = {
        // Multiple Bible versions available
        web: "https://labs.bible.org/api/?passage=%s&type=json",
        kjv: "https://bible-api.com/%s?translation=kjv",
        webster: "https://bible-api.com/%s?translation=webster"
      };
      
      let response;
      let verseData;
      
      // Handle random verse
      if (prompt.toLowerCase() === "random") {
        const randomUrl = "https://labs.bible.org/api/?passage=random&type=json";
        response = await axios.get(randomUrl);
        verseData = response.data[0];
      } 
      else {
        // Try multiple formats and APIs
        const encodedPrompt = encodeURIComponent(prompt);
        
        // Try primary API first
        try {
          const apiUrl = bibleApis[version].replace("%s", encodedPrompt);
          response = await axios.get(apiUrl);
          
          // Handle different response formats
          if (Array.isArray(response.data)) {
            verseData = response.data[0];
          } else if (response.data.verses) {
            verseData = {
              bookname: response.data.verses[0]?.book_name,
              chapter: response.data.verses[0]?.chapter,
              verse: response.data.verses[0]?.verse,
              text: response.data.text || response.data.verses[0]?.text
            };
          } else {
            verseData = response.data;
          }
        } catch (error) {
          // Fallback to alternative API
          const fallbackUrl = `https://bible-api.com/${encodedPrompt}`;
          const fallbackResponse = await axios.get(fallbackUrl);
          
          if (fallbackResponse.data.verses) {
            verseData = {
              bookname: fallbackResponse.data.verses[0]?.book_name || fallbackResponse.data.reference?.split(' ')[0],
              chapter: fallbackResponse.data.verses[0]?.chapter || fallbackResponse.data.verses[0]?.chapter,
              verse: fallbackResponse.data.verses[0]?.verse || 1,
              text: fallbackResponse.data.text || fallbackResponse.data.verses[0]?.text
            };
          } else {
            throw error;
          }
        }
      }
      
      // Check if verse data exists
      if (!verseData || (!verseData.text && !verseData.verses)) {
        return res.status(404).json({
          status: false,
          error: "Verse not found",
          prompt: prompt,
          message: "Could not find the specified verse. Check your format (e.g., john 3:16, genesis 1:1)"
        });
      }
      
      // Extract verse information
      let bookName, chapterNum, verseNum, text;
      
      if (verseData.bookname) {
        bookName = verseData.bookname;
        chapterNum = verseData.chapter || "?";
        verseNum = verseData.verse || "?";
        text = verseData.text;
      } else if (verseData.book_name) {
        bookName = verseData.book_name;
        chapterNum = verseData.chapter;
        verseNum = verseData.verse;
        text = verseData.text;
      } else {
        bookName = "Unknown";
        chapterNum = "?";
        verseNum = "?";
        text = verseData.text || "Text not available";
      }
      
      // Clean up the text
      if (text) {
        text = text.replace(/&quot;/g, '"')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&#8217;/g, "'")
                   .replace(/&#8230;/g, "...");
      }
      
      // Return formatted response
      res.json({
        status: true,
        prompt: prompt,
        verse: {
          book: bookName,
          chapter: parseInt(chapterNum) || chapterNum,
          verse: parseInt(verseNum) || verseNum,
          text: text,
          reference: `${bookName} ${chapterNum}:${verseNum}`
        },
        timestamp: new Date().toISOString(),
        version: version
      });
      
    } catch (error) {
      console.error("Bible API Error:", error.message);
      
      res.status(500).json({
        status: false,
        error: "Failed to fetch Bible verse",
        prompt: req.query.prompt,
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};
