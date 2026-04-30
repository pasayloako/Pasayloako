const axios = require('axios');

// --- KONFIGURASI OTOMATIS ---
let config = {
    cookie: null,
    snlm0e: null,
    fsid: null,
    bl: "boq_assistant-bard-web-server_20260208.13_p0",
    firebase_url: "https://puru-tools-default-rtdb.firebaseio.com/sessions/google.json",

    // Memory context
    conversation_id: "",
    response_id: "",
    choice_id: ""
};

async function syncFirebase(method = 'GET', data = null) {
    try {
        if (method === 'GET') {
            const res = await axios.get(config.firebase_url);
            if (res.data) {
                config.cookie = res.data.cookie_string || res.data.cookie;
                config.snlm0e = res.data.snlm0e;
                config.fsid = res.data.fsid;
                config.conversation_id = res.data.conversation_id || "";
                config.response_id = res.data.response_id || "";
                config.choice_id = res.data.choice_id || "";
            }
        } else {
            await axios.patch(config.firebase_url, {
                ...data,
                last_updated: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error('Firebase Error:', err.message);
    }
}

function parseGeminiResponse(rawData) {
    try {
        const lines = rawData.split("\n");
        let result = { text: "", convId: "", respId: "", choiceId: "" };
        for (let line of lines) {
            line = line.trim();
            if (!line.startsWith("[[")) continue;
            try {
                const parsed = JSON.parse(line);
                for (let part of parsed) {
                    if (part[0] === "wrb.fr") {
                        const innerObj = JSON.parse(part[2]);
                        if (innerObj?.[4]) {
                            for (let c of innerObj[4]) {
                                if (c?.[1]?.[0]) result.text = c[1][0];
                            }
                        }
                        if (innerObj?.[1]) {
                            result.convId = innerObj[1][0];
                            result.respId = innerObj[1][1];
                        }
                        if (innerObj?.[4]?.[0]?.[0]) {
                            result.choiceId = innerObj[4][0][0];
                        }
                    }
                }
            } catch (e) { continue; }
        }
        return result;
    } catch (err) {
        return { text: "" };
    }
}

async function askGemini(prompt, retry = true) {
    if (retry) await syncFirebase('GET');

    const url = `https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate`;
    const reqData = [
        null, 
        JSON.stringify([
            [prompt, 0, null, null, null, null, 0], 
            ["id"], 
            [config.conversation_id, config.response_id, config.choice_id, null, null, null, null, null, null, ""], 
            ""
        ])
    ];

    const params = new URLSearchParams({
        'bl': config.bl,
        '_reqid': Math.floor(Math.random() * 900000),
        'rt': 'c',
        'f.sid': config.fsid
    });

    try {
        const response = await axios.post(`${url}?${params.toString()}`, 
            `f.req=${encodeURIComponent(JSON.stringify(reqData))}&at=${encodeURIComponent(config.snlm0e)}&`, 
            {
                headers: {
                    'Cookie': config.cookie,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
                    'Referer': 'https://gemini.google.com/',
                },
                timeout: 30000
            }
        );

        const parsed = parseGeminiResponse(response.data);

        if (!parsed.text) {
            throw new Error("EmptyResponse");
        }

        let currentCookie = config.cookie;
        if (response.headers['set-cookie']) currentCookie = response.headers['set-cookie'].join('; ');

        await syncFirebase('PATCH', {
            cookie_string: currentCookie,
            conversation_id: parsed.convId,
            response_id: parsed.respId,
            choice_id: parsed.choiceId
        });

        return parsed.text;

    } catch (error) {
        if (retry) {
            config.conversation_id = "";
            config.response_id = "";
            config.choice_id = "";
            await new Promise(r => setTimeout(r, 2000));
            return askGemini(prompt, false); 
        } else {
            throw new Error("Failed after session reset. Check cookie/token.");
        }
    }
}

// ============= YOUR API STRUCTURE =============

const meta = {
    name: "Gemini AI",
    description: "Google Gemini AI assistant with conversation memory",
    author: "Jaybohol",
    version: "1.0.0",
    category: "ai",
    method: "GET",
    path: "/gemini?prompt=&uid="
};

async function onStart({ req, res }) {
    const { prompt, uid = "default" } = req.query;

    if (!prompt) {
        return res.status(400).json({
            status: false,
            author: "Jaybohol",
            error: "Missing required parameter: prompt",
            usage: "/api/ai/gemini?prompt=Hello&uid=user123"
        });
    }

    try {
        console.log(`🤖 Gemini Request [${uid}]: "${prompt.substring(0, 50)}..."`);
        
        const reply = await askGemini(prompt);
        
        res.json({
            status: true,
            author: "Jaybohol",
            result: {
                prompt: prompt,
                response: reply,
                uid: uid
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        
        res.status(500).json({
            status: false,
            author: "Jaybohol",
            error: error.message,
            suggestion: "Try again later or check your internet connection"
        });
    }
}

module.exports = { meta, onStart };
