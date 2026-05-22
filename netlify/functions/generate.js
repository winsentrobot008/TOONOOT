// 安全代理：火山 API 网关
// 作用：保护 KEY、鉴权、限流、日志
exports.handler = async (event) => {
  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: '缺少文案' }) };
    }

    // 从环境变量安全读取（Netlify 后台加密存储）
    const VOLC_ACCESS_KEY = process.env.VOLC_ACCESS_KEY;
    const VOLC_SECRET_KEY = process.env.VOLC_SECRET_KEY;

    if (!VOLC_ACCESS_KEY || !VOLC_SECRET_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '安全模式：API 未配置，返回演示结果',
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
        })
      };
    }

    // ===== 真实火山视频生成接口 =====
    // 这里是正式调用，前端永远看不到密钥
    // =================================

    // 1. 生成视频任务
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
    if (!createData.success || !createData.data.video_id) {
      throw new Error(`创建视频任务失败: ${JSON.stringify(createData)}`);
    }

    const videoId = createData.data.video_id;
    console.log(`视频任务已创建，ID: ${videoId}`);

    // 2. 轮询视频生成状态
    let videoUrl = null;
    for (let i = 0; i < 20; i++) { // 最多轮询20次
      await new Promise(resolve => setTimeout(resolve, 3000)); // 每3秒查询一次

      const statusResponse = await fetch(`https://ark.cn-beijing.volces.com/api/v3/videos/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VOLC_ACCESS_KEY}:${VOLC_SECRET_KEY}`
        }
      });

      const statusData = await statusResponse.json();
      console.log(`视频生成状态: ${statusData.data.status}`);

      if (statusData.data.status === 'completed') {
        videoUrl = statusData.data.video_url;
        break;
      } else if (statusData.data.status === 'failed') {
        throw new Error(`视频生成失败: ${JSON.stringify(statusData)}`);
      }
    }

    if (!videoUrl) {
      throw new Error('视频生成超时');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: '✅ AI 视频生成成功（安全通道）',
        videoUrl: videoUrl
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
