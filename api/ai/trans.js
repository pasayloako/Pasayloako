const path = require('path');
const axios = require('axios');
const fs = require('fs');

// Memory of translations by UID
const memory = {};

function saveMemory(uid) {
  try {
    fs.writeFileSync(`./memory_translate_${uid}.json`, JSON.stringify(memory[uid], null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving memory:', e.message);
  }
}

function loadMemory(uid) {
  try {
    const file = `./memory_translate_${uid}.json`;
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading memory:', e.message);
  }
  return null;
}

// Endpoint /translate
async function onTranslate({ req, res }) {
  const { text, lang, uid } = req.query;

  if (!text || !lang || !uid) {
    return res.status(400).json({
      error: "Parameters 'text', 'lang', and 'uid' are required",
      example: "/translate?text=Hello&lang=en&uid=123"
    });
  }

  // Initialize memory for this UID
  if (!memory[uid]) {
    const saved = loadMemory(uid);
    memory[uid] = saved || [];
  }

  // Add original text to memory
  memory[uid].push({ role: 'user', content: text });

  try {
    // Actual call to LibreTranslate
    const response = await axios.post('https://libretranslate.de/translate', {
      q: text,
      source: 'auto', // automatically detects language
      target: lang,
      format: 'text'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const translation = response.data.translatedText;

    // Add translation to memory
    memory[uid].push({ role: 'assistant', content: translation });
    saveMemory(uid);

    // Return to client
    res.json({
      status: true,
      translation: translation
    });

  } catch (err) {
    console.error("Translation error:", err.message);
    res.status(500).json({ status: false, error: err.message });
  }
}

module.exports = { onTranslate };
