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
        version: 'v4.0.0-full-ai-service'
      })
    };
  }

  // 2. 读取密钥
  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;

  if (!AK || !SK) {
    return { statusCode: 401, body: JSON.stringify({ error: '密钥缺失' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { type } = body;

    // ------------------------------
    // 【1】文生图（豆包智能绘图）
    // ------------------------------
    if (type === 'text2image') {
      const { prompt = 'a cute cat', model = 'general_v2.1' } = body;
      const res = await volcRequest(AK, SK, {
        service: 'ai',
        endpoint: 'https://visual.volcengineapi.com',
        version: '2024-08-23',
        action: 'TextToImage',
        body: {
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
    if (type === 'video') {
      const { imgUrl, templateId = 'Santa_Claus_embrace_720p' } = body;
      const res = await volcRequest(AK, SK, {
        service: 'ai',
        endpoint: 'https://visual.volcengineapi.com',
        version: '2024-08-23',
        action: 'GenerateVideoEffect',
        body: {
          template_id: templateId,
          image_url: imgUrl
        }
      });
      return success(res);
    }

    // ------------------------------
    // 【3】单图音频驱动（数字人）
    // ------------------------------
    if (type === 'audio_driver') {
      const { imgUrl, audioUrl, mode = 'normal' } = body;
      const res = await volcRequest(AK, SK, {
        service: 'ai',
        endpoint: 'https://visual.volcengineapi.com',
        version: '2024-08-23',
        action: 'ImageAudioDrive',
        body: {
          mode: mode,
          image_url: imgUrl,
          audio_url: audioUrl
        }
      });
      return success(res);
    }

    return fail('不支持的 type：text2image | video | audio_driver');
  } catch (e) {
    return fail('参数错误：' + e.message);
  }
};

// ------------------------------
// 火山引擎签名工具（官方标准）
// ------------------------------
async function volcRequest(ak, sk, { service, endpoint, version, action, body }) {
  const d = new Date().toUTCString();
  const auth = `Host: ${new URL(endpoint).host}\nDate: ${d}\nContent-Type: application/json`;
  const hash = crypto.createHmac('sha256', sk).update(auth).digest('base64');
  const authorization = `HMAC-SHA256 Credential=${ak},Headers=host;date;content-type,Signature=${hash}`;

  const res = await fetch(`${endpoint}?Action=${action}&Version=${version}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Date': d,
      'Authorization': authorization
    },
    body: JSON.stringify(body)
  });

  return res.json();
}

function success(data) {
  return { statusCode: 200, body: JSON.stringify(data) };
}
function fail(msg) {
  return { statusCode 400, body: JSON.stringify({ error: msg }) };
}