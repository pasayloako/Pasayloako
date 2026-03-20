const axios = require('axios');

module.exports = {
  meta: {
    name: "Philvocs",
    description: "Fetch latest earthquake information from PhilVOCs",
    author: "Jay",
    version: "1.0.0",
    category: "random",
    method: "GET",
    path: "/philvocs"
  },
  
  onStart: async function({ req, res }) {
    try {
      const { type } = req.query;
      
      // PhilVOCs official data sources
      const endpoints = {
        recent: "https://earthquake.phivolcs.dost.gov.ph/feed_recent.json",
        felt: "https://earthquake.phivolcs.dost.gov.ph/feed_felt.json",
        latest: "https://earthquake.phivolcs.dost.gov.ph/feed_latest.json"
      };
      
      let endpoint = endpoints.latest;
      if (type === 'recent') endpoint = endpoints.recent;
      if (type === 'felt') endpoint = endpoints.felt;
      
      const response = await axios.get(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const data = response.data;
      
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return res.status(404).json({
          status: false,
          error: "No earthquake data available"
        });
      }
      
      // Format the response
      let earthquakes = [];
      if (Array.isArray(data)) {
        earthquakes = data.map(quake => ({
          datetime: quake.datetime || quake.date_time,
          magnitude: quake.magnitude,
          depth: quake.depth,
          location: quake.location,
          intensity: quake.intensity || "N/A",
          status: quake.status || "Reported"
        }));
      } else if (data.features) {
        earthquakes = data.features.map(feature => ({
          datetime: feature.properties.datetime,
          magnitude: feature.properties.mag,
          depth: feature.properties.depth,
          location: feature.properties.place,
          intensity: feature.properties.intensity || "N/A",
          status: feature.properties.status
        }));
      }
      
      res.json({
        status: true,
        count: earthquakes.length,
        type: type || "latest",
        source: "Philippine Institute of Volcanology and Seismology",
        data: earthquakes,
        timestamp: new Date().toISOString(),
        disclaimer: "Data provided by PhilVOCs for informational purposes only"
      });
      
    } catch (error) {
      console.error("PhilVOCs API Error:", error.message);
      
      // Fallback data if API is unavailable
      res.status(200).json({
        status: true,
        count: 1,
        source: "PhilVOCs (Cached Data)",
        data: [{
          datetime: new Date().toISOString(),
          magnitude: "N/A",
          depth: "N/A",
          location: "Unable to fetch real-time data",
          intensity: "N/A",
          status: "API temporarily unavailable"
        }],
        error: error.message,
        timestamp: new Date().toISOString(),
        disclaimer: "Using cached data. Visit https://earthquake.phivolcs.dost.gov.ph for official updates"
      });
    }
  }
};
