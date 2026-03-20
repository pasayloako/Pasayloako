const axios = require("axios");

// Simple memory for tracking requests (in-memory storage)
const memory = {
  requests: [],
  verses: []
};

module.exports = {
  meta: {
    name: "Bible Verse",
    description: "Get random Bible verse or search by book/chapter/verse",
    author: "selov",
    version: "1.0.0",
    category: "religion",
    method: "GET",
    path: "/bible"
  },
  
  onStart: async function({ req, res }) {
    try {
      const { book, chapter, verse, random, passage, track = "true" } = req.query;
      
      // Get requester info
      const requesterIP = req.ip || req.connection.remoteAddress;
      const requesterName = req.query.user || req.headers['user-agent']?.split(' ')[0] || "Anonymous";
      
      // Track request if enabled
      if (track === "true") {
        memory.requests.push({
          user: requesterName,
          ip: requesterIP,
          query: req.query,
          timestamp: new Date().toISOString()
        });
        
        // Keep memory size manageable (last 100 requests)
        if (memory.requests.length > 100) {
          memory.requests.shift();
        }
      }
      
      let apiUrl;
      let verseData;
      
      // Check if random verse is requested
      if (random === "true" || (!book && !chapter && !verse && !passage)) {
        apiUrl = "https://labs.bible.org/api/?passage=random&type=json";
        const response = await axios.get(apiUrl);
        verseData = response.data[0];
      } 
      // Check if book, chapter, and verse are provided
      else if (book && chapter && verse) {
        apiUrl = `https://labs.bible.org/api/?passage=${encodeURIComponent(book)}%20${chapter}:${verse}&type=json`;
        const response = await axios.get(apiUrl);
        verseData = response.data[0];
      }
      // Check if passage format is used
      else if (passage) {
        const passageMatch = passage.match(/^(.+?)\s+(\d+):(\d+)$/);
        
        if (!passageMatch) {
          return res.status(400).json({
            status: false,
            error: "Invalid format! Use: passage=John 3:16"
          });
        }
        
        const [, bookName, chapterNum, verseNum] = passageMatch;
        apiUrl = `https://labs.bible.org/api/?passage=${encodeURIComponent(bookName)}%20${chapterNum}:${verseNum}&type=json`;
        const response = await axios.get(apiUrl);
        verseData = response.data[0];
      }
      else {
        return res.status(400).json({
          status: false,
          error: "Invalid parameters! Use: random=true OR book=John&chapter=3&verse=16 OR passage=John 3:16"
        });
      }
      
      // Check if verse data exists
      if (!verseData || !verseData.text) {
        return res.status(404).json({
          status: false,
          error: "Verse not found. Please check your input."
        });
      }
      
      // Format the verse text
      const bookName = verseData.bookname || "Unknown";
      const chapterNum = verseData.chapter || "?";
      const verseNum = verseData.verse || "?";
      let text = verseData.text || "Text not available";
      
      // Clean up the text
      text = text.replace(/&quot;/g, '"')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&#8217;/g, "'")
                 .replace(/&#8230;/g, "...");
      
      // Track verse if enabled
      if (track === "true") {
        memory.verses.push({
          reference: `${bookName} ${chapterNum}:${verseNum}`,
          text: text.substring(0, 100),
          requested_by: requesterName,
          timestamp: new Date().toISOString()
        });
        
        // Keep memory size manageable
        if (memory.verses.length > 100) {
          memory.verses.shift();
        }
      }
      
      // Return formatted response
      res.json({
        status: true,
        verse: {
          book: bookName,
          chapter: parseInt(chapterNum),
          verse: parseInt(verseNum),
          text: text,
          reference: `${bookName} ${chapterNum}:${verseNum}`
        },
        requested_by: requesterName,
        stats: track === "true" ? {
          total_requests: memory.requests.length,
          total_verses: memory.verses.length
        } : undefined,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        source: "Bible API (labs.bible.org)"
      });
      
    } catch (error) {
      console.error("Bible API Error:", error.message);
      
      res.status(500).json({
        status: false,
        error: "Failed to fetch Bible verse",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};
