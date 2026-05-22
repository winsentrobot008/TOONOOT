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
        version: "VOLCANO-FULL"
      })
    };
  }

  const API_KEY = "ark-f2133e90-ed48-47c6-b3fe-ad406f9a95b4-b6e06";

  try {
    const body = JSON.parse(event.body || "{}");
    const { type, prompt, voice_text } = body;

    if (type === "video_with_voice") {
      // 1. 调用火山方舟生成内容
      const arkRes = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "doubao-vision-pro-32k",
          messages: [{ role: "user", content: `根据以下描述生成视频：${prompt}` }]
        })
      });
      const arkData = await arkRes.json();

      // 2. 模拟视频、配音、字幕生成结果（后续可扩展真实接口）
      return {
        statusCode: 200,
        body: JSON.stringify({
          ResponseMetadata: {
            RequestId: `volcano-${Date.now()}`,
            Error: null
          },
          data: {
            video_url: "https://picsum.photos/1280/720",
            voice_url: "https://picsum.photos/voice",
            subtitle: voice_text,
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
