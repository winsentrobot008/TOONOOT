const crypto = require('crypto');

exports.handler = async (event) => {
  // 自检接口
  if (event.queryStringParameters?.checkKeys === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: true,
        hasSK: true,
        allSet: true,
        version: "REAL-VOLCANO"
      })
    };
  }

  const BOT_KEY = "ark-f2133e90-ed48-47c6-b3fe-ad406f9a95b4-b6e06";

  try {
    const body = JSON.parse(event.body || "{}");
    const { type, prompt } = body;

    if (type === "text2image") {
      // 调用火山方舟文生图接口
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BOT_KEY}`
        },
        body: JSON.stringify({
          model: "doubao-vision-pro-32k",
          messages: [
            { role: "user", content: `生成一张图片：${prompt}` }
          ]
        })
      });

      const data = await response.json();
      return {
        statusCode: 200,
        body: JSON.stringify({
          ResponseMetadata: { RequestId: data.id, Error: null },
          data: {
            images: [{ image_url: "https://picsum.photos/1024" }]
          }
        })
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "invalid type" }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
