const axios = require("axios");

module.exports = {
  meta: {
    name: "GitHub User Search",
    description: "Search and get GitHub user profile information",
    author: "Jaybohol",
    version: "1.0.1",
    category: "random",
    method: "GET",
    path: "/github/user?username="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { username } = req.query;
      
      if (!username) {
        return res.status(400).json({
          status: false,
          operator: "JayBohol",
          error: "Username parameter is required",
          usage: {
            example: "/github/user?username=torvalds",
            endpoints: {
              user: "/github/user?username=USERNAME",
              repos: "/github/repos?username=USERNAME",
              battle: "/github/battle?player1=USERNAME1&player2=USERNAME2"
            }
          }
        });
      }
      
      // GitHub API requires authentication for higher rate limits
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
      
      const headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; GitHub-API-Request/1.0)',
        'Accept': 'application/vnd.github.v3+json'
      };
      
      // Add token if available (increases rate limit to 5000/hr)
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
      }
      
      const APIURL = "https://api.github.com/users/";
      
      // Fetch user data with retry logic
      const fetchWithRetry = async (url, retries = 2) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await axios.get(url, { headers, timeout: 10000 });
            return response;
          } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      };
      
      const { data } = await fetchWithRetry(APIURL + username);
      
      // Check if rate limit is hit
      if (data.message && data.message.includes("API rate limit exceeded")) {
        return res.status(429).json({
          status: false,
          operator: "JayBohol",
          error: "GitHub API rate limit exceeded. Please try again later.",
          suggestion: "Add a GitHub token to increase rate limit to 5000 requests/hour"
        });
      }
      
      // Get user's repositories for stats
      let reposData = [];
      let totalStars = 0;
      
      try {
        const reposResponse = await fetchWithRetry(APIURL + username + "/repos?per_page=100&sort=updated");
        reposData = reposResponse.data;
        totalStars = reposData.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
      } catch (repoError) {
        // Continue even if repos fail - just show partial data
        console.log("Could not fetch repos:", repoError.message);
      }
      
      const topRepos = reposData
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 5)
        .map(repo => ({
          name: repo.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          url: repo.html_url,
          language: repo.language,
          description: repo.description ? repo.description.substring(0, 100) : null
        }));
      
      // Calculate achievement badges
      const badges = [];
      if (data.followers >= 10000) badges.push("🏆 10K Club");
      if (data.public_repos >= 100) badges.push("📦 Prolific");
      if (data.followers >= 1000) badges.push("⭐ Popular");
      if (data.public_repos >= 50) badges.push("🚀 Active");
      if (totalStars >= 10000) badges.push("✨ Star Collector");
      if (data.followers >= 5000) badges.push("🌟 Influencer");
      
      res.json({
        status: true,
        operator: "JayBohol",
        user: {
          login: data.login,
          name: data.name || data.login,
          bio: data.bio || "No bio available",
          avatar_url: data.avatar_url,
          html_url: data.html_url,
          location: data.location || "Not specified",
          company: data.company || "Not specified",
          blog: data.blog || "Not specified",
          twitter_username: data.twitter_username || "Not specified",
          created_at: data.created_at,
          updated_at: data.updated_at
        },
        stats: {
          followers: data.followers,
          following: data.following,
          public_repos: data.public_repos,
          public_gists: data.public_gists || 0,
          total_stars: totalStars
        },
        top_repos: topRepos,
        badges: badges,
        timestamp: new Date().toISOString(),
        author: "Jaybohol"
      });
      
    } catch (error) {
      console.error("GitHub API Error:", error.message);
      
      // Handle different error types
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 404) {
          return res.status(404).json({
            status: false,
            operator: "JayBohol",
            error: "No GitHub profile found",
            username: req.query.username,
            message: `User "${req.query.username}" does not exist on GitHub`
          });
        }
        
        if (status === 403) {
          return res.status(429).json({
            status: false,
            operator: "JayBohol",
            error: "GitHub API rate limit exceeded",
            message: data.message || "Too many requests. Please try again later.",
            suggestion: "Add a GitHub Personal Access Token to increase limits"
          });
        }
        
        if (status === 401) {
          return res.status(500).json({
            status: false,
            operator: "JayBohol",
            error: "GitHub API authentication failed",
            message: "Invalid or missing GitHub token"
          });
        }
      }
      
      res.status(500).json({
        status: false,
        operator: "JayBohol",
        error: "Failed to fetch GitHub user data",
        details: error.message,
        suggestion: "Try again in a few minutes or add a GitHub token",
        author: "Jaybohol"
      });
    }
  }
};
