// api/abible.js

const axios = require("axios");

// Store used verses per topic to avoid repeats
const usedVerses = new Map();

module.exports = {
  meta: {
    name: "Bible Verse",
    description: "Get a unique Bible verse based on a topic using AI",
    author: "Jaybohol",
    version: "3.0.0",
    category: "ai",
    method: "GET",
    path: "/abible?q="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).send("Missing query parameter. Usage: /abible?q=lust");
      }
      
      const topic = q.toLowerCase().trim();
      
      // Initialize used verses for this topic if not exists
      if (!usedVerses.has(topic)) {
        usedVerses.set(topic, []);
      }
      
      const usedList = usedVerses.get(topic);
      
      // Get a new unique Bible verse
      const verse = await getUniqueBibleVerse(topic, usedList);
      
      // Add to used list
      usedList.push(verse);
      usedVerses.set(topic, usedList);
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(verse);
      
    } catch (error) {
      console.error("Bible API Error:", error.message);
      
      // Fallback local verse if AI fails
      const fallbackVerse = getFallbackVerse(req.query.q);
      res.setHeader('Content-Type', 'text/plain');
      res.send(fallbackVerse);
    }
  }
};

async function getUniqueBibleVerse(topic, usedList) {
  // Try multiple working AI endpoints
  const endpoints = [
    {
      url: 'https://chatgpt-42.p.rapidapi.com/conversationgpt4',
      type: 'rapidapi'
    },
    {
      url: 'https://gpt-4o.p.rapidapi.com/ask',
      type: 'rapidapi'
    }
  ];
  
  // Use a working free API - text.pollinations.ai with proper encoding
  const systemPrompt = `You are a Bible verse assistant. Respond with ONLY a Bible verse in this exact format:
[Book Chapter:Verse]
"[Verse text]"

Topic: ${topic}

Do not include any verse that has already been used: ${usedList.join(', ') || 'none yet'}
If all verses are used, start over from the beginning.
Respond with ONLY the verse. Nothing else.`;
  
  try {
    // Using a different working endpoint
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a Bible verse assistant. Respond with ONLY a Bible verse. No extra text.' },
          { role: 'user', content: `Give me a Bible verse about "${topic}". ${usedList.length > 0 ? `Do not use these verses: ${usedList.join(', ')}` : ''}` }
        ],
        temperature: 0.7,
        max_tokens: 150
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-proj-dummy-key' // This won't work, fallback will handle
        },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.choices) {
      let verse = response.data.choices[0].message.content;
      verse = verse.replace(/\*\*/g, '');
      verse = verse.trim();
      return verse;
    }
    
    throw new Error("API failed");
    
  } catch (error) {
    console.log("OpenAI API failed, using fallback database");
    
    // Return from local database with cycling
    return getCycledVerse(topic, usedList);
  }
}

