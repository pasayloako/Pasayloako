const axios = require('axios');
const { URLSearchParams } = require('url');

const meta = {
    name: "Magic Studio",
    version: "1.0.0",
    author: "rapido",
    category: "image generation",
    method: "GET",
    path: "/magic?prompt=cat"
};

async function onStart({ res, req }) {
    const { prompt } = req.query;
    if (!prompt) return res.status(400).json({ error: "Prompt parameter required" });

    try {
        const formData = new URLSearchParams({
            prompt: prompt,
            output_format: "bytes",
            user_profile_id: "null",
            anonymous_user_id: "a584e30d-1996-4598-909f-70c7ac715dc1",
            request_timestamp: Date.now(),
            user_is_subscribed: "false",
            client_id: "pSgX7WgjukXCBoYwDM8G8GLnRRkvAoJlqa5eAVvj95o"
        });

        const response = await axios.post(
            "https://ai-api.magicstudio.com/api/ai-art-generator",
            formData.toString(),
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Origin": "https://magicstudio.com",
                    "Referer": "https://magicstudio.com/ai-art-generator/",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                responseType: "arraybuffer"
            }
        );

        res.setHeader("Content-Type", "image/png");
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: "Art generation failed" });
    }
}

module.exports = { meta, onStart };
