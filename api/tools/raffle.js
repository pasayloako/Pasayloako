// api/raffle.js

const fs = require('fs');
const path = require('path');

// Storage file for raffle entries
const RAFFLE_FILE = path.join(__dirname, '../data/raffle_entries.json');
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing entries
function loadEntries() {
  if (!fs.existsSync(RAFFLE_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(RAFFLE_FILE, 'utf8'));
  } catch (e) {
    console.error("Error loading raffle entries:", e.message);
    return [];
  }
}

// Save entries
function saveEntries(entries) {
  fs.writeFileSync(RAFFLE_FILE, JSON.stringify(entries, null, 2));
}

// Generate unique ID for entry
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

module.exports = {
  meta: {
    name: "Raffle System",
    description: "Register for raffle, view entries, and remove entries",
    author: "Jaybohol",
    version: "1.0.0",
    category: "tools",
    method: "GET",
    path: "/raffle?name=&gcashnumber=&gcashname="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { name, gcashnumber, gcashname, action, remove } = req.query;
      
      // Handle list command
      if (action === 'list' || req.query.list === 'true') {
        const entries = loadEntries();
        const totalEntries = entries.length;
        
        const amountPerEntry = 50;
        const totalAmount = totalEntries * amountPerEntry;
        
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = entries.filter(e => e.date === today);
        
        return res.json({
          status: true,
          message: "Raffle entries retrieved successfully",
          stats: {
            total_entries: totalEntries,
            total_participants: totalEntries,
            total_amount: `₱${totalAmount.toLocaleString()}`,
            amount_per_entry: `₱${amountPerEntry}`,
            entries_today: todayEntries.length,
            last_updated: new Date().toISOString()
          },
          entries: entries.map((entry, index) => ({
            id: entry.id,
            number: index + 1,
            name: entry.name,
            gcash_number: entry.gcashnumber,
            gcash_name: entry.gcashname,
            registered_at: entry.timestamp,
            date: entry.date
          }))
        });
      }
      
      // Handle REMOVE by entry number
      if (remove) {
        const entryNumber = parseInt(remove);
        
        if (isNaN(entryNumber) || entryNumber < 1) {
          return res.status(400).json({
            status: false,
            error: "Invalid entry number. Please provide a valid number.",
            usage: "/raffle?remove=7"
          });
        }
        
        const entries = loadEntries();
        
        if (entries.length === 0) {
          return res.status(404).json({
            status: false,
            error: "No entries found in the raffle"
          });
        }
        
        if (entryNumber > entries.length) {
          return res.status(404).json({
            status: false,
            error: `Entry number ${entryNumber} not found`,
            total_entries: entries.length,
            valid_range: `1 to ${entries.length}`
          });
        }
        
        // Get the entry to remove (array index = entryNumber - 1)
        const removedEntry = entries[entryNumber - 1];
        
        // Remove the entry
        entries.splice(entryNumber - 1, 1);
        saveEntries(entries);
        
        return res.json({
          status: true,
          message: `Successfully removed entry #${entryNumber}`,
          removed_entry: {
            number: entryNumber,
            name: removedEntry.name,
            gcash_number: removedEntry.gcashnumber,
            gcash_name: removedEntry.gcashname,
            registered_at: removedEntry.timestamp
          },
          remaining_entries: entries.length,
          note: "Entry numbers have been reordered. Use /raffle?action=list to see updated list."
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
            remove: "/raffle?remove=7",
            check: "/raffle?action=check&name=Jay Kizuu"
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
      
      // Validate GCash number format
      const cleanNumber = gcashnumber.toString().replace(/[\s\-+]/g, '');
      const isValidNumber = /^09\d{9}$/.test(cleanNumber) || /^639\d{9}$/.test(cleanNumber);
      
      if (!isValidNumber) {
        return res.status(400).json({
          status: false,
          error: "Invalid GCash number format. Use: 09916527333 or 639916527333"
        });
      }
      
      // Check for duplicate name
      const entries = loadEntries();
      const existingEntry = entries.find(e => e.name.toLowerCase() === name.toLowerCase());
      
      if (existingEntry) {
        return res.status(409).json({
          status: false,
          error: "Name already registered",
          message: `"${name}" has already joined the raffle`,
          existing_entry: {
            id: existingEntry.id,
            registered_at: existingEntry.timestamp
          }
        });
      }
      
      // Create new entry
      const newEntry = {
        id: generateId(),
        name: name.trim(),
        gcashnumber: cleanNumber,
        gcashname: gcashname.trim(),
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      };
      
      entries.push(newEntry);
      saveEntries(entries);
      
      // Get entry number
      const entryNumber = entries.length;
      
      res.json({
        status: true,
        message: "Successfully registered for the raffle!",
        entry: {
          id: newEntry.id,
          number: entryNumber,
          name: newEntry.name,
          gcash_number: newEntry.gcashnumber,
          gcash_name: newEntry.gcashname,
          registered_at: newEntry.timestamp
        },
        next_steps: "Keep your entry number. Winners will be announced on the raffle date.",
        total_entries: entries.length
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
