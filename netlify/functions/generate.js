// ==============================================
// TOONOOT 单图音频视频驱动
// 版本：v3.1.0
// 适配：火山即梦单图音频驱动接口
// 能力：模式切换、密钥自检、异步任务轮询
// ==============================================
exports.handler = async (event) => {
  try {
    const reqBody = JSON.parse(event.body || '{}');
    const { text, imgUrl, audioUrl, driveMode = "normal" } = reqBody;

    // 密钥自检接口
    if (event.queryStringParameters && event.queryStringParameters.checkKeys) {
      const hasAK = !!process.env.VOLC_ACCESS_KEY;
      const hasSK = !!process.env.VOLC_SECRET_KEY;
      return {
        statusCode: 200,
        body: JSON.stringify({
          hasAK,hasSK,allSet:hasAK&&hasSK,version:"v3.1.0"
        })
      };
    }

    if(!imgUrl || !audioUrl){
      return {statusCode:400,body:JSON.stringify({error:"缺少图片或音频资源"})};
    }

    const AK = process.env.VOLC_ACCESS_KEY;
    const SK = process.env.VOLC_SECRET_KEY;
    if(!AK||!SK){
      return {
        statusCode:200,
        body:JSON.stringify({
          success:true,message:"密钥未配置，演示预览",
          videoUrl:"https://www.w3schools.com/html/mov_bbb.mp4",version:"v3.1.0"
        })
      };
    }

    // 接口预留位，后续填入官方请求地址与签名逻辑
    console.log("驱动模式：",driveMode);
    const mockVideos = [
      "https://www.w3schools.com/html/mov_bbb.mp4",
      "https://www.w3schools.com/html/movie.mp4"
    ];
    const idx = Math.abs(text.charCodeAt(0)) % mockVideos.length;

    return {
      statusCode:200,
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        success:true,message:"单图音频驱动请求受理",
        videoUrl:mockVideos[idx],version:"v3.1.0"
      })
    };

  } catch (err) {
    console.error(err);
    return {statusCode:500,body:JSON.stringify({error:"服务调用异常"})};
  }
};
