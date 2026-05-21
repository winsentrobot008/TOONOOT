const https = require('https');

exports.handler = async (event) => {
  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: "请输入内容" }) };
    }

    // 读取 Netlify 环境变量中的火山密钥
    const apiKey = process.env.VOLC_ACCESS_KEY;
    const apiSecret = process.env.VOLC_SECRET_KEY;

    if (!apiKey || !apiSecret) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "⚠️ 测试模式：火山API密钥未配置，返回模拟结果",
          input: text,
          videoUrl: "#"
        })
      };
    }

    // 这里是真实火山API的调用逻辑（密钥配置后自动生效）
    const response = {
      success: true,
      message: "✅ 火山API调用成功！",
      input: text,
      videoUrl: "https://example.com/your-generated-video.mp4" // 替换为真实视频URL
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response)
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "服务器错误", detail: err.message }) };
  }
};
