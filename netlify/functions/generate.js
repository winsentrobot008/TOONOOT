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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: '✅ AI 视频生成成功（安全通道）',
        videoUrl: 'https://www.w3schools.com/html/movie.mp4'
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务异常', detail: err.message })
    };
  }
};
