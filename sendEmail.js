const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// Bitable Configuration
const baseId = "MG4DbQdS2akEMUsqMiilx0ikgac";
const tableId = "tblnn7xqfGzRNljp";
const apiUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${baseId}/tables/${tableId}/records`;
let accessToken = "u-fgbsUcIXV2rV7XzW08dZE4g41ipe01X3p00wlk6025kh";

// OpenAI Configuration
const openaiApiKey = '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';
const openaiEndpoint = 'https://api.openai.com/v1/chat/completions';

const openai = new OpenAI({
  apiKey: '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'
});

// Refresh Bitable Access Token
// async function refreshAccessToken() {
//   try {
//     const response = await axios.post("BITABLE_AUTH_ENDPOINT", {});
//     accessToken = response.data.newAccessToken;

//     return accessToken;
//   } catch (error) {
//     console.error("Error refreshing token:", error.message);
//     throw error;
//   }
// }

// Get Valid Bitable Access Token
// async function getValidAccessToken() {
//   try {
//     const validAccessToken = await refreshAccessToken();
//     return validAccessToken;
//   } catch (error) {
//     if (error.response && error.response.status === 401) {
//       // Token expired, refresh and retry
//       await refreshAccessToken();
//       return accessToken;
//     } else {
//       console.error("Error checking token validity:", error.message);
//       throw error;
//     }
//   }
// }

// Fetch Data from Bitable
async function fetchDataFromBitable() {
  try {
    // const validAccessToken = await getValidAccessToken();

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const items = response.data?.data?.items;

    if (items && items.length > 0) {
      const customerInfo = items[items.length - 1]?.fields;
      const emailContent = await generateEmailContent(customerInfo);

      if (emailContent) {
        await sendEmail(customerInfo, emailContent);
      }
    } else {
      console.log('Không có thông tin khách hàng.');
    }
  } catch (error) {
    console.error('Error fetching customer information from Bitable:', error);
  }
}

// Generate Email Content using OpenAI
async function generateEmailContent(customerInfo) {
  const prompt = `Khách hàng có tên là ${customerInfo.name}, email ${customerInfo.email}, và số điện thoại ${customerInfo.phone}. Hãy viết một email cảm ơn cho họ.`;

  try {
    const chatGPTResponse = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    console.log(chatGPTResponse);
    const emailContent = chatGPTResponse.choices[0]["message"];

    if (!emailContent) {
      console.error("Empty response from OpenAI API.");
    }

    return emailContent;
  } catch (error) {
    console.error("Error calling OpenAI API:", error.message);
    console.error(
      "Request data:",
      JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
      })
    );
    return null;
  }
}

// Send Email using Nodemailer
async function sendEmail(customerInfo, emailContent) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: '21521557@gm.uit.edu.vn',
      pass: '1257573400',
    },
  });

  const mailOptions = {
    from: '21521557@gm.uit.edu.vn',
    to: customerInfo.email,
    subject: 'Cảm ơn bạn đã quan tâm!',
    text: emailContent,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Lỗi khi gửi email:', error);
    } else {
      console.log(`Email đã được gửi đến ${customerInfo.email} với nội dung:\n${emailContent}`);
    }
  });
}

// Endpoint to trigger the process
app.post("/send-email", async (req, res) => {
  try {
    await fetchDataFromBitable();
    res
      .status(200)
      .json({ success: true, message: "Data processed successfully." });
  } catch (error) {
    console.error("Error processing data:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
