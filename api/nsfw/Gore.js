const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  meta: {
    name: "Gore Content",
    description: "Fetch random gore images and videos from seegore.com",
    author: "Jaybohol",
    version: "1.0.0",
    category: "nsfw",
    method: "GET",
    path: "/gore"
  },
  
  onStart: async function({ req, res }) {
    try {
      const { page } = req.query;
      
      // Use specified page or random page (1-100)
      let targetPage;
      if (page && !isNaN(page) && page >= 1 && page <= 100) {
        targetPage = parseInt(page);
      } else {
        targetPage = Math.floor(Math.random() * 100) + 1;
      }
      
      const response = await axios.get(`https://seegore.com/gore/page/${targetPage}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      const links = [];

      $('ul > li > article').each((_, element) => {
        const title = $(element).find('div.content > header > h2').text().trim();
        const link = $(element).find('div.post-thumbnail > a').attr('href');
        const thumb = $(element).find('div.post-thumbnail > a > div > img').attr('src');
        const view = $(element).find('div.post-thumbnail > div.post-meta.bb-post-meta.post-meta-bg > span.post-meta-item.post-views').text().trim();
        const vote = $(element).find('div.post-thumbnail > div.post-meta.bb-post-meta.post-meta-bg > span.post-meta-item.post-votes').text().trim();
        const tag = $(element).find('div.content > header > div > div.bb-cat-links').text().trim();
        const comment = $(element).find('div.content > header > div > div.post-meta.bb-post-meta > a').text().trim();
        
        if (title && link) {
          links.push({ title, link, thumb, view, vote, tag, comment });
        }
      });

      if (links.length === 0) {
        return res.status(404).json({
          status: false,
          operator: "Jaybohol",
          error: "No content found on the specified page",
          requested_page: targetPage
        });
      }

      const random = links[Math.floor(Math.random() * links.length)];
      
      if (!random.link) {
        return res.status(404).json({
          status: false,
          operator: "Jaybohol",
          error: "Could not find valid content link"
        });
      }
      
      // Ensure full URL
      const contentUrl = random.link.startsWith('http') ? random.link : `https://seegore.com${random.link}`;
      
      const detailResponse = await axios.get(contentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });
      
      const $$ = cheerio.load(detailResponse.data);

      // Extract video URL from various possible locations
      let videoUrl = $$('div.site-main').find('video > source').attr('src');
      if (!videoUrl) {
        videoUrl = $$('div.site-main').find('video > a').attr('href');
      }
      if (!videoUrl) {
        videoUrl = $$('div.site-main').find('source').attr('src');
      }
      if (!videoUrl) {
        videoUrl = $$('iframe').attr('src');
      }
      
      // Ensure video URL is absolute
      if (videoUrl && !videoUrl.startsWith('http')) {
        videoUrl = `https://seegore.com${videoUrl}`;
      }

      const result = {
        status: true,
        operator: "Jaybohol",
        title: random.title || "No title available",
        source: contentUrl,
        page: targetPage,
        thumbnail: random.thumb || null,
        tag: $$('div.site-main > div > header > div > div > p').text().trim() || random.tag || "No tag available",
        upload_date: $$('div.site-main').find('span.auth-posted-on > time:nth-child(2)').text().trim() || "Unknown",
        author_name: $$('div.site-main').find('span.auth-name.mf-hide > a').text().trim() || "Anonymous",
        comments: random.comment || "0 comments",
        votes: random.vote || "0 votes",
        views: $$('div.site-main').find('span.post-meta-item.post-views.s-post-views.size-lg > span.count').text().trim() || random.view || "0 views",
        video_url: videoUrl,
        content_type: videoUrl ? "video" : "image",
        timestamp: new Date().toISOString(),
        disclaimer: "⚠️ This content may be disturbing. Viewer discretion is advised.",
        credits: "Jaybohol"
      };

      res.json(result);
      
    } catch (error) {
      console.error("Gore API Error:", error.message);
      
      const statusCode = error.response?.status || 500;
      
      if (error.response?.status === 404) {
        return res.status(404).json({
          status: false,
          operator: "Jaybohol",
          error: "Page not found on seegore.com",
          details: "The requested page may not exist"
        });
      }
      
      res.status(statusCode).json({
        status: false,
        operator: "Jaybohol",
        error: "Failed to fetch gore content",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};
