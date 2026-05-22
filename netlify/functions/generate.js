const crypto = require('crypto');

exports.handler = async (event, context) => {
  // 1. 密钥检查（你刚才测试成功的接口）
  if (event.queryStringParameters?.checkKeys === '1') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: !!process.env.VOLC_ACCESS_KEY,
        hasSK: !!process.env.VOLC_SECRET_KEY,
        allSet: !!process.env.VOLC_ACCESS_KEY && !!process.env.VOLC_SECRET_KEY,
        version: "v4.0.0-fixed"
      })
    };
  }

  // 2. 读取密钥
  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;

  if (!AK || !SK) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "缺失密钥" })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { type } = body;

    // ------------------------------
    // 【1】文生图（豆包智能绘图）
    // ------------------------------
    if (type === "text2image") {
      const { prompt = "a cute cat", model = "general_v2.1" } = body;
      const res = await volcRequest(AK, SK, {
        service: "ai",
        endpoint: "https://visual.volcengineapi.com",
        version: "2024-08-23",
        action: "TextToImage",
        bodyData: {
          model_name: model,
          prompt: prompt,
          width: 1024,
          height: 1024
        }
      });
      return success(res);
    }

    // ------------------------------
    // 【2】图片特效视频（34种模板）
    // ------------------------------
    if (type === "video") {
      const { imgUrl, templateId = "Santa_Claus_embrace_720p" } = body;
      const res = await volcRequest(AK, SK, {
        service: "ai",
        endpoint: "https://visual.volcengineapi.com",
        version: "2024-08-23",
        action: "GenerateVideoEffect",
        bodyData: {
          template_id: templateId,
          image_url: imgUrl
        }
      });
      return success(res);
    }

    return fail("请指定 type: text2image 或 video");
  } catch (e) {
    return fail("参数错误: " + e.message);
  }
};

// ------------------------------
// 火山引擎官方签名（修复版）
// ------------------------------
async function volcRequest(ak, sk, { service, endpoint, version, action, bodyData }) {
  const url = new URL(endpoint);
  const host = url.host;
  const date = new Date().toUTCString();
  const contentType = "application/json";

  const canonicalHeaders = `host: ${host}\ndate: ${date}\ncontent-type: ${contentType}`;
  const signedHeaders = "host;date;content-type";

  const payload = JSON.stringify(bodyData);
  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");

  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `HMAC-SHA256\n${date}\n${canonicalRequest}`;

  const signature = crypto.createHmac("sha256", sk).update(stringToSign).digest("hex");

  const authorization = `HMAC-SHA256 Credential=${ak},SignedHeaders=${signedHeaders},Signature=${signature}`;

  const response = await fetch(`${endpoint}?Action=${action}&Version=${version}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Date": date,
      "Authorization": authorization
    },
    body: payload
  });

  return await response.json();
}

function success(data) {
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

function fail(msg) {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: msg })
  };
}