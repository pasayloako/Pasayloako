const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const meta = {
  name: 'fotor',
  path: '/fotor?prompt=',
  category: 'image generation'
};

class FotorAPI {
  constructor() {
    this.baseURL = "https://www.fotor.com/api/create/v1/generate";
    this.statusURL = "https://www.fotor.com/api/create/v3/get_picture_url";
    this.distinctId = uuidv4();
  }
  
  genCookie() {
    const cookieData = {
      distinct_id: this.distinctId,
      props: {
        $latest_traffic_source_type: "直接流量",
        $latest_search_keyword: "未取得值_直接打开"
      },
      $device_id: this.distinctId
    };
    return `sensorsdata2015jssdkcross=${encodeURIComponent(JSON.stringify(cookieData))}`;
  }
  
  getHeaders() {
    return {
      accept: "application/json",
      "content-type": "application/json",
      cookie: this.genCookie(),
      origin: "https://www.fotor.com",
      referer: "https://www.fotor.com/images/create",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "x-app-id": "app-fotor-web"
    };
  }
  
  async genImg(prompt) {
    const payload = {
      content: prompt,
      upscale: true,
      pictureNums: 1
    };
    
    const { data } = await axios.post(this.baseURL, payload, {
      headers: this.getHeaders()
    });
    
    if (!data.status || !data.data) throw new Error("Invalid response from API");
    
    const taskIds = data.data.map(item => item.taskId);
    return await this.pollForResults(taskIds);
  }
  
  async pollForResults(taskIds) {
    const maxTime = Date.now() + 60000;
    while (Date.now() < maxTime) {
      const { data } = await axios.get(`${this.statusURL}?taskIds=${taskIds.join(",")}`, {
        headers: this.getHeaders()
      });
      
      const completedTasks = data.data.filter(item => item.status === 1);
      if (completedTasks.length === taskIds.length) {
        return completedTasks[0].pictureUrl;
      }
      
      await new Promise(res => setTimeout(res, 3000));
    }
    throw new Error("Timed out");
  }
}

async function onStart({ req, res }) {
  const { prompt } = req.query;
  
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });
  
  try {
    const fotor = new FotorAPI();
    const imageUrl = await fotor.genImg(prompt);
    
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(imageResponse.data);
  } catch (error) {
    console.error('Fotor API Error:', error.message);
    res.status(500).json({ error: 'Image generation failed' });
  }
}

module.exports = { meta, onStart };
