// ==============================================
// TOONOOT AI 视频生成 - 安全代理接口
// 版本：v2.2.1（稳定版，带密钥自检）
// 功能：稳定运行 + 密钥状态自检 + 文案关联模拟视频
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
          version: "v2.2.1"
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
          version: "v2.2.1"
        })
      };
    }

    // 稳定的模拟视频逻辑（根据文案哈希匹配不同视频）
    const mockVideos = [
      "https://www.w3schools.com/html/mov_bbb.mp4",
      "https://www.w3schools.com/html/movie.mp4"
    ];
    const hash = text.split('').reduce((a, b) => { 
      a = ((a << 5) - a) + b.charCodeAt(0); 
      return a & a; 
    }, 0);
    const selected = mockVideos[Math.abs(hash) % mockVideos.length];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: '✅ 运行正常（演示模式）',
        videoUrl: selected,
        version: "v2.2.1"
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
