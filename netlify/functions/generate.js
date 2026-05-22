const crypto = require('crypto');

// 火山剧创核心配置
const VOLC_AK = process.env.VOLC_ACCESS_KEY;
const VOLC_SK = process.env.VOLC_SECRET_KEY;
const REGION = "cn-beijing";
const API_VERSION = "2026-05-01"; // 剧创API专用版本

// 剧创API签名（与基础API有差异）
function signDramaRequest(ak, sk, action, body) {
  // 签名逻辑与基础API类似，但服务名改为"drama"
  const algorithm = "HMAC-SHA256";
  const now = new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = xDate.slice(0, 8);

  const host = "drama.volcengineapi.com";
  const query = { Action: action, Version: API_VERSION };
  const path = "/";
  const payload = JSON.stringify(body);
  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-date:${xDate}\n`;
  const signedHeaders = "content-type;host;x-date";
  const canonicalRequest = `POST\n${path}\n${new URLSearchParams(query)}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${REGION}/drama/request`;
  const canonicalRequestHash = crypto.createHmac("sha256", canonicalRequest).digest("hex");
  const stringToSign = `${algorithm}\n${xDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const kDate = crypto.createHmac("sha256", sk).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(REGION).digest();
  const kService = crypto.createHmac("sha256", kRegion).update("drama").digest();
  const kSigning = crypto.createHmac("sha256", kService).update("request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return {
    "Authorization": `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "X-Date": xDate,
    "Content-Type": "application/json",
    "Host": host
  };
}

// 剧创分镜生成（核心功能）
async function generateStoryboard(script) {
  console.log("=== 火山剧创分镜生成 ===");
  const action = "GenerateStoryboard";
  const body = {
    script: script, // 完整剧本文本
    style: "short_video", // 竖屏短剧风格
    shot_count: 3, // 生成3个镜头
    resolution: "720P"
  };
  const headers = signDramaRequest(VOLC_AK, VOLC_SK, action, body);
  const url = `https://drama.volcengineapi.com/?Action=${action}&Version=${API_VERSION}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  console.log("分镜生成响应:", data);
  return data;
}

// 多镜头视频合成
async function generateDramaVideo(storyboardId) {
  const action = "GenerateDramaVideo";
  const body = {
    storyboard_id: storyboardId,
    model: "seedance-2.0-pro"
  };
  const headers = signDramaRequest(VOLC_AK, VOLC_SK, action, body);
  const url = `https://drama.volcengineapi.com/?Action=${action}&Version=${API_VERSION}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  });
  
  return await response.json();
}

exports.handler = async (event) => {
  // 保持CORS配置不变...
  
  try {
    const reqBody = JSON.parse(event.body || "{}");
    const { action, script } = reqBody;

    if (action === "generate_drama") {
      // 剧创全流程：剧本→分镜→视频
      const storyboardRes = await generateStoryboard(script);
      if (storyboardRes.ResponseMetadata?.Error) {
        throw new Error(`分镜生成失败: ${storyboardRes.ResponseMetadata.Error.Message}`);
      }
      const videoRes = await generateDramaVideo(storyboardRes.Result.StoryboardId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          task_id: videoRes.Result.TaskId,
          storyboard_id: storyboardRes.Result.StoryboardId,
          status: "running"
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "无效请求" }) };
  } catch (err) {
    console.error("剧创API错误:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
