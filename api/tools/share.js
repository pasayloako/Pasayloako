const axios = require("axios");
const crypto = require("crypto");

// Session storage
const sessions = new Map();

module.exports = {
  meta: {
    name: "Facebook Post Sharer",
    description: "Auto share Facebook posts using cookies and access tokens",
    author: "Jaybohol",
    version: "1.0.0",
    category: "tools",
    method: "POST",
    path: "/facebook/share"
  },
  
  onStart: async function({ req, res }) {
    try {
      const { cookie, url, amount, interval } = req.body;
      
      // Validate required fields
      if (!cookie) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Cookie is required",
          usage: {
            method: "POST",
            body: {
              cookie: "Facebook session cookie string",
              url: "Facebook post URL to share",
              amount: "Number of shares (1-100)",
              interval: "Seconds between shares (5-60)"
            },
            example: {
              cookie: "sb=xxxx; datr=xxxx; c_user=xxxx; xs=xxxx",
              url: "https://www.facebook.com/username/posts/123456789",
              amount: 10,
              interval: 10
            }
          }
        });
      }
      
      if (!url) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Post URL is required"
        });
      }
      
      if (!amount) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Amount is required"
        });
      }
      
      if (!interval) {
        return res.status(400).json({
          status: false,
          operator: "Jaybohol",
          error: "Interval is required"
        });
      }
      
      // Validate numeric values
      const parsedAmount = parseInt(amount);
      const parsedInterval = parseInt(interval);
      
      if (isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 100) {
        return res.status(400).json({
          status: false,
          error: "Amount must be between 1 and 100"
        });
      }
      
      if (isNaN(parsedInterval) || parsedInterval < 5 || parsedInterval > 60) {
        return res.status(400).json({
          status: false,
          error: "Interval must be between 5 and 60 seconds"
        });
      }
      
      // Convert cookie string to proper format
      const formattedCookie = await convertCookie(cookie);
      if (!formattedCookie) {
        return res.status(400).json({
          status: false,
          error: "Invalid cookie format. Cookie must contain sb, c_user, or xs"
        });
      }
      
      // Get post ID from URL
      const postId = await getPostID(url);
      if (!postId) {
        return res.status(400).json({
          status: false,
          error: "Unable to get post ID. Check if URL is valid and post is public"
        });
      }
      
      // Get access token from cookie
      const accessToken = await getAccessToken(formattedCookie);
      if (!accessToken) {
        return res.status(400).json({
          status: false,
          error: "Unable to retrieve access token. Check your cookies"
        });
      }
      
      // Start sharing session
      const sessionId = startSharing(formattedCookie, url, postId, accessToken, parsedAmount, parsedInterval);
      
      res.json({
        status: true,
        operator: "Jaybohol",
        message: "Boost session started successfully",
        session_id: sessionId,
        post_id: postId,
        target: parsedAmount,
        interval: parsedInterval,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Share error:", error.message);
      
      res.status(500).json({
        status: false,
        operator: "Jaybohol",
        error: error.message || "Internal server error"
      });
    }
  },
  
  // Get session status
  status: async function({ req, res }) {
    try {
      const { session_id } = req.query;
      
      if (!session_id) {
        const allSessions = Array.from(sessions.values()).map((s, index) => ({
          session: index + 1,
          url: s.url,
          count: s.count,
          target: s.target,
          interval: s.interval,
          error: s.error || null,
          logs: (s.logs || []).slice(-10),
          running: s.running
        }));
        
        return res.json({
          status: true,
          active_sessions: sessions.size,
          sessions: allSessions
        });
      }
      
      const session = sessions.get(session_id);
      if (!session) {
        return res.status(404).json({
          status: false,
          error: "Session not found"
        });
      }
      
      res.json({
        status: true,
        session: {
          id: session_id,
          url: session.url,
          post_id: session.id,
          count: session.count,
          target: session.target,
          interval: session.interval,
          error: session.error,
          logs: (session.logs || []).slice(-20),
          running: session.running,
          start_time: session.startTime,
          elapsed_seconds: session.startTime ? Math.floor((Date.now() - session.startTime) / 1000) : null
        }
      });
      
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  },
  
  // Stop session
  stop: async function({ req, res }) {
    try {
      const { session_id } = req.body;
      
      if (!session_id) {
        return res.status(400).json({
          status: false,
          error: "Session ID required"
        });
      }
      
      const session = sessions.get(session_id);
      if (!session) {
        return res.status(404).json({
          status: false,
          error: "Session not found"
        });
      }
      
      if (session.stop) {
        session.stop();
      }
      
      res.json({
        status: true,
        message: "Session stopped",
        session_id: session_id,
        shares_completed: session.count,
        target: session.target
      });
      
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  }
};

// Helper Functions

function startSharing(cookie, url, postId, accessToken, amount, interval) {
  const sessionId = crypto.randomBytes(8).toString('hex');
  
  let sharedCount = 0;
  let timer = null;
  let stopped = false;
  
  const session = {
    url,
    id: postId,
    count: 0,
    target: amount,
    interval,
    error: null,
    logs: [],
    startTime: Date.now(),
    running: true,
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (timer) clearInterval(timer);
      session.running = false;
      
      setTimeout(() => {
        sessions.delete(sessionId);
      }, 5 * 60 * 1000);
    }
  };
  
  sessions.set(sessionId, session);
  
  const headers = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate',
    'connection': 'keep-alive',
    'cookie': cookie,
    'host': 'graph.facebook.com',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
  
  async function sharePost() {
    if (stopped) return;
    
    try {
      const response = await axios.post(
        `https://graph.facebook.com/me/feed`,
        {},
        {
          params: {
            link: `https://m.facebook.com/${postId}`,
            published: 0,
            access_token: accessToken
          },
          headers,
          timeout: 15000
        }
      );
      
      if (response.status === 200) {
        sharedCount++;
        
        const logEntry = `[${new Date().toLocaleTimeString()}] Share #${sharedCount} successful.`;
        session.count = sharedCount;
        session.logs = [...(session.logs || []), logEntry].slice(-20);
        
        if (sharedCount >= amount) {
          const logDone = `[${new Date().toLocaleTimeString()}] Target reached. Session complete.`;
          session.logs = [...(session.logs || []), logDone].slice(-20);
          session.stop();
        }
      }
    } catch (error) {
      const fbError = error.response?.data?.error?.message;
      const errorMsg = fbError || error.message || 'Unknown error';
      
      const logEntry = `[${new Date().toLocaleTimeString()}] Error: ${errorMsg}`;
      session.error = errorMsg;
      session.logs = [...(session.logs || []), logEntry].slice(-20);
      
      // Stop if token is invalid
      if (errorMsg.includes('Invalid OAuth') || 
          errorMsg.includes('access token') || 
          errorMsg.includes('session') ||
          error.response?.status === 401 ||
          error.response?.status === 403) {
        session.stop();
      }
    }
  }
  
  timer = setInterval(sharePost, interval * 1000);
  session.stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer) clearInterval(timer);
    session.running = false;
    
    setTimeout(() => {
      sessions.delete(sessionId);
    }, 5 * 60 * 1000);
  };
  
  // Auto cleanup after max runtime
  const maxRunTime = (amount * interval + 60) * 1000;
  setTimeout(() => {
    if (!stopped) {
      session.error = 'Session timed out.';
      session.stop();
    }
  }, maxRunTime);
  
  return sessionId;
}

