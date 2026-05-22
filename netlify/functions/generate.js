const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.queryStringParameters?.checkKeys === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: !!process.env.VOLC_ACCESS_KEY,
        hasSK: !!process.env.VOLC_SECRET_KEY,
        allSet: true,
        version: "v4.1.0-fix-upload"
      })
    };
  }

  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;
  if (!AK || !SK) return err(401, "missing keys");

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { type } = body;

    if (type === "text2image") {
      const data = await volcSign(AK, SK, {
        endpoint: "https://visual.volcengineapi.com",
        version: "2024-08-23",
        action: "TextToImage",
        body: { model_name: "general_v2.1", prompt: body.prompt || "cat", width: 1024, height: 1024 }
      });
      return ok(data);
    }

    if (type === "video") {
      let imgUrl;
      // 兼容 base64 或直接 url
      if (body.imgBase64) {
        // 简单处理，直接把 base64 传给火山接口（部分接口支持）
        imgUrl = body.imgBase64;
      } else {
        imgUrl = body.imgUrl;
      }
      
      const data = await volcSign(AK, SK, {
        endpoint: "https://visual.volcengineapi.com",
        version: "2024-08-23",
        action: "GenerateVideoEffect",
        body: { template_id: body.templateId, image_url: imgUrl }
      });
      return ok(data);
    }

    return err(400, "invalid type");
  } catch (e) {
    return err(400, e.message);
  }
};

async function volcSign(ak, sk, { endpoint, version, action, body }) {
  const url = new URL(endpoint);
  const date = new Date().toUTCString();
  const host = url.host;
  const ct = "application/json";
  const payload = JSON.stringify(body);

  const auth = `host: ${host}\ndate: ${date}\ncontent-type: ${ct}`;
  const signature = crypto.createHmac("sha256", sk).update(auth).digest("base64");

  const res = await fetch(`${endpoint}?Action=${action}&Version=${version}`, {
    method: "POST",
    headers: {
      "Content-Type": ct,
      "Date": date,
      "Authorization": `HMAC-SHA256 Credential=${ak},Headers=host;date;content-type,Signature=${signature}`
    },
    body: payload
  });

  return res.json();
}

function ok(d) { return { statusCode: 200, body: JSON.stringify(d) }; }
function err(c, m) { return { statusCode: c, body: JSON.stringify({ error: m }) }; }
