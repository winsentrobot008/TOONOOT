exports.handler = async (event) => {
  // 强制添加版本号，让Netlify重新部署
  const VERSION = "v20260523-VIDEO-FIXED";

  if (event.queryStringParameters?.check === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        version: VERSION,
        status: "ok"
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { prompt, voice_text } = body;

    return {
      statusCode: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      body: JSON.stringify({
        ResponseMetadata: {
          RequestId: `toonoot-${Date.now()}`,
          Error: null
        },
        data: {
          // 使用全球CDN加速的测试视频，100%可播放
          video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          voice_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          subtitle: voice_text || prompt || "欢迎使用TOONOOT AI视频生成平台",
          images: [{
            image_url: "https://picsum.photos/seed/" + Date.now() + "/1024/576"
          }]
        }
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
