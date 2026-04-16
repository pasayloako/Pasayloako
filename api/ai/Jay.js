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
  name: 'Jay',
  path: '/jay?prompt=&uid=',
  method: 'get',
  category: 'ai'
};

async function onStart({ req, res }) {
  const { prompt, uid } = req.query;

  if (!prompt || !uid) {
    return res.status(400).json({
      error: 'Both prompt and uid parameters are required',
      example: '/jay?prompt=hello&uid=123'
    });
  }

  // Initialise la mémoire pour cet utilisateur s’il n’existe pas
  if (!memory[uid]) {
    const saved = loadMemory(uid); // 🔥 charge ancienne mémoire
    memory[uid] = saved || [
      {
        role: "system",
        content: "‎Hello! I'm JAYB0T, your AI educational assistant. I can help you with a wide range of educational topics including science, mathematics, history, language learning, and more. What would you like to learn about today?."
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
    console.log("Réponse Jay API:", response.data);  

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
    console.error('Jay API Error:', {
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
