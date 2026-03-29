// api/biblegpt.js - With Memory

const axios = require("axios");

// Simple in-memory storage for conversations
// In production, use a database like Redis, MongoDB, etc.
const conversations = new Map();

// Clean up old conversations after 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of conversations.entries()) {
    if (now - data.timestamp > 3600000) { // 1 hour
      conversations.delete(id);
    }
  }
}, 300000); // Check every 5 minutes

module.exports = {
  meta: {
    name: "BibleGPT",
    description: "AI-powered tool that delivers accurate Bible-based answers with conversation memory",
    author: "Jaybohol",
    version: "2.0.0",
    category: "ai",
    method: "GET",
    path: "/biblegpt?q="
  },
  
  onStart: async function({ req, res }) {
    try {
      const { q, session_id } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          author: "Jaybohol",
          message: "Please provide a question",
          usage: "/biblegpt?q=I'm lonely&session_id=user123"
        });
      }
      
      // Get or create session
      let sessionId = session_id;
      if (!sessionId) {
        // Generate a simple session ID if not provided
        sessionId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }
      
      // Get conversation history
      let conversation = conversations.get(sessionId);
      if (!conversation) {
        conversation = {
          messages: [],
          timestamp: Date.now()
        };
      }
      
      // Update timestamp
      conversation.timestamp = Date.now();
      
      // Get Bible-based response with context
      const result = await getBibleResponseWithMemory(q, conversation.messages);
      
      // Store this exchange in memory
      conversation.messages.push({
        role: "user",
        content: q,
        timestamp: Date.now()
      });
      conversation.messages.push({
        role: "assistant",
        content: result.answer,
        timestamp: Date.now()
      });
      
      // Keep only last 10 messages to prevent memory overflow
      if (conversation.messages.length > 20) {
        conversation.messages = conversation.messages.slice(-20);
      }
      
      conversations.set(sessionId, conversation);
      
      res.json({
        success: true,
        author: "Jaybohol",
        session_id: sessionId,
        result: {
          answer: result.answer
        }
      });
      
    } catch (error) {
      console.error("BibleGPT Error:", error.message);
      
      res.status(500).json({
        success: false,
        author: "Jaybohol",
        message: error.message || "Failed to get Bible response"
      });
    }
  }
};

// ============= BIBLE RESPONSE WITH MEMORY =============

