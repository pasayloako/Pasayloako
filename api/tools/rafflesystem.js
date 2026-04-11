// api/raffle.js (with winner selection)

const fs = require('fs');
const path = require('path');

const RAFFLE_FILE = path.join(__dirname, '../data/raffle_entries.json');
const DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadEntries() {
  if (!fs.existsSync(RAFFLE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(RAFFLE_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveEntries(entries) {
  fs.writeFileSync(RAFFLE_FILE, JSON.stringify(entries, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

module.exports = {
  meta: {
    name: "Raffle System",
    description: "Register for raffle, view entries, and draw winners",
    author: "Jaybohol",
    version: "1.0.0",
    category: "tools",
    method: "GET",
    path: "/raffle"
  },
  
  onStart: async function({ req, res }) {
    try {
      const { name, gcashnumber, gcashname, action, winner } = req.query;
      
      // Handle list command
      if (action === 'list') {
        const entries = loadEntries();
        
        return res.json({
          status: true,
          total_entries: entries.length,
          entries: entries.map((entry, index) => ({
            number: index + 1,
            name: entry.name,
            gcash_number: entry.gcashnumber,
            gcash_name: entry.gcashname,
            registered_at: entry.timestamp
          }))
        });
      }
      
      // Handle winner draw (admin only - add your own validation)
      if (action === 'draw') {
        const entries = loadEntries();
        
        if (entries.length === 0) {
          return res.status(400).json({
            status: false,
            error: "No entries found. Cannot draw winner."
          });
        }
        
        // Random winner selection
        const randomIndex = Math.floor(Math.random() * entries.length);
        const winner = entries[randomIndex];
        const winnerNumber = randomIndex + 1;
        
        return res.json({
          status: true,
          message: "🎉 Raffle Winner Selected! 🎉",
          winner: {
            number: winnerNumber,
            name: winner.name,
            gcash_number: winner.gcashnumber,
            gcash_name: winner.gcashname,
            registered_at: winner.timestamp
          },
          total_entries: entries.length
        });
      }
      
      // Handle single winner check
      if (winner) {
        const entries = loadEntries();
        const winnerEntry = entries.find(e => e.name.toLowerCase() === winner.toLowerCase());
        
        if (!winnerEntry) {
          return res.status(404).json({
            status: false,
            error: "Winner not found",
            message: `No entry found for name: ${winner}`
          });
        }
        
        const winnerNumber = entries.findIndex(e => e.id === winnerEntry.id) + 1;
        
        return res.json({
          status: true,
          winner: {
            number: winnerNumber,
            name: winnerEntry.name,
            gcash_number: winnerEntry.gcashnumber,
            gcash_name: winnerEntry.gcashname,
            registered_at: winnerEntry.timestamp
          }
        });
      }
      
      // Handle registration
      if (!name) {
        return res.status(400).json({
          status: false,
          error: "Name is required",
          usage: {
            register: "/raffle?name=Jay Kizuu&gcashnumber=09916527333&gcashname=J...B",
            list: "/raffle?action=list",
            draw: "/raffle?action=draw",
            check_winner: "/raffle?winner=Jay Kizuu"
          }
        });
      }
      
      if (!gcashnumber) {
        return res.status(400).json({
          status: false,
          error: "GCash number is required"
        });
      }
      
      if (!gcashname) {
        return res.status(400).json({
          status: false,
          error: "GCash name is required"
        });
      }
      
      // Validate GCash number
      const cleanNumber = gcashnumber.toString().replace(/[\s\-+]/g, '');
      const isValidNumber = /^09\d{9}$/.test(cleanNumber) || /^639\d{9}$/.test(cleanNumber);
      
      if (!isValidNumber) {
        return res.status(400).json({
          status: false,
          error: "Invalid GCash number format. Use: 09916527333 or 639916527333"
        });
      }
      
      // Check for duplicate
      const entries = loadEntries();
      const existingEntry = entries.find(e => e.name.toLowerCase() === name.toLowerCase());
      
      if (existingEntry) {
        return res.status(409).json({
          status: false,
          error: "Name already registered",
          message: `"${name}" has already joined the raffle`
        });
      }
      
      // Create entry
      const newEntry = {
        id: generateId(),
        name: name.trim(),
        gcashnumber: cleanNumber,
        gcashname: gcashname.trim(),
        timestamp: new Date().toISOString()
      };
      
      entries.push(newEntry);
      saveEntries(entries);
      
      const entryNumber = entries.length;
      
      res.json({
        status: true,
        message: "✅ Successfully registered for the raffle!",
        entry_number: entryNumber,
        entry: {
          name: newEntry.name,
          gcash_number: newEntry.gcashnumber,
          gcash_name: newEntry.gcashname
        },
        total_entries: entries.length,
        note: "Keep your entry number. Good luck!"
      });
      
    } catch (error) {
      console.error("Raffle API Error:", error.message);
      
      res.status(500).json({
        status: false,
        error: "Internal server error",
        details: error.message
      });
    }
  }
};