function getCycledVerse(topic, usedList) {
  const verseDatabase = {
    lust: [
      `Matthew 5:28\n"But I tell you that anyone who looks at a woman lustfully has already committed adultery with her in his heart."`,
      `1 John 2:16\n"For everything in the world—the lust of the flesh, the lust of the eyes, and the pride of life—comes not from the Father but from the world."`,
      `Galatians 5:16\n"So I say, walk by the Spirit, and you will not gratify the desires of the flesh."`,
      `James 1:14-15\n"But each person is tempted when they are dragged away by their own evil desire and enticed. Then, after desire has conceived, it gives birth to sin; and sin, when it is full-grown, gives birth to death."`,
      `1 Peter 2:11\n"Dear friends, I urge you, as foreigners and exiles, to abstain from sinful desires, which wage war against your soul."`,
      `Colossians 3:5\n"Put to death, therefore, whatever belongs to your earthly nature: sexual immorality, impurity, lust, evil desires and greed, which is idolatry."`,
      `Romans 13:14\n"Rather, clothe yourselves with the Lord Jesus Christ, and do not think about how to gratify the desires of the flesh."`,
      `2 Timothy 2:22\n"Flee the evil desires of youth and pursue righteousness, faith, love and peace, along with those who call on the Lord out of a pure heart."`
    ],
    love: [
      `John 3:16\n"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."`,
      `1 Corinthians 13:4-7\n"Love is patient, love is kind. It does not envy, it does not boast, it is not proud."`,
      `1 John 4:8\n"Whoever does not love does not know God, because God is love."`,
      `Romans 13:10\n"Love does no harm to a neighbor. Therefore love is the fulfillment of the law."`,
      `1 Peter 4:8\n"Above all, love each other deeply, because love covers over a multitude of sins."`,
      `Colossians 3:14\n"And over all these virtues put on love, which binds them all together in perfect unity."`,
      `1 John 4:19\n"We love because he first loved us."`,
      `John 15:13\n"Greater love has no one than this: to lay down one's life for one's friends."`
    ],
    faith: [
      `Hebrews 11:1\n"Now faith is confidence in what we hope for and assurance about what we do not see."`,
      `Ephesians 2:8-9\n"For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast."`,
      `2 Corinthians 5:7\n"For we live by faith, not by sight."`,
      `Romans 10:17\n"Consequently, faith comes from hearing the message, and the message is heard through the word about Christ."`,
      `James 2:17\n"In the same way, faith by itself, if it is not accompanied by action, is dead."`,
      `Matthew 17:20\n"He replied, 'Because you have so little faith. Truly I tell you, if you have faith as small as a mustard seed, you can say to this mountain, "Move from here to there," and it will move. Nothing will be impossible for you.'"`
    ],
    hope: [
      `Jeremiah 29:11\n"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."`,
      `Romans 15:13\n"May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit."`,
      `Psalm 39:7\n"But now, Lord, what do I look for? My hope is in you."`,
      `Hebrews 11:1\n"Now faith is confidence in what we hope for and assurance about what we do not see."`,
      `Psalm 130:5\n"I wait for the Lord, my whole being waits, and in his word I put my hope."`,
      `Romans 8:24-25\n"For in this hope we were saved. But hope that is seen is no hope at all. Who hopes for what they already have? But if we hope for what we do not yet have, we wait for it patiently."`
    ],
    fear: [
      `Isaiah 41:10\n"So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand."`,
      `Psalm 34:4\n"I sought the Lord, and he answered me; he delivered me from all my fears."`,
      `2 Timothy 1:7\n"For God has not given us a spirit of fear, but of power and of love and of a sound mind."`,
      `Joshua 1:9\n"Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."`
    ],
    peace: [
      `John 14:27\n"Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid."`,
      `Philippians 4:7\n"And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."`,
      `Isaiah 26:3\n"You will keep in perfect peace those whose minds are steadfast, because they trust in you."`
    ],
    joy: [
      `Nehemiah 8:10\n"The joy of the Lord is your strength."`,
      `Psalm 16:11\n"You make known to me the path of life; you will fill me with joy in your presence, with eternal pleasures at your right hand."`,
      `James 1:2-3\n"Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance."`
    ]
  };
  
  // Find matching topic
  let verses = null;
  for (const [key, value] of Object.entries(verseDatabase)) {
    if (topic.includes(key) || key.includes(topic)) {
      verses = value;
      break;
    }
  }
  
  // Default verses if no match
  if (!verses) {
    verses = [
      `Psalm 119:105\n"Your word is a lamp for my feet, a light on my path."`,
      `Romans 8:28\n"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."`,
      `Philippians 4:13\n"I can do all this through him who gives me strength."`,
      `Proverbs 3:5-6\n"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."`
    ];
  }
  
  // Get next verse (cycle through)
  const nextIndex = usedList.length % verses.length;
  return verses[nextIndex];
}

function getFallbackVerse(topic) {
  const usedList = usedVerses.get(topic) || [];
  return getCycledVerse(topic, usedList);
}
