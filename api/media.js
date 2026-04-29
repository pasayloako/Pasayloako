const axios = require('axios');
const fs = require('fs');

// Sound database from the HTML
const soundData = [
  { "id": 1, "title": "this is because cj is black", "audio": "https://www.myinstants.com/media/sounds/this-is-because-cj-is-black.mp3" },
  { "id": 2, "title": "FAHHHHHHHHHHH SOU KILLER", "audio": "https://www.myinstants.com/media/sounds/fahhhhhhhhhhh-sou-killer.mp3" },
  { "id": 3, "title": "Den Den Mushi Ringtone", "audio": "https://www.myinstants.com/media/sounds/den-den-mushi-short-ringtone.mp3" },
  { "id": 4, "title": "anime girl thank you", "audio": "https://www.myinstants.com/media/sounds/girl-saying-thank-you-sound-effect.mp3" },
  { "id": 5, "title": "Big Crash With Fallout", "audio": "https://www.myinstants.com/media/sounds/big-crash-with-fallout.mp3" },
  { "id": 6, "title": "Loud phonk lol", "audio": "https://www.myinstants.com/media/sounds/loud-phonk-lol.mp3" },
  { "id": 7, "title": "goatman scream (minecraft)", "audio": "https://www.myinstants.com/media/sounds/goatman-scream-minecraft.mp3" },
  { "id": 8, "title": "sUcKA DIHHHHHH", "audio": "https://www.myinstants.com/media/sounds/sucka-dihhhhhh.mp3" },
  { "id": 9, "title": "mc exp", "audio": "https://www.myinstants.com/media/sounds/mc-exp.mp3" },
  { "id": 10, "title": "formula 1 radio notification", "audio": "https://www.myinstants.com/media/sounds/formula-1-radio-notification.mp3" },
  { "id": 11, "title": "nope", "audio": "https://www.myinstants.com/media/sounds/engineer_no01_1.mp3" },
  { "id": 12, "title": "Aku kaya", "audio": "https://www.myinstants.com/media/sounds/aku-kaya.mp3" },
  { "id": 13, "title": "Minecraft Damage", "audio": "https://www.myinstants.com/media/sounds/minecraft_hit_soundmp3converter.mp3" },
  { "id": 14, "title": "Teleport DBZ", "audio": "https://www.myinstants.com/media/sounds/tmpubima4i9.mp3" },
  { "id": 15, "title": "Original Sheesh", "audio": "https://www.myinstants.com/media/sounds/original-sheesh.mp3" },
  { "id": 16, "title": "Tom and jerry scream", "audio": "https://www.myinstants.com/media/sounds/ow2-online-audio-converter.mp3" },
  { "id": 17, "title": "Meme Click", "audio": "https://www.myinstants.com/media/sounds/meme-click.mp3" },
  { "id": 18, "title": "No no Wait Wait!", "audio": "https://www.myinstants.com/media/sounds/no-no-wait-wait.mp3" },
  { "id": 19, "title": "HAAAAAAA", "audio": "https://www.myinstants.com/media/sounds/haaaaaaa_ECtJBLV.mp3" },
  { "id": 20, "title": "Minecraft Level Up Sound", "audio": "https://www.myinstants.com/media/sounds/levelup.mp3" },
  { "id": 21, "title": "horeg full bass", "audio": "https://www.myinstants.com/media/sounds/horeg-full-bass.mp3" },
  { "id": 22, "title": "FAST REWIND", "audio": "https://www.myinstants.com/media/sounds/rewind-1.mp3" },
  { "id": 23, "title": "Confused cross eyed kitten meme", "audio": "https://www.myinstants.com/media/sounds/confused-cross-eyed-kitten-meme.mp3" },
  { "id": 24, "title": "meowrgh", "audio": "https://www.myinstants.com/media/sounds/meowrgh.mp3" },
  { "id": 25, "title": "YEAHOO", "audio": "https://www.myinstants.com/media/sounds/yeahoo.mp3" },
  { "id": 26, "title": "question mark", "audio": "https://www.myinstants.com/media/sounds/question-mark.mp3" },
  { "id": 27, "title": "Screaming Goat (best)", "audio": "https://www.myinstants.com/media/sounds/screaming-goat.mp3" },
  { "id": 28, "title": "aduh (Upin Ipin)", "audio": "https://www.myinstants.com/media/sounds/aduh-upin-ipin.mp3" },
  { "id": 29, "title": "Build up", "audio": "https://www.myinstants.com/media/sounds/build-up.mp3" },
  { "id": 30, "title": "Terompet 1", "audio": "https://www.myinstants.com/media/sounds/terompet-1.mp3" },
  { "id": 31, "title": "Rahhh", "audio": "https://www.myinstants.com/media/sounds/rahhh.mp3" },
  { "id": 32, "title": "keyboardcat", "audio": "https://www.myinstants.com/media/sounds/sequence-01_1_eHQKzEe.mp3" },
  { "id": 33, "title": "jem 5", "audio": "https://www.myinstants.com/media/sounds/jem-5.mp3" },
  { "id": 34, "title": "Bamboo hit", "audio": "https://www.myinstants.com/media/sounds/bamboo-hit-sound-effect.mp3" },
  { "id": 35, "title": "Chicken screaming on a tree", "audio": "https://www.myinstants.com/media/sounds/chicken-screaming-on-a-tree.mp3" },
  { "id": 36, "title": "police siren", "audio": "https://www.myinstants.com/media/sounds/11900601.mp3" }
];

