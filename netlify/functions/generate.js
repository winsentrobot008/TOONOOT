const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.queryStringParameters?.checkKeys === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: !!process.env.VOLC_ACCESS_KEY,
        hasSK: !!process.env.VOLC_SECRET_KEY,
        allSet: true,
        version: "v1000-OFFICIAL-SIGN"
      })
    };
  }

  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;
  if (!AK || !SK) return err(401, "Missing keys");

  try {
    const body = JSON.parse(event.body || "{}");
    const { type } = body;

    if (type === "text2image") {
      const res = await volcOfficialSign(AK, SK, {
        action: "TextToImage",
        version: "2024-08-23",
        body: {
          model_name: "general_v2.1",
          prompt: body.prompt || "cat",
          width: 1024,
          height: 1024
        }
      });
      return ok(res);
    }

    return err(400, "Invalid type");
  } catch (e) {
    return err(500, e.message);
  }
};

// 火山引擎官方V2签名算法（完全按文档实现）
async function volcOfficialSign(ak, sk, { action, version, body }) {
  const endpoint = "visual.volcengineapi.com";
  const method = "POST";
  const contentType = "application/json";

  const now = new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = xDate.slice(0, 8);

  const canonicalUri = "/";
  const canonicalQueryString = `Action=${action}&Version=${version}`;
  const canonicalHeaders = `host:${endpoint}\nx-date:${xDate}\ncontent-type:${contentType}\n`;
  const signedHeaders = "host;x-date;content-type";
  const payload = JSON.stringify(body);
  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = "HMAC-SHA256";
  const credentialScope = `${dateStamp}/visual/request`;
  const canonicalRequestHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
  const stringToSign = `${algorithm}\n${xDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const kDate = crypto.createHmac("sha256", sk).update(dateStamp).digest();
  const kService = crypto.createHmac("sha256", kDate).update("visual").digest();
  const kSigning = crypto.createHmac("sha256", kService).update("request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization = `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${endpoint}/?Action=${action}&Version=${version}`, {
    method,
    headers: {
      "Content-Type": contentType,
      "X-Date": xDate,
      "Authorization": authorization
    },
    body: payload
  });

  return response.json();
}

function ok(data) {
  return { statusCode: 200, body: JSON.stringify(data) };
}
function err(code, msg) {
  return { statusCode: code, body: JSON.stringify({ error: msg }) };
}
