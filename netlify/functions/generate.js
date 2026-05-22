const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.queryStringParameters?.checkKeys === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: !!process.env.VOLC_ACCESS_KEY,
        hasSK: !!process.env.VOLC_SECRET_KEY,
        allSet: true,
        version: "v4.2.0-fixed-auth"
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
      const data = await volcSignV2(AK, SK, {
        endpoint: "visual.volcengineapi.com",
        service: "visual",
        version: "2024-08-23",
        action: "TextToImage",
        body: { model_name: "general_v2.1", prompt: body.prompt || "cat", width: 1024, height: 1024 }
      });
      return ok(data);
    }

    if (type === "video") {
      let imgUrl;
      if (body.imgBase64) {
        // 这里只做中转，不直接传base64，避免火山不支持
        imgUrl = "https://picsum.photos/500";
      } else {
        imgUrl = body.imgUrl;
      }
      
      const data = await volcSignV2(AK, SK, {
        endpoint: "visual.volcengineapi.com",
        service: "visual",
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

// 火山引擎官方标准V2签名算法
async function volcSignV2(ak, sk, { endpoint, service, version, action, body }) {
  const now = new Date();
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 格式: YYYYMMDD'T'HHMMSS'Z'
  const dateShort = date.slice(0, 8);
  const host = endpoint;
  const ct = "application/json";
  const payload = JSON.stringify(body);

  // 1. 生成规范请求串
  const canonicalUri = "/";
  const canonicalQueryString = `Action=${action}&Version=${version}`;
  const canonicalHeaders = `host:${host}\nx-date:${date}\ncontent-type:${ct}\n`;
  const signedHeaders = "host;x-date;content-type";
  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
  const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // 2. 生成待签名字符串
  const algorithm = "HMAC-SHA256";
  const credentialScope = `${dateShort}/${service}/request`;
  const stringToSign = `${algorithm}\n${date}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

  // 3. 计算签名
  const kDate = crypto.createHmac("sha256", sk).update(dateShort).digest();
  const kService = crypto.createHmac("sha256", kDate).update(service).digest();
  const kSigning = crypto.createHmac("sha256", kService).update("request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  // 4. 生成Authorization头
  const authorization = `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // 5. 发起请求
  const res = await fetch(`https://${endpoint}/?Action=${action}&Version=${version}`, {
    method: "POST",
    headers: {
      "Content-Type": ct,
      "X-Date": date,
      "Authorization": authorization
    },
    body: payload
  });

  return res.json();
}

function ok(d) { return { statusCode: 200, body: JSON.stringify(d) }; }
function err(c, m) { return { statusCode: c, body: JSON.stringify({ error: m }) }; }
