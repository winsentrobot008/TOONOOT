// ==============================================
// TOONOOT AI 视频生成 - 安全代理接口
// 版本：v2.3.0
// 功能：真实火山方舟视频生成API调用
// ==============================================
exports.handler = async (event) => {
  try {
    const { text } = JSON.parse(event.body || '{}');

    // 🔑 自检接口：前端用来判断 Key 是否存在
    if (event.queryStringParameters && event.queryStringParameters.checkKeys) {
      const hasAccess = !!process.env.VOLC_ACCESS_KEY;
      const hasSecret = !!process.env.VOLC_SECRET_KEY;
      return {
        statusCode: 200,
        body: JSON.stringify({
          hasAccess,
          hasSecret,
          allSet: hasAccess && hasSecret,
          version: "v2.3.0"
        })
      };
    }

    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: '缺少文案' }) };
    }

    const VOLC_ACCESS_KEY = process.env.VOLC_ACCESS_KEY;
    const VOLC_SECRET_KEY = process.env.VOLC_SECRET_KEY;

    if (!VOLC_ACCESS_KEY || !VOLC_SECRET_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '演示模式：API 未配置',
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
          version: "v2.3.0"
        })
      };
    }

    // ======================
    // 真实火山方舟视频生成逻辑
    // ======================
    // 1. 发起视频生成任务
    const createResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLC_ACCESS_KEY}:${VOLC_SECRET_KEY}`
      },
      body: JSON.stringify({
        input: {
          prompt: text,
          ratio: '16:9',
          duration: 5
        }
      })
    });

    const createData = await createResponse.json();
    if (!createData.success || !createData.data?.video_id) {
      throw new Error(`创建视频任务失败: ${JSON.stringify(createData)}`);
    }

    const videoId = createData.data.video_id;
    console.log(`视频任务已创建，ID: ${videoId}`);

    // 2. 轮询视频生成状态（最多轮询10次，每次间隔3秒）
    let videoUrl = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusResponse = await fetch(`https://ark.cn-beijing.volces.com/api/v3/videos/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VOLC_ACCESS_KEY}:${VOLC_SECRET_KEY}`
        }
      });

      const statusData = await statusResponse.json();
      console.log(`视频生成状态: ${statusData.data?.status}`);

      if (statusData.data?.status === 'completed') {
        videoUrl = statusData.data.video_url;
        break;
      } else if (statusData.data?.status === 'failed') {
        throw new Error(`视频生成失败: ${JSON.stringify(statusData)}`);
      }
    }

    if (!videoUrl) {
      throw new Error('视频生成超时，请稍后重试');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: '✅ 火山AI视频生成成功',
        videoUrl: videoUrl,
        version: "v2.3.0"
      })
    };

  } catch (err) {
    console.error('服务异常:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务异常', detail: err.message })
    };
  }
};
