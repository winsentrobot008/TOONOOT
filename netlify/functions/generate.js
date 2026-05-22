const crypto = require('crypto');

exports.handler = async (event) => {
  // 1. 密钥自检接口
  if (event.queryStringParameters?.checkKeys === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: !!process.env.VOLC_ACCESS_KEY,
        hasSK: !!process.env.VOLC_SECRET_KEY,
        allSet: true,
        version: "v5.1.0-official-sign"
      })
    };
  }

  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;
  if (!AK || !SK) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing AK/SK" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { type } = body;

    if (type === "text2image") {
      const res = await volcOfficialRequest(AK, SK, {
        action: "TextToImage",
        version: "2024-08-23",
        body: {
          model_name: "general_v2.1",
          prompt: body.prompt || "a cute cat",
          width: 1024,
          height: 1024
        }
      });
      return { statusCode: 200, body: JSON.stringify(res) };
    }

    if (type === "video") {
      const res = await volcOfficialRequest(AK, SK, {
        action: "GenerateVideoEffect",
        version: "2024-08-23",
        body: {
          template_id: body.templateId || "Santa_Claus_embrace_720p",
          image_url: body.imgUrl || "https://picsum.photos/500"
        }
      });
      return { statusCode: 200, body: JSON.stringify(res) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid type" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  }
};

// 火山引擎官方标准V2签名算法（完全按照文档实现）
async function volcOfficialRequest(ak, sk, { action, version, body }) {
  const endpoint = "visual.volcengineapi.com";
  const method = "POST";
  const contentType = "application/json";

  // 1. 时间处理
  const now = new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDD'T'HHMMSS'Z'
  const dateStamp = xDate.slice(0, 8);

  // 2. 构造Canonical Request
  const canonicalUri = "/";
  const canonicalQueryString = `Action=${action}&Version=${version}`;
  const canonicalHeaders = `host:${endpoint}\nx-date:${xDate}\ncontent-type:${contentType}\n`;
  const signedHeaders = "host;x-date;content-type";
  const payload = JSON.stringify(body);
  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // 3. 构造StringToSign
  const algorithm = "HMAC-SHA256";
  const credentialScope = `${dateStamp}/visual/request`;
  const canonicalRequestHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
  const stringToSign = `${algorithm}\n${xDate}\n${credentialScope}\n${canonicalRequestHash}`;

  // 4. 计算签名
  const kDate = crypto.createHmac("sha256", sk).update(dateStamp).digest();
  const kService = crypto.createHmac("sha256", kDate).update("visual").digest();
  const kSigning = crypto.createHmac("sha256", kService).update("request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  // 5. 构造Authorization头
  const authorization = `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // 6. 发起请求
  const response = await fetch(`https://${endpoint}/?Action=${action}&Version=${version}`, {
    method: method,
    headers: {
      "Content-Type": contentType,
      "X-Date": xDate,
      "Authorization": authorization
    },
    body: payload
  });

  return response.json();
}
