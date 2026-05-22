const crypto = require('crypto');

// 读取你Netlify已配置的环境变量（完全不动！）
const VOLC_AK = process.env.VOLC_ACCESS_KEY;
const VOLC_SK = process.env.VOLC_SECRET_KEY;
const REGION = "cn-beijing";
const SERVICE = "visual";
const API_VERSION = "2024-08-23";
const VERSION = "v4.1-VOLC-READY";

// 标准火山V4签名算法（官方兼容）
function signVolcRequest(ak, sk, action, body) {
  const algorithm = "HMAC-SHA256";
  const now = new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = xDate.slice(0,8);

  const host = `${SERVICE}.volcengineapi.com`;
  const query = { Action: action, Version: API_VERSION };
  const path = "/";
  const payload = JSON.stringify(body);
  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-date:${xDate}\n`;
  const signedHeaders = "content-type;host;x-date";
  const canonicalRequest = `POST\n${path}\n${new URLSearchParams(query)}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/request`;
  const canonicalRequestHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
  const stringToSign = `${algorithm}\n${xDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const kDate = crypto.createHmac("sha256", sk).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(REGION).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(SERVICE).digest();
  const kSigning = crypto.createHmac("sha256", kService).update("request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return {
    "Authorization": `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "X-Date": xDate,
    "Content-Type": "application/json",
    "Host": host
  };
}

// 提交火山视频生成任务
async function submitVideoTask(prompt) {
  const action = "SubmitTextToVideoTask";
  const body = {
    model_name: "video_generation_v1",
    prompt: prompt,
    width: 1280,
    height: 720,
    duration: 5
  };
  const headers = signVolcRequest(VOLC_AK, VOLC_SK, action, body);
  const url = `https://${SERVICE}.volcengineapi.com/?Action=${action}&Version=${API_VERSION}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  });
  return await response.json();
}

// 查询火山视频生成任务结果
async function queryVideoTaskResult(taskId) {
  const action = "GetTextToVideoTaskResult";
  const body = { task_id: taskId };
  const headers = signVolcRequest(VOLC_AK, VOLC_SK, action, body);
  const url = `https://${SERVICE}.volcengineapi.com/?Action=${action}&Version=${API_VERSION}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  });
  return await response.json();
}

exports.handler = async (event) => {
  // 版本检测接口
  if (event.queryStringParameters?.check === "1") {
    return {
      statusCode: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        version: VERSION,
        status: "ready"
      })
    };
  }

  try {
    const reqBody = JSON.parse(event.body || "{}");
    const { action, prompt, task_id } = reqBody;

    // 提交任务
    if (action === "submit") {
      const res = await submitVideoTask(prompt);
      if (res.ResponseMetadata?.Error) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: res.ResponseMetadata.Error.Message })
        };
      }
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          task_id: res.Result.TaskId,
          status: "running"
        })
      };
    }

    // 查询任务结果（直接调用火山API，不依赖本地存储）
    if (action === "query") {
      const res = await queryVideoTaskResult(task_id);
      if (res.ResponseMetadata?.Error) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            status: "Fail",
            status_text: "火山API查询失败",
            error: res.ResponseMetadata.Error.Message
          })
        };
      }
      const result = res.Result;
      if (result.Status === "Success") {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            status: "Success",
            status_text: "生成完成",
            result: {
              video_url: result.VideoUrl,
              cover_url: result.CoverUrl
            }
          })
        };
      } else if (result.Status === "Fail") {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            status: "Fail",
            status_text: "火山API生成失败",
            error: result.FailReason
          })
        };
      } else {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            status: "running",
            status_text: `火山API处理中，进度：${result.Progress || 0}%`
          })
        };
      }
    }

    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "无效请求" })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: e.message,
        version: VERSION
      })
    };
  }
};
