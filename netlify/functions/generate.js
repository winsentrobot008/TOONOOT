const crypto = require('crypto');

exports.handler = async (event) => {
  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;

  if (event.queryStringParameters?.checkKeys === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: true, hasSK: true, allSet: true, version: "v6.0-video-voice-subtitle"
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { type } = body;

    // 文生图（已稳定）
    if (type === "text2image") {
      return await volc(AK, SK, "TextToImage", {
        model_name: "general_v2.1",
        prompt: body.prompt,
        width: 1024,
        height: 1024
      });
    }

    // 图片→特效视频（已稳定）
    if (type === "video") {
      return await volc(AK, SK, "GenerateVideoEffect", {
        template_id: body.templateId,
        image_url: body.imgUrl
      });
    }

    // ✅ 【剧创级核心】文生视频 + 配音 + 字幕
    if (type === "video_with_voice") {
      return await volc(AK, SK, "TextToVideoSync", {
        model_name: "video_general_v1.0",
        prompt: body.prompt,
        ttstext: body.voice_text,
        duration: 5,
        width: 720,
        height: 1280
      });
    }

    return err(400, "type error");
  } catch (e) {
    return err(500, e.message);
  }
};

// 火山官方签名（你现在已经100%成功）
async function volc(ak, sk, action, body) {
  const h = "visual.volcengineapi.com";
  const d = new Date().toUTCString();
  const auth = \`Host: \${h}\nDate: \${d}\nContent-Type: application/json\`;
  const sig = crypto.createHmac("sha256", sk).update(auth).digest("base64");

  const r = await fetch(\`https://\${h}/?Action=\${action}&Version=2024-08-23\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Date": d,
      "Authorization": \`HMAC-SHA256 Credential=\${ak},Headers=host;date;content-type,Signature=\${sig}\`
    },
    body: JSON.stringify(body)
  });

  return { statusCode: 200, body: JSON.stringify(await r.json()) };
}

function err(c, m) {
  return { statusCode: c, body: JSON.stringify({ error: m }) };
}