// Track play counts for popular sounds
const playCounts = {};

// Load play counts from file
function loadPlayCounts() {
  try {
    if (fs.existsSync('sound_plays.json')) {
      const data = fs.readFileSync('sound_plays.json', 'utf8');
      Object.assign(playCounts, JSON.parse(data));
    }
  } catch (e) {
    console.error('Error loading play counts:', e.message);
  }
}

// Save play counts to file
function savePlayCounts() {
  try {
    fs.writeFileSync('sound_plays.json', JSON.stringify(playCounts, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving play counts:', e.message);
  }
}

// Initialize
loadPlayCounts();

const meta = {
  name: 'Soundmeme',
  path: '/soundmeme?action=',
  method: 'get',
  category: 'media'
};

async function onStart({ req, res }) {
  const { action, id, search, limit = 20, page = 1, uid } = req.query;

  // ========== GET ALL SOUNDS ==========
  if (action === 'list' || !action) {
    let results = [...soundData];
    
    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(sound => 
        sound.title.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = results.slice(start, start + parseInt(limit));
    
    return res.json({
      status: true,
      total: results.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(results.length / parseInt(limit)),
      sounds: paginated.map(sound => ({
        id: sound.id,
        title: sound.title,
        audio_url: sound.audio,
        play_count: playCounts[sound.id] || 0
      }))
    });
  }

  // ========== GET SINGLE SOUND BY ID ==========
  if (action === 'get' && id) {
    const sound = soundData.find(s => s.id == id);
    
    if (!sound) {
      return res.status(404).json({
        status: false,
        error: 'Sound not found'
      });
    }
    
    // Increment play count
    playCounts[sound.id] = (playCounts[sound.id] || 0) + 1;
    savePlayCounts();
    
    return res.json({
      status: true,
      sound: {
        id: sound.id,
        title: sound.title,
        audio_url: sound.audio,
        play_count: playCounts[sound.id]
      }
    });
  }

  // ========== PLAY SOUND (Redirect to audio) ==========
  if (action === 'play' && id) {
    const sound = soundData.find(s => s.id == id);
    
    if (!sound) {
      return res.status(404).json({
        status: false,
        error: 'Sound not found'
      });
    }
    
    // Increment play count
    playCounts[sound.id] = (playCounts[sound.id] || 0) + 1;
    savePlayCounts();
    
    // Log play event if uid provided
    if (uid) {
      console.log(`🔊 User ${uid} played: ${sound.title}`);
    }
    
    // Redirect to audio URL (for direct playback) or return URL
    if (req.query.redirect === 'true') {
      return res.redirect(sound.audio);
    }
    
    return res.json({
      status: true,
      message: `Playing: ${sound.title}`,
      audio_url: sound.audio,
      play_count: playCounts[sound.id]
    });
  }

  // ========== GET RANDOM SOUND ==========
  if (action === 'random') {
    const randomIndex = Math.floor(Math.random() * soundData.length);
    const sound = soundData[randomIndex];
    
    playCounts[sound.id] = (playCounts[sound.id] || 0) + 1;
    savePlayCounts();
    
    return res.json({
      status: true,
      sound: {
        id: sound.id,
        title: sound.title,
        audio_url: sound.audio,
        play_count: playCounts[sound.id]
      }
    });
  }

  // ========== GET POPULAR SOUNDS ==========
  if (action === 'popular') {
    const popular = [...soundData]
      .map(sound => ({
        ...sound,
        play_count: playCounts[sound.id] || 0
      }))
      .sort((a, b) => b.play_count - a.play_count)
      .slice(0, parseInt(limit));
    
    return res.json({
      status: true,
      popular: popular
    });
  }

  // ========== SEARCH SOUNDS ==========
  if (action === 'search') {
    if (!search) {
      return res.status(400).json({
        status: false,
        error: 'Missing search query parameter'
      });
    }
    
    const searchLower = search.toLowerCase();
    const results = soundData.filter(sound => 
      sound.title.toLowerCase().includes(searchLower)
    );
    
    return res.json({
      status: true,
      query: search,
      total: results.length,
      sounds: results.map(sound => ({
        id: sound.id,
        title: sound.title,
        audio_url: sound.audio,
        play_count: playCounts[sound.id] || 0
      }))
    });
  }

  // ========== GET STATISTICS ==========
  if (action === 'stats') {
    const totalPlays = Object.values(playCounts).reduce((a, b) => a + b, 0);
    const mostPlayed = [...soundData]
      .map(sound => ({
        title: sound.title,
        plays: playCounts[sound.id] || 0
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);
    
    return res.json({
      status: true,
      stats: {
        total_sounds: soundData.length,
        total_plays: totalPlays,
        most_played: mostPlayed
      }
    });
  }

  // ========== HTML INTERFACE (like original) ==========
  if (action === 'html') {
    const html = generateHTML();
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  // ========== DEFAULT USAGE ==========
  return res.json({
    status: true,
    available_actions: {
      list: '/soundmeme?action=list&page=1&limit=20',
      search: '/soundmeme?action=search&search=cat',
      get: '/soundmeme?action=get&id=1',
      play: '/soundmeme?action=play&id=1',
      random: '/soundmeme?action=random',
      popular: '/soundmeme?action=popular&limit=10',
      stats: '/soundmeme?action=stats',
      html: '/soundmeme?action=html (web interface)'
    },
    example: {
      list_all: '/api/soundmeme',
      play_sound: '/api/soundmeme?action=play&id=1',
      search_meme: '/api/soundmeme?action=search&search=minecraft'
    }
  });
}

// Generate HTML interface (like original but API-based)
function generateHTML() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Soundmeme API - Jay Sound Board</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
        body { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); min-height: 100vh; color: white; }
        .navbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; background: rgba(15, 12, 41, 0.8); backdrop-filter: blur(10px); }
        .brand-name { font-size: 1.5rem; font-weight: 800; background: linear-gradient(to right, #fff, #a29bfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .search-box { padding: 10px 20px; border-radius: 50px; border: none; outline: none; width: 250px; }
        .main-container { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .sound-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
        .sound-card { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 15px; text-align: center; cursor: pointer; transition: 0.3s; }
        .sound-card:hover { background: rgba(108, 92, 231, 0.2); transform: translateY(-5px); }
        .sound-card i { font-size: 30px; color: #a29bfe; }
        .sound-card span { font-size: 0.8rem; display: block; margin-top: 10px; }
        audio { display: none; }
        .stats-bar { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; }
        @media (max-width: 480px) { .sound-grid { grid-template-columns: repeat(2, 1fr); } }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="brand-name">🎵 Soundmeme API</div>
        <input type="text" id="searchInput" class="search-box" placeholder="Search sounds...">
    </nav>
    <div class="main-container">
        <div class="stats-bar" id="statsBar">Loading stats...</div>
        <div class="sound-grid" id="soundGrid"></div>
    </div>
    <audio id="audioPlayer"></audio>
    <script>
        let sounds = [];
        
        async function loadSounds() {
            const res = await fetch('/api/soundmeme?action=list&limit=100');
            const data = await res.json();
            sounds = data.sounds;
            renderSounds(sounds);
            loadStats();
        }
        
        function renderSounds(soundList) {
            const grid = document.getElementById('soundGrid');
            grid.innerHTML = '';
            soundList.forEach(sound => {
                const card = document.createElement('div');
                card.className = 'sound-card';
                card.innerHTML = '<i class="fas fa-play-circle"></i><span>' + sound.title + '</span>';
                card.onclick = () => {
                    const player = document.getElementById('audioPlayer');
                    player.src = sound.audio_url;
                    player.play();
                };
                grid.appendChild(card);
            });
        }
        
        async function loadStats() {
            const res = await fetch('/api/soundmeme?action=stats');
            const data = await res.json();
            if (data.status) {
                document.getElementById('statsBar').innerHTML = '🎵 Total Sounds: ' + data.stats.total_sounds + ' | 🔊 Total Plays: ' + data.stats.total_plays;
            }
        }
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const search = e.target.value.toLowerCase();
            const filtered = sounds.filter(s => s.title.toLowerCase().includes(search));
            renderSounds(filtered);
        });
        
        loadSounds();
    </script>
</body>
</html>`;
}

module.exports = { meta, onStart };
