// api/soundcloud.js

const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  meta: {
    name: "SoundCloud Search",
    description: "Search and get direct MP3 download links from SoundCloud",
    author: "Jaybohol",
    version: "2.0.0",
    category: "music",
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

// ============= WORKING SOUNDCLOUD SEARCH =============

async function searchSoundCloudTracks(query) {
  try {
    // Method 1: Using working SoundCloud API endpoint
    const workingClientId = "a3e059563d7fd3372b49b37f00a00bcf";
    
    const response = await axios.get(`https://api-v2.soundcloud.com/search`, {
      params: {
        q: query,
        variant_ids: "",
        facet: "model",
        user_id: "",
        limit: 20,
        offset: 0,
        linked_partitioning: 1,
        client_id: workingClientId,
        app_version: "1741766539",
        app_locale: "en"
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://soundcloud.com',
        'Referer': 'https://soundcloud.com/'
      },
      timeout: 15000
    });
    
    if (response.data && response.data.collection) {
      const tracks = response.data.collection.filter(item => item.kind === "track");
      
      const results = [];
      for (const track of tracks) {
        const audioUrl = await getStreamUrl(track.id, workingClientId);
        
        results.push({
          title: track.title,
          artist: track.user?.username || "Unknown",
          duration: formatDuration(track.duration),
          url: track.permalink_url,
          thumbnail: track.artwork_url || track.user?.avatar_url,
          audio: audioUrl
        });
      }
      
      if (results.length > 0) {
        return results;
      }
    }
    
    // Method 2: Alternative search endpoint
    const altResponse = await axios.get(`https://api.soundcloud.com/tracks`, {
      params: {
        q: query,
        limit: 20,
        client_id: workingClientId,
        linked_partitioning: 1
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    if (altResponse.data && altResponse.data.collection) {
      const results = [];
      for (const track of altResponse.data.collection) {
        const audioUrl = track.stream_url ? `${track.stream_url}?client_id=${workingClientId}` : null;
        
        results.push({
          title: track.title,
          artist: track.user?.username || "Unknown",
          duration: formatDuration(track.duration),
          url: track.permalink_url,
          thumbnail: track.artwork_url || track.user?.avatar_url,
          audio: audioUrl
        });
      }
      
      if (results.length > 0) {
        return results;
      }
    }
    
    // Method 3: Fallback to web scraping
    return await searchSoundCloudWeb(query);
    
  } catch (error) {
    console.error("Search Error:", error.message);
    return await searchSoundCloudWeb(query);
  }
}

// ============= WEB SCRAPING FALLBACK =============

async function searchSoundCloudWeb(query) {
  try {
    const response = await axios.get(`https://soundcloud.com/search/sounds`, {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Find script tags containing track data
    const scripts = $('script').toArray();
    let tracksData = null;
    
    for (const script of scripts) {
      const content = $(script).html();
      if (content && content.includes('window.__sc_hydration')) {
        try {
          const match = content.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);/s);
          if (match) {
            const data = JSON.parse(match[1]);
            for (const item of data) {
              if (item.hydratable === "searchPage" && item.data && item.data.collection) {
                tracksData = item.data.collection;
                break;
              }
            }
          }
        } catch (e) {}
      }
    }
    
    if (tracksData) {
      for (const track of tracksData) {
        if (track.kind === "track") {
          results.push({
            title: track.title,
            artist: track.user?.username || "Unknown",
            duration: formatDuration(track.duration),
            url: track.permalink_url,
            thumbnail: track.artwork_url || track.user?.avatar_url,
            audio: null
          });
        }
      }
    }
    
    return results.slice(0, 20);
    
  } catch (error) {
    console.error("Web Search Error:", error.message);
    return [];
  }
}

// ============= GET STREAM URL =============

async function getStreamUrl(trackId, clientId) {
  try {
    const response = await axios.get(`https://api.soundcloud.com/tracks/${trackId}/streams`, {
      params: { client_id: clientId },
      timeout: 10000
    });
    
    if (response.data && response.data.http_mp3_128_url) {
      return response.data.http_mp3_128_url;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ============= SOUNDCLOUD DOWNLOAD =============

async function downloadSoundCloudTrack(url) {
  try {
    // Extract track ID from URL
    const trackId = await extractTrackId(url);
    
    if (!trackId) {
      throw new Error("Could not extract track ID");
    }
    
    const clientId = "a3e059563d7fd3372b49b37f00a00bcf";
    
    // Get track info
    const trackInfo = await axios.get(`https://api.soundcloud.com/tracks/${trackId}`, {
      params: { client_id: clientId },
      timeout: 10000
    });
    
    const track = trackInfo.data;
    
    // Get stream URL
    let audioUrl = null;
    
    if (track.stream_url) {
      audioUrl = `${track.stream_url}?client_id=${clientId}`;
    }
    
    if (track.download_url) {
      audioUrl = `${track.download_url}?client_id=${clientId}`;
    }
    
    // Try alternative method
    if (!audioUrl) {
      const streamResponse = await axios.get(`https://api.soundcloud.com/tracks/${trackId}/streams`, {
        params: { client_id: clientId },
        timeout: 10000
      });
      
      if (streamResponse.data && streamResponse.data.http_mp3_128_url) {
        audioUrl = streamResponse.data.http_mp3_128_url;
      }
    }
    
    return {
      title: track.title,
      duration: formatDuration(track.duration),
      audio_url: audioUrl
    };
    
  } catch (error) {
    console.error("Download Error:", error.message);
    throw new Error("Unable to download track");
  }
}

async function extractTrackId(url) {
  try {
    // Method 1: Direct ID in URL
    const idMatch = url.match(/soundcloud\.com\/tracks\/(\d+)/);
    if (idMatch) return idMatch[1];
    
    // Method 2: URL pattern with hyphen
    const hyphenMatch = url.match(/soundcloud\.com\/(?:[^\/]+)\/(?:[^\/]+)-(\d+)$/);
    if (hyphenMatch) return hyphenMatch[1];
    
    // Method 3: Fetch page and extract
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const metaId = $('meta[property="soundcloud:track:id"]').attr('content');
    if (metaId) return metaId;
    
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content) {
        const match = content.match(/track_id["']?\s*:\s*["']?(\d+)["']?/);
        if (match) return match[1];
      }
    }
    
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
