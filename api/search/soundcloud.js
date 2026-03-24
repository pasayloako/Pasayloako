// api/soundcloud.js

const axios = require("axios");

module.exports = {
  meta: {
    name: "SoundCloud Search",
    description: "Search and get direct MP3 download links from SoundCloud",
    author: "Jaybohol",
    version: "3.0.0",
    category: "search",
    method: "GET",
    path: "/soundcloud?q="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { q, url } = req.query;
      
      // Download by URL
      if (url) {
        const result = await downloadSoundCloudTrack(url);
        
        return res.json({
          success: true,
          author: "Jaybohol",
          result: {
            title: result.title,
            duration: result.duration,
            audio: result.audio_url
          }
        });
      }
      
      // Search by query
      if (!q) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          message: "Parameter 'q' atau URL diperlukan",
          usage: {
            search: "/soundcloud?q=juancarlos",
            download: "/soundcloud?url=https://soundcloud.com/juan-karlos/ere"
          }
        });
      }
      
      const tracks = await searchSoundCloudTracks(q);
      
      res.json({
        success: true,
        author: "Jaybohol",
        result: tracks
      });
      
    } catch (error) {
      console.error("SoundCloud API Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        message: error.message || "Failed to search SoundCloud"
      });
    }
  }
};

// ============= WORKING SOUNDCLOUD SEARCH USING EXTERNAL API =============

async function searchSoundCloudTracks(query) {
  try {
    // Method 1: Using public SoundCloud search API (working)
    const response = await axios.get(`https://soundcloud.com/search/sounds`, {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    });
    
    // Extract track data from HTML
    const html = response.data;
    
    // Find the JSON data embedded in the page
    const jsonMatch = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);/s);
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        
        for (const item of data) {
          if (item.hydratable === "searchPage" && item.data && item.data.collection) {
            const tracks = item.data.collection.filter(t => t.kind === "track");
            
            const results = [];
            for (const track of tracks.slice(0, 15)) {
              results.push({
                title: track.title,
                artist: track.user?.username || "Unknown",
                duration: formatDuration(track.duration),
                url: track.permalink_url,
                thumbnail: track.artwork_url || track.user?.avatar_url,
                audio: null
              });
            }
            
            if (results.length > 0) {
              return results;
            }
          }
        }
      } catch (e) {
        console.error("JSON Parse Error:", e.message);
      }
    }
    
    // Method 2: Use alternative search API
    return await searchSoundCloudAlternative(query);
    
  } catch (error) {
    console.error("Search Error:", error.message);
    return await searchSoundCloudAlternative(query);
  }
}

// ============= ALTERNATIVE SEARCH USING THIRD-PARTY API =============

async function searchSoundCloudAlternative(query) {
  try {
    // Using a public SoundCloud API proxy
    const response = await axios.get(`https://api.soundcloud.com/tracks`, {
      params: {
        q: query,
        limit: 15,
        client_id: 'a3e059563d7fd3372b49b37f00a00bcf'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (response.data && response.data.collection) {
      const results = [];
      for (const track of response.data.collection) {
        results.push({
          title: track.title,
          artist: track.user?.username || "Unknown",
          duration: formatDuration(track.duration),
          url: track.permalink_url,
          thumbnail: track.artwork_url || track.user?.avatar_url,
          audio: null
        });
      }
      return results;
    }
    
    return [];
    
  } catch (error) {
    console.error("Alternative Search Error:", error.message);
    return [];
  }
}

// ============= SOUNDCLOUD DOWNLOAD =============

async function downloadSoundCloudTrack(url) {
  try {
    // Using soundcloud-downloader API
    const downloadApi = `https://soundcloud-downloader.vercel.app/api?url=${encodeURIComponent(url)}`;
    
    const response = await axios.get(downloadApi, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data && response.data.url) {
      return {
        title: response.data.title || "SoundCloud Track",
        duration: response.data.duration || "N/A",
        audio_url: response.data.url
      };
    }
    
    throw new Error("No download URL found");
    
  } catch (error) {
    console.error("Download Error:", error.message);
    
    // Fallback: Try to extract track ID and get stream
    const trackId = await extractTrackId(url);
    
    if (trackId) {
      const clientId = 'a3e059563d7fd3372b49b37f00a00bcf';
      const streamUrl = `https://api.soundcloud.com/tracks/${trackId}/stream?client_id=${clientId}`;
      
      return {
        title: "SoundCloud Track",
        duration: "N/A",
        audio_url: streamUrl
      };
    }
    
    throw new Error("Unable to download track");
  }
}

async function extractTrackId(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    
    // Find track ID in meta tags
    const metaMatch = html.match(/<meta[^>]*property="soundcloud:track:id"[^>]*content="(\d+)"/);
    if (metaMatch) return metaMatch[1];
    
    // Find in JSON data
    const jsonMatch = html.match(/track_id["']?\s*:\s*["']?(\d+)["']?/);
    if (jsonMatch) return jsonMatch[1];
    
    // Find in script
    const scriptMatch = html.match(/trackId:\s*['"]?(\d+)['"]?/);
    if (scriptMatch) return scriptMatch[1];
    
    return null;
    
  } catch (error) {
    return null;
  }
}

function formatDuration(ms) {
  if (!ms) return "N/A";
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}
