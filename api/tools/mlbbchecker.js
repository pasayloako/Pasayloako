const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

module.exports = {
  meta: {
    name: "MLBB Region Checker",
    description: "Check Mobile Legends Bang Bang account region and info via PizzoShop",
    author: "Jaybohol",
    version: "1.0.0",
    category: "tools",
    method: "GET",
    path: "/mlbb/check?user_id=&zone_id="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { user_id, zone_id } = req.query;
      
      // Validate required parameters
      if (!user_id) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "User ID is required",
          usage: {
            example: "/mlbb/check?user_id=123456789&zone_id=1234",
            parameters: {
              user_id: "Mobile Legends User ID (in-game ID)",
              zone_id: "Mobile Legends Zone ID (optional, but recommended)"
            }
          }
        });
      }
      
      if (!zone_id) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Zone ID is required",
          usage: "/mlbb/check?user_id=123456789&zone_id=1234"
        });
      }
      
      // Validate input format
      if (!/^\d+$/.test(user_id)) {
        return res.status(400).json({
          status: false,
          error: "User ID must contain only numbers"
        });
      }
      
      if (!/^\d+$/.test(zone_id)) {
        return res.status(400).json({
          status: false,
          error: "Zone ID must contain only numbers"
        });
      }
      
      console.log(`🔍 Checking MLBB account: UserID=${user_id}, ZoneID=${zone_id}`);
      
      // Call PizzoShop API
      const result = await checkMLBBRegion(user_id, zone_id);
      
      res.json({
        status: true,
        operator: "Jaybohol",
        account: {
          user_id: user_id,
          zone_id: zone_id,
          nickname: result.nickname || "Unknown",
          region: result.region || "Unknown",
          last_login: result.lastLogin || "Unknown",
          created_at: result.createdAt || "Unknown"
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("MLBB Checker Error:", error.message);
      
      res.status(500).json({
        status: false,
        operator: "Jaybohol",
        error: "Failed to check MLBB account",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// ============= MLBB CHECKER FUNCTION =============

async function checkMLBBRegion(userId, zoneId) {
  const url = 'https://pizzoshop.com/mlchecker/check';

  // Data payload in x-www-form-urlencoded format
  const data = qs.stringify({
    'user_id': userId,
    'zone_id': zoneId
  });

  const config = {
    method: 'post',
    url: url,
    headers: { 
      'authority': 'pizzoshop.com', 
      'content-type': 'application/x-www-form-urlencoded', 
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'origin': 'https://pizzoshop.com',
      'referer': 'https://pizzoshop.com/mlchecker'
    },
    data: data,
    timeout: 15000
  };

  try {
    const response = await axios(config);
    const $ = cheerio.load(response.data);

    // Look for result table with .table-modern class
    const table = $('.table-modern');

    if (table.length === 0) {
      // Check for error message from alert
      const errorMsg = $('.alert-danger').text().trim();
      throw new Error(errorMsg || "Account not found or invalid User ID/Zone ID");
    }

    const result = {};
    table.find('tr').each((i, el) => {
      const key = $(el).find('th').text().replace(/\s+/g, ' ').trim();
      let value = $(el).find('td').text().trim();

      // Clean key for object mapping
      if (key.includes('Nickname')) result.nickname = value;
      if (key.includes('Region ID')) result.region = value;
      if (key.includes('Last Login')) result.lastLogin = value;
      if (key.includes('Created data') || key.includes('Created at')) result.createdAt = value;
    });

    // If no data found
    if (Object.keys(result).length === 0) {
      throw new Error("No data found for this account");
    }

    return result;

  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status}`);
    }
    throw new Error(error.message);
  }
}
