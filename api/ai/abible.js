// api/abible.js

const axios = require('axios');

module.exports = {
  meta: {
    name: "Bible Verse",
    description: "Get a Bible verse based on any topic using AI",
    author: "Jaybohol",
    version: "3.0.0",
    category: "religion",
    method: "GET",
    path: "/abible?q="
  },

  onStart: async function({ req, res }) {
    try {
      let { q } = req.query;

      if (!q) {
        return res.status(400).send("Missing query parameter. Usage: /abible?q=lust");
      }

      // Try AI first
      let verse = await getAIVerse(q);
      
      // If AI fails, use fallback
      if (!verse) {
        verse = getFallbackVerse(q);
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(verse);

    } catch (error) {
      console.error("Bible API Error:", error.message);
      const fallbackVerse = getFallbackVerse(req.query.q);
      res.setHeader('Content-Type', 'text/plain');
      res.send(fallbackVerse);
    }
  }
};

async function getAIVerse(topic) {
  // Try different free AI APIs
  const apis = [
    // Pollinations AI (free, no key, working)
    {
      url: `https://text.pollinations.ai/prompt/You%20are%20a%20Bible%20verse%20assistant.%20Respond%20with%20ONLY%20a%20Bible%20verse%20in%20format%3A%20%5BBook%20Chapter%3AVerse%5D%0A%22%5Bverse%20text%5D%22%0A%0ATopic%3A%20${encodeURIComponent(topic)}`,
      type: 'pollinations'
    },
    // Alternative: using chatgpt4 via different proxy
    {
      url: `https://chatgpt-4.p.rapidapi.com/`,
      type: 'rapidapi'
    }
  ];

  // Try Pollinations AI first (most reliable free option)
  try {
    const response = await axios.get(apis[0].url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    let verse = response.data;
    
    // Clean up the response
    verse = verse.replace(/```/g, '');
    verse = verse.trim();
    
    if (verse && (verse.includes(':') || verse.includes('"'))) {
      return verse;
    }
  } catch (e) {
    console.log("Pollinations AI failed:", e.message);
  }

  return null;
}

function getFallbackVerse(topic) {
  const lowerTopic = (topic || "").toLowerCase();
  
  // Comprehensive verse database for common topics
  const verses = {
    // Sinful nature topics
    "lust": `Matthew 5:28\n"But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart."`,
    "greed": `1 Timothy 6:10\n"For the love of money is a root of all kinds of evil. Some people, eager for money, have wandered from the faith and pierced themselves with many griefs."`,
    "anger": `Ephesians 4:26-27\n"In your anger do not sin. Do not let the sun go down while you are still angry, and do not give the devil a foothold."`,
    "jealousy": `Proverbs 14:30\n"A heart at peace gives life to the body, but envy rots the bones."`,
    "pride": `Proverbs 16:18\n"Pride goes before destruction, a haughty spirit before a fall."`,
    "laziness": `Proverbs 13:4\n"A sluggard's appetite is never filled, but the desires of the diligent are fully satisfied."`,
    "gluttony": `Proverbs 23:20-21\n"Do not join those who drink too much wine or gorge themselves on meat, for drunkards and gluttons become poor, and drowsiness clothes them in rags."`,
    "lying": `Proverbs 12:22\n"The Lord detests lying lips, but he delights in people who are trustworthy."`,
    "stealing": `Exodus 20:15\n"You shall not steal."`,
    
    // Positive virtues
    "love": `John 3:16\n"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."`,
    "faith": `Hebrews 11:1\n"Now faith is confidence in what we hope for and assurance about what we do not see."`,
    "hope": `Jeremiah 29:11\n"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."`,
    "peace": `John 14:27\n"Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid."`,
    "joy": `Nehemiah 8:10\n"The joy of the Lord is your strength."`,
    "kindness": `Ephesians 4:32\n"Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you."`,
    "patience": `Proverbs 15:18\n"A hot-tempered person stirs up conflict, but the one who is patient calms a quarrel."`,
    "humility": `Philippians 2:3\n"Do nothing out of selfish ambition or vain conceit. Rather, in humility value others above yourselves."`,
    "gratitude": `1 Thessalonians 5:18\n"Give thanks in all circumstances; for this is the will of God in Christ Jesus for you."`,
    
    // Struggles
    "fear": `Isaiah 41:10\n"So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand."`,
    "anxiety": `Philippians 4:6-7\n"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."`,
    "depression": `Psalm 34:17-18\n"The righteous cry out, and the Lord hears them; he delivers them from all their troubles. The Lord is close to the brokenhearted and saves those who are crushed in spirit."`,
    "loneliness": `Deuteronomy 31:6\n"Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you."`,
    "grief": `Matthew 5:4\n"Blessed are those who mourn, for they will be comforted."`,
    "temptation": `1 Corinthians 10:13\n"No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear. But when you are tempted, he will also provide a way out so that you can endure it."`,
    "guilt": `1 John 1:9\n"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness."`,
    
    // Wisdom
    "wisdom": `Proverbs 3:5-6\n"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."`,
    "guidance": `Psalm 32:8\n"I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you."`,
    "prayer": `Philippians 4:6\n"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."`,
    "forgiveness": `Colossians 3:13\n"Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you."`,
    
    // Life
    "purpose": `Jeremiah 29:11\n"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."`,
    "strength": `Philippians 4:13\n"I can do all this through him who gives me strength."`,
    "courage": `Joshua 1:9\n"Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."`,
    "success": `Joshua 1:8\n"Keep this Book of the Law always on your lips; meditate on it day and night, so that you may be careful to do everything written in it. Then you will be prosperous and successful."`,
    "healing": `Jeremiah 30:17\n"But I will restore you to health and heal your wounds, declares the Lord."`
  };
  
  // Check for exact match
  if (verses[lowerTopic]) {
    return verses[lowerTopic];
  }
  
  // Check for partial match
  for (const [key, value] of Object.entries(verses)) {
    if (lowerTopic.includes(key) || key.includes(lowerTopic)) {
      return value;
    }
  }
  
  // Default encouraging verses
  const defaultVerses = [
    `Psalm 119:105\n"Your word is a lamp for my feet, a light on my path."`,
    `Romans 8:28\n"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."`,
    `Proverbs 3:5-6\n"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."`,
    `Jeremiah 29:11\n"'For I know the plans I have for you,' declares the Lord, 'plans to prosper you and not to harm you, plans to give you hope and a future.'"`,
    `Philippians 4:13\n"I can do all this through him who gives me strength."`,
    `Joshua 1:9\n"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."`,
    `Matthew 11:28-30\n"Come to me, all you who are weary and burdened, and I will give you rest."`
  ];
  
  return defaultVerses[Math.floor(Math.random() * defaultVerses.length)];
}
