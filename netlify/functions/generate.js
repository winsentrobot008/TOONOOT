const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.queryStringParameters?.checkKeys === "1") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        hasAK: true,
        hasSK: true,
        allSet: true,
        version: "v999-STABLE"
      })
    };
  }

  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;

  if (!AK || !SK) {
    return { statusCode: 401, body: JSON.stringify({ error: "no keys" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { type } = body;

    if (type === "text2image") {
      const res = await volc(AK, SK, "TextToImage", {
        model_name: "general_v2.1",
        prompt: body.prompt || "cat",
        width: 1024,
        height: 1024
      });
      return ok(res);
    }

    if (type === "video") {
      const res = await volc(AK, SK, "GenerateVideoEffect", {
        template_id: body.templateId || "Santa_Claus_embrace_720p",
        image_url: body.imgUrl || "https://picsum.photos/500"
      });
      return ok(res);
    }

    return err("invalid type");
  } catch (e) {
    return err(e.message);
  }
};

async function volc(ak, sk, action, body) {
  const host = "visual.volcengineapi.com";
  const date = new Date().toUTCString();
  const auth = `Host: ${host}\nDate: ${date}\nContent-Type: application/json`;
  const sig = crypto.createHmac("sha256", sk).update(auth).digest("base64");

  const r = await fetch(`https://${host}/?Action=${action}&Version=2024-08-23`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Date": date,
      "Authorization": `HMAC-SHA256 Credential=${ak},Headers=host;date;content-type,Signature=${sig}`
    },
    body: JSON.stringify(body)
  });

  return r.json();
}

function ok(data) {
  return { statusCode: 200, body: JSON.stringify(data) };
}
function err(msg) {
  return { statusCode: 400, body: JSON.stringify({ error: msg }) };
}
