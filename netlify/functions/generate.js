exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const text = body.text;

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "请输入内容" })
      };
    }

    // 这里后续接入火山 API
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "✅ TOONOOT 部署成功！Netlify 函数正常运行",
        input: text
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "服务器错误" })
    };
  }
};