async function getPostID(url) {
  try {
    const response = await axios.post(
      'https://id.traodoisub.com/api.php',
      `link=${encodeURIComponent(url)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.id) {
      return response.data.id;
    }
    return null;
  } catch (error) {
    console.error("getPostID error:", error.message);
    return null;
  }
}

async function getAccessToken(cookie) {
  try {
    const headers = {
      'authority': 'business.facebook.com',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'max-age=0',
      'cookie': cookie,
      'referer': 'https://www.facebook.com/',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    };
    
    const response = await axios.get('https://business.facebook.com/content_management', {
      headers,
      timeout: 15000
    });
    
    // Try to find access token in response
    const tokenMatch = response.data.match(/"accessToken":\s*"([^"]+)"/);
    if (tokenMatch && tokenMatch[1]) {
      return tokenMatch[1];
    }
    
    const altMatch = response.data.match(/access_token=([^&"]+)/);
    if (altMatch && altMatch[1]) {
      return altMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error("getAccessToken error:", error.message);
    return null;
  }
}

async function convertCookie(cookie) {
  try {
    const trimmed = cookie.trim();
    
    // Check if it's JSON format
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const cookies = JSON.parse(trimmed);
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      
      const sbCookie = cookieArray.find(c => c.key === 'sb' || c.name === 'sb');
      if (!sbCookie) {
        return null;
      }
      
      const datrCookie = cookieArray.find(c => c.key === 'datr' || c.name === 'datr');
      let formatted = `sb=${sbCookie.value}; `;
      if (datrCookie) {
        formatted += `datr=${datrCookie.value}; `;
      }
      
      formatted += cookieArray
        .filter(c => {
          const k = c.key || c.name;
          return k !== 'sb' && k !== 'datr';
        })
        .map(c => `${c.key || c.name}=${c.value}`)
        .join('; ');
      
      return formatted.trim();
    }
    
    // Check if it's already a valid cookie string
    if (trimmed.includes('c_user=') || trimmed.includes('sb=') || trimmed.includes('xs=')) {
      return trimmed;
    }
    
    return null;
  } catch (error) {
    if (cookie.includes('c_user=') || cookie.includes('sb=') || cookie.includes('xs=')) {
      return cookie.trim();
    }
    return null;
  }
}
