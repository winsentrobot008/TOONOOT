exports.handler = async (event) => {
  const VERSION = "v2.0.0-DEBUG";

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
        status: "ok",
        time: new Date().toISOString()
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { prompt, voice_text } = body;

    console.log(`[${VERSION}] 收到生成请求：prompt=${prompt}, voice_text=${voice_text}`);

    return {
      statusCode: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        ResponseMetadata: {
          RequestId: `toonoot-${Date.now()}`,
          Error: null,
          Version: VERSION
        },
        data: {
          video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          voice_url: "https://www.w3schools.com/html/horse.ogg",
          subtitle: voice_text || prompt || "欢迎使用TOONOOT AI视频生成平台",
          images: [{
            image_url: "https://picsum.photos/seed/" + Date.now() + "/1024/576"
          }]
        }
      })
    };
  } catch (e) {
    console.error(`[${VERSION}] 处理请求失败：`, e);
    return {
      statusCode: 500,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: e.message,
        stack: e.stack,
        ResponseMetadata: {
          RequestId: `toonoot-error-${Date.now()}`,
          Error: {
            Code: "InternalServerError",
            Message: e.message
          },
          Version: VERSION
        }
      })
    };
  }
};
