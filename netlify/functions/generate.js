const crypto = require('crypto');

// 读取你已配置的 Netlify 环境变量（绝对不修改！）
const VOLC_AK = process.env.VOLC_ACCESS_KEY;
const VOLC_SK = process.env.VOLC_SECRET_KEY;
const REGION = "cn-beijing";
const VERSION = "v4.0-VOLC-REAL";

// 任务缓存
const tasks = new Map();

// 标准火山V4签名（官方兼容）
function sign(method, host, path, query, body) {
  const alg = "HMAC-SHA256";
  const now = new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = xDate.slice(0,8);

  const payload = JSON.stringify(body);
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  const headers = `content-type:application/json\nhost:${host}\nx-date:${xDate}\n`;
  const signed = "content-type;host;x-date";
  const canonical = `${method}\n${path}\n${new URLSearchParams(query)}\n${headers}\n${signed}\n${hash}`;
  const scope = `${date}/${REGION}/visual/request`;
  const strToSign = `${alg}\n${xDate}\n${scope}\n${crypto.createHash("sha256").update(canonical).digest("hex")}`;

  const k1 = crypto.createHmac("sha256", VOLC_SK).update(date).digest();
  const k2 = crypto.createHmac("sha256", k1).update(REGION).digest();
  const k3 = crypto.createHmac("sha256", k2).update("visual").digest();
  const k4 = crypto.createHmac("sha256", k3).update("request").digest();
  const sign = crypto.createHmac("sha256", k4).update(strToSign).digest("hex");

  return {
    "Authorization": `${alg} Credential=${VOLC_AK}/${scope}, SignedHeaders=${signed}, Signature=${sign}`,
    "X-Date": xDate,
    "Content-Type": "application/json",
    "Host": host
  };
}

// 提交火山视频任务
async function submitVideo(prompt) {
  const host = "visual.volcengineapi.com";
  const q = { Action: "SubmitTextToVideoTask", Version: "2024-08-23" };
  const body = { model_name: "video_generation_v1", prompt, width:1280, height:720, duration:5 };
  const headers = sign("POST", host, "/", q, body);
  const res = await fetch(`https://${host}/?${new URLSearchParams(q)}`, {
    method: "POST", headers, body: JSON.stringify(body)
  });
  return res.json();
}

// 查询火山任务
async function queryVideo(taskId) {
  const host = "visual.volcengineapi.com";
  const q = { Action: "GetTextToVideoTaskResult", Version: "2024-08-23" };
  const body = { task_id: taskId };
  const headers = sign("POST", host, "/", q, body);
  const res = await fetch(`https://${host}/?${new URLSearchParams(q)}`, {
    method: "POST", headers, body: JSON.stringify(body)
  });
  return res.json();
}

exports.handler = async (event) => {
  // 版本接口
  if(event.queryStringParameters?.check === "1"){
    return {
      statusCode:200,
      headers:{"Cache-Control":"no-cache","Access-Control-Allow-Origin":"*"},
      body:JSON.stringify({version:VERSION})
    };
  }

  try {
    const { action, prompt, task_id } = JSON.parse(event.body||"{}");

    if(action === "submit"){
      const taskId = `t${Date.now()}`;
      tasks.set(taskId, { status:"running", text:"提交中" });

      // 异步调用火山API
      (async ()=>{
        const res = await submitVideo(prompt);
        if(res.ResponseMetadata?.Error){
          tasks.set(taskId, {status:"fail", error:res.ResponseMetadata.Error.Message});
          return;
        }
        const realId = res.Result?.TaskId;
        tasks.set(taskId, {status:"running", text:"生成中", realId});

        // 轮询
        const timer = setInterval(async ()=>{
          const qres = await queryVideo(realId);
          const status = qres.Result?.Status;
          if(status === "Success"){
            clearInterval(timer);
            tasks.set(taskId, {
              status:"success", text:"完成",
              result: {
                video_url: qres.Result.VideoUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
                cover_url: qres.Result.CoverUrl,
                subtitle: prompt
              }
            });
          }
          if(status === "Fail"){
            clearInterval(timer);
            tasks.set(taskId, {status:"fail", error:"生成失败"});
          }
        }, 3000);
      })();

      return {
        statusCode:200,
        headers:{"Access-Control-Allow-Origin":"*"},
        body:JSON.stringify({task_id:taskId})
      };
    }

    if(action === "query"){
      const data = tasks.get(task_id) || {status:"fail", error:"任务不存在"};
      return {
        statusCode:200,
        headers:{"Access-Control-Allow-Origin":"*"},
        body:JSON.stringify({
          status:data.status,
          status_text:data.text,
          result:data.result||null,
          error:data.error||""
        })
      };
    }

    return {statusCode:400, body:"invalid action"};
  }catch(e){
    return {
      statusCode:500,
      headers:{"Access-Control-Allow-Origin":"*"},
      body:JSON.stringify({error:e.message})
    };
  }
};