async function getBibleResponseWithMemory(question, history) {
  try {
    // Build conversation context
    let context = "";
    if (history && history.length > 0) {
      const lastFew = history.slice(-6); // Last 3 exchanges
      context = "Previous conversation:\n";
      for (const msg of lastFew) {
        context += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
      }
      context += "\nCurrent question: " + question + "\n\n";
    }
    
    const fullPrompt = context + question;
    
    // System prompt for BibleGPT with context awareness
    const systemPrompt = `You are BibleGPT, an AI-powered tool that delivers accurate Bible-based answers. 
You remember the previous conversation. Be consistent and refer back to previous topics when relevant.
Your responses must:
- Be based on the Bible
- Include relevant Bible verses with references
- Be warm, compassionate, and helpful
- Answer directly without extra formatting like ** or markdown
- Keep responses concise but meaningful`;
    
    // Call Pollinations AI with context
    const response = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`, {
      params: {
        model: "openai",
        temperature: 0.7,
        system: systemPrompt
      },
      timeout: 30000
    });
    
    let answer = response.data;
    
    // Clean up formatting
    answer = answer.replace(/\*\*/g, '');
    answer = answer.replace(/\*/g, '');
    answer = answer.replace(/\n\n/g, ' ');
    answer = answer.replace(/\n/g, ' ');
    answer = answer.replace(/\s+/g, ' ').trim();
    
    return { answer };
    
  } catch (error) {
    console.error("Polo AI Error:", error.message);
    
    // Fallback response with memory
    return { answer: getFallbackResponseWithMemory(question, history) };
  }
}

function getFallbackResponseWithMemory(question, history) {
  const lowerQuestion = question.toLowerCase();
  
  // Check if this is a follow-up question
  const lastQuestion = history.length > 0 ? history[history.length - 2]?.content?.toLowerCase() : "";
  
  // If asking "about it" and previous topic was love
  if ((lowerQuestion.includes("about it") || lowerQuestion.includes("tell me more")) && lastQuestion.includes("love")) {
    return "Tulad ng nabanggit kanina, ang pag-ibig ay inilarawan sa 1 Corinto 13. Dagdag pa rito, sa 1 Juan 4:19 sinasabi, \"Tayo ay umiibig sapagkat tayo ay minahal muna ng Diyos.\" Ang pag-ibig ay hindi lamang ating ginagawa—ito ay tugon sa pag-ibig na una nang ipinakita ng Diyos sa atin. Kapag nauunawaan natin kung gaano tayo kamahal ng Diyos, mas madali nating maipapakita ang pag-ibig sa iba. May iba ka pa bang gustong malaman tungkol sa pag-ibig?";
  }
  
  // If asking for more verses after a topic
  if (lowerQuestion.includes("another verse") || lowerQuestion.includes("more verse")) {
    return "Narito ang isa pang talata na makatutulong sa iyo: \"Ang pag-ibig ay matiyaga at magandang-loob. Hindi ito nauinggit, hindi nagyayabang, hindi mapagmataas\" (1 Corinto 13:4). Ang Salita ng Diyos ay puno ng karunungan. Kung may partikular kang paksa na nais pag-aralan, maaari mo akong tanungin nang direkta.";
  }
  
  // Malungkot ako / I'm lonely / sad (with follow-up awareness)
  if ((lowerQuestion.includes("malungkot") || lowerQuestion.includes("lonely") || lowerQuestion.includes("sad")) && 
      history.some(m => m.content.toLowerCase().includes("malungkot") || m.content.toLowerCase().includes("lonely"))) {
    return "Nabanggit mo kanina na nalulungkot ka. Gusto kong ipaalala sa iyo ang Salmo 34:18: \"Malapit ang Panginoon sa mga may bagbag na puso, at inililigtas ang mga may pusong sawi.\" Hindi ka nag-iisa sa iyong pinagdadaanan. Ang Diyos ay mas malapit kaysa sa iyong iniisip. Gusto mo bang manalangin tayo, o gusto mo pang magbahagi ng iyong nararamdaman? Nandito ako para makinig.";
  }
  
  // First time asking about loneliness
  if (lowerQuestion.includes("malungkot") || lowerQuestion.includes("lonely") || lowerQuestion.includes("sad")) {
    return "Kaibigan, naiintindihan ko na malungkot ka ngayon, at gusto kong malaman mo na hindi ka nag-iisa sa damdaming iyon. Sa Biblia, sinasabi sa Salmo 147:3, \"Pinagagaling ng Panginoon ang mga nanghihina ang puso, at dinudugtungan ang kanilang mga sugatang damdamin.\" Ang Diyos ay nandiyan para paginhawahin ka at gabayan ka sa mga sandaling malungkot ka. Gusto mo ba na pag-usapan natin nang mas malalim ang dahilan ng iyong kalungkutan, o gusto mo bang marinig pa ang iba pang mga talata na makapagbibigay ng lakas at pag-asa sa iyong puso?";
  }
  
  // David and Goliath
  if (lowerQuestion.includes("david") && lowerQuestion.includes("goliath")) {
    return "Ang kwento ni David at Goliath ay matatagpuan sa 1 Samuel 17. Si David ay isang batang pastol na may matibay na pananampalataya sa Diyos. Hinarap niya ang higanteng si Goliath hindi gamit ang espada at sibat, kundi gamit ang kanyang tirador at limang makinis na bato. Sinabi ni David kay Goliath: \"Lumalaban ka sa akin gamit ang espada at sibat, ngunit ako ay lumalaban sa iyo sa pangalan ng Panginoong Makapangyarihan sa lahat\" (1 Samuel 17:45). Pinatay ni David si Goliath sa isang batong tinamaan sa noo. Ang aral nito: Hindi tinitignan ng Diyos ang ating laki o lakas—tinitingnan Niya ang ating pananampalataya. Anumang higante ang iyong kinakaharap ngayon, tandaan mo na kasama mo ang Diyos.";
  }
  
  // John 3:16
  if (lowerQuestion.includes("john 3:16")) {
    return "Ang Juan 3:16 ay isa sa pinakamamahal na talata sa Biblia: \"Sapagkat gayon na lamang ang pag-ibig ng Diyos sa sangkatauhan, kaya't ibinigay niya ang kanyang bugtong na Anak, upang ang sinumang sumampalataya sa kanya ay hindi mapahamak kundi magkaroon ng buhay na walang hanggan.\" Ipinapakita ng talatang ito ang puso ng Ebanghelyo—ang pag-ibig ng Diyos ay napakalawak, handa Siyang magbigay ng Kanyang Anak para sa atin, at ang sinumang sumasampalataya ay tatanggap ng buhay na walang hanggan. Ito ang magandang balita na kahit sino ka man, mahal ka ng Diyos at inaanyayahan ka sa isang relasyon sa Kanya.";
  }
  
  // Love
  if (lowerQuestion.includes("love") || lowerQuestion.includes("pag-ibig")) {
    return "Ang Biblia ay maraming sinasabi tungkol sa pag-ibig. Sa 1 Corinto 13:4-7, inilalarawan nito ang pag-ibig: \"Ang pag-ibig ay matiyaga at magandang-loob. Hindi ito nauinggit, hindi nagyayabang, hindi mapagmataas. Hindi ito bastos, hindi makasarili, hindi madaling magalit, at hindi nagtatanim ng sama ng loob. Hindi natutuwa ang pag-ibig sa masama kundi sa katotohanan. Ang pag-ibig ay laging nagtatanggol, laging nagtitiwala, laging umaasa, laging nagtitiyaga.\" At sa 1 Juan 4:8, sinasabi na \"Ang Diyos ay pag-ibig.\" Ang pag-ibig ay hindi lamang damdamin—ito ay pagkilos, pagpili, at higit sa lahat, ito ang katangian ng Diyos mismo.";
  }
  
  // Default response with memory awareness
  if (history.length > 0) {
    return "Salamat sa iyong katanungan. Batay sa ating nakaraang usapan, gusto mo bang pag-usapan pa natin ang tungkol sa paksang iyon? O may bago kang nais itanong tungkol sa Biblia? Ang Salita ng Diyos ay puno ng karunungan, at handa akong tumulong sa iyong pag-aaral.";
  }
  
  return "Salamat sa iyong tanong. Ang Biblia ay may karunungan para sa bawat aspeto ng buhay. Upang mabigyan kita ng pinaka-angkop na sagot, maaari kang magtanong tungkol sa isang partikular na talata (gaya ng 'Juan 3:16'), isang tema sa Biblia (gaya ng 'pag-ibig' o 'pananampalataya'), o isang kuwento sa Biblia (gaya ng 'David at Goliath'). Ano ang nais mong malaman tungkol sa Salita ng Diyos?";
}
