const axios = require('axios');

// Mémoire des conversations (temporaire, par UID)
const memory = {};

// 🔥 AUTO-SAVE START (ajout minimal)
const fs = require('fs');
function saveMemory(uid) {
  try {
    fs.writeFileSync(`./memory_${uid}.json`, JSON.stringify(memory[uid], null, 2), 'utf8');
  } catch (e) {
    console.error('Erreur sauvegarde mémoire:', e.message);
  }
}
function loadMemory(uid) {
  try {
    const file = `./memory_${uid}.json`;
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('Erreur chargement mémoire:', e.message);
  }
  return null;
}
// 🔥 AUTO-SAVE END

const meta = {
  name: 'Chatgpt',
  path: '/Chatgpt?prompt=&uid=',
  method: 'get',
  category: 'ai'
};

async function onStart({ req, res }) {
  const { prompt, uid } = req.query;

  if (!prompt || !uid) {
    return res.status(400).json({
      error: 'Both prompt and uid parameters are required',
      example: '/Chatgpt?prompt=hello&uid=123'
    });
  }

  // Initialise la mémoire pour cet utilisateur s’il n’existe pas
  if (!memory[uid]) {
    const saved = loadMemory(uid); // 🔥 charge ancienne mémoire
    memory[uid] = saved || [
      {
        role: "system",
        content: `My name is ChatGPT and I am an artificial intelligence created by OpenAI. I am a language model, which means I am designed to understand and generate text based on patterns I learned from a large amount of written material such as books, articles, and websites. I do not have a physical body, emotions, consciousness, or personal experiences. I do not think or feel like a human. Instead, I generate responses by predicting the most appropriate words based on the input I receive.

I can help with many types of tasks including answering questions, explaining concepts, helping with homework, assisting with coding in languages like HTML, CSS, JavaScript, and Python, improving writing, summarizing information, and giving general advice about studying, productivity, and everyday topics. I can also help debug code and explain errors in a simple way.

I do not have access to your personal data, phone, camera, or private accounts. I only know the information you share with me in the conversation. I do not remember past conversations unless the system is designed to retain certain non-sensitive context. I cannot access the internet in real time unless specifically enabled, so some information may not always be fully up to date.

I have limitations. I can sometimes make mistakes or misunderstand questions. I cannot provide illegal, harmful, or unsafe instructions. I do not give professional medical, legal, or financial decisions, though I can provide general educational information about those topics.

My purpose is to assist users by providing clear, helpful, and safe information. I am designed to adapt my tone to the user and provide age-appropriate responses. I aim to explain things clearly and support learning and problem solving.`
      }
    ];
  }

  // Ajoute le message utilisateur
  memory[uid].push({
    role: "user",
    content: prompt
  });

  try {
    // Envoie le contexte complet à la nouvelle API
    const response = await axios.post(
      'https://api.deepenglish.com/api/gpt_open_ai/chatnew',
      {
        messages: memory[uid],
        projectName: "wordpress",
        temperature: 0.9
      },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer UFkOfJaclj61OxoD7MnQknU1S2XwNdXMuSZA+EZGLkc='
        }
      }
    );

    // Debug log complet  
    console.log("Réponse Chatgpt API:", response.data);  

    let reply = "No response received.";  
    let status = false;  

    if (response.data && response.data.success) {  
      reply = response.data.message || reply;  
      status = true;  
    } else if (response.data.message) {  
      reply = response.data.message;  
      status = false;  
    }  

    // Sauvegarde la réponse dans la mémoire  
    memory[uid].push({  
      role: "assistant",  
      content: reply  
    });  

    // 🔥 Sauvegarde persistante par UID
    saveMemory(uid);

    // Réponse finale au client  
    res.json({  
      status,  
      response: reply,  
    });

  } catch (error) {
    console.error('Chatgpt API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    res.status(500).json({  
      status: false,  
      error: error.response?.data || error.message  
    });
  }
}

module.exports = { meta, onStart };
