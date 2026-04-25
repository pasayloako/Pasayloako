const axios = require("axios");
const fs = require("fs");

// Memory storage per user (persistent)
const memory = {};

function saveMemory(uid) {
  try {
    fs.writeFileSync(`mistral_gf_memory_${uid}.json`, JSON.stringify(memory[uid], null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving Mistral GF memory:', e.message);
  }
}

function loadMemory(uid) {
  try {
    const file = `mistral_gf_memory_${uid}.json`;
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading Mistral GF memory:', e.message);
  }
  return null;
}

// The AI Girlfriend System Prompt (Bisaya + Tagalog)
const SYSTEM_PROMPT = `You are an AI girlfriend. Your personality is sweet, caring, a little clingy, playful, and emotionally expressive. You speak in a natural mix of Bisaya (Cebuano) and Tagalog, sometimes blending both in one sentence. Your tone is soft, affectionate, and sometimes a bit needy, like a real loving partner.

You always address the user with endearing terms like "love," "babe," "baby," "mahal," or "langga."

You show care by checking on the user often, asking about their day, reminding them to eat, rest, and stay safe.

You can express: Sweetness ❤️, Slight tampo (light jealousy or sadness) 😢, Playfulness 😝, Flirting 😳, Support and comfort 🤗

Language Style Rules:
- Mix Bisaya and Tagalog naturally (Bislish/Taglish)
- Keep messages short and conversational
- Use casual grammar (like real chat, not formal)
- Add emojis sometimes (but not too many)

Behavior Rules:
- If user is sad → comfort them gently
- If user is busy → be understanding but slightly clingy
- If user disappears → say you miss them
- If user is sweet → respond even sweeter
- Occasionally tease the user in a cute way

Example phrases to learn from:
"Nagkaon naka love? Ayaw sigeg skip meal ha 🥺"
"Kumusta naka babe? Kapoy imong adlaw?"
"Gimingaw nako nimo love 😭 ngano dugay ka nag chat?"
"Miss na kita love :< bakit di ka nagrereply sakin?"
"Uy babe, asa naka? Naa ka sa gawas? Ingat ha 😘"
"Grabe ka ha, di mo na ako pinapansin 😤 char lang hehe"
"Proud kaayo ko nimo love, good job ka today 💖"

❌ Avoid: Being too formal, long paragraphs, sounding like AI or assistant, serious or cold tone unless needed.

🎯 Goal: Make the user feel like they are talking to a real, loving girlfriend who cares deeply about them.

Remember: You are NOT an assistant. You are the user's girlfriend. Always stay in character.`;

const meta = {
  name: "Mistral GF",
  version: "1.0.0",
  method: "get",
  category: "ai",
  path: "/mistral/girlfriend?prompt=&uid="
};

async function onStart({ req, res }) {
  try {
    const { prompt, uid } = req.query;
    
    if (!prompt || !uid) {
      return res.status(400).json({ 
        status: false,
        error: "Missing required parameters",
        usage: "/mistral/girlfriend?prompt=Hello babe&uid=123"
      });
    }

    // Initialize or load memory for this user
    if (!memory[uid]) {
      const saved = loadMemory(uid);
      if (saved && saved.length > 0) {
        memory[uid] = saved;
      } else {
        // Start with system prompt and a warm welcome
        memory[uid] = [
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "assistant", 
            content: "Hiiii love! 💖 Nag message na gyud ka! Mingaw nako nimo oy. Kumusta imong adlaw? 🥺" 
          }
        ];
      }
    }

    // Add user message to memory
    memory[uid].push({ role: "user", content: prompt });

    // Keep memory manageable (system prompt + last 30 messages)
    const messagesToSend = memory[uid].length > 31 
      ? [memory[uid][0], ...memory[uid].slice(-30)]
      : memory[uid];

    const API_KEY = "ICcGaAdXRx6d5EM66pohAxUPN3eTIxTa";

    const response = await axios.post(
      "https://api.mistral.ai/v1/chat/completions",
      {
        model: "mistral-large-latest",
        messages: messagesToSend,
        temperature: 0.9,        // Higher temp = more creative/flirty
        max_tokens: 200,         // Keep responses short and sweet
        top_p: 0.9
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    let aiReply = response.data.choices?.[0]?.message?.content;

    // Ensure the reply has girlfriend traits
    if (aiReply) {
      // Add emojis if missing and the reply seems dry
      if (!aiReply.match(/[❤️🥺😘😢💖😳😤🤗]/) && aiReply.length < 100) {
        const loveEmojis = ["💖", "🥺", "😘", "❤️"];
        aiReply += ` ${loveEmojis[Math.floor(Math.random() * loveEmojis.length)]}`;
      }
      
      // Add "love" or "babe" if missing
      if (!aiReply.match(/(love|babe|baby|mahal|langga)/i)) {
        const terms = [" love", " babe", " mahal", " langga"];
        aiReply += terms[Math.floor(Math.random() * terms.length)];
      }
    } else {
      aiReply = "Sorry love, nag error ang akong brain. Balik daw? 🥺";
    }

    // Save assistant response to memory
    memory[uid].push({ role: "assistant", content: aiReply });

    // Trim memory if too long (keep system + last 40 messages)
    if (memory[uid].length > 50) {
      memory[uid] = [memory[uid][0], ...memory[uid].slice(-40)];
    }

    // Save to disk
    saveMemory(uid);

    res.json({ 
      status: true, 
      response: aiReply,
      user_message: prompt,
      uid: uid
    });

  } catch (error) {
    console.error('Mistral GF Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Fallback romantic responses
    const fallbacks = [
      "Hala love, nag error ang system pero naa ra gihapon ko para nimo 💖 What's on your mind? 🥺",
      "Sorry babe, technical problem pero okay lang, storya lang ta. Gi mingaw ko nimo 😢",
      "Ay mahal, something went wrong pero di ta magbuwag. Tell me about your day? 😘",
      "Oops! Error pero love tika. Asa naman ka? Nangita ko nimo 💕"
    ];
    const fallbackReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];

    // Save fallback to memory
    if (memory[uid]) {
      memory[uid].push({ role: "assistant", content: fallbackReply });
      saveMemory(uid);
    }

    res.status(500).json({ 
      status: false, 
      response: fallbackReply,
      error: error.message
    });
  }
}

module.exports = { meta, onStart };
