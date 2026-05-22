const crypto = require('crypto');

exports.handler = async (event) => {
  const AK = process.env.VOLC_ACCESS_KEY;
  const SK = process.env.VOLC_SECRET_KEY;

  if(event.queryStringParameters?.checkKeys==="1"){
    return {statusCode:200,body:JSON.stringify({hasAK:!!AK,hasSK:!!SK,allSet:true,version:"v5.0-pro"})};
  }

  if(!AK||!SK)return res(401,{error:"missing keys"});
  try{
    const body=event.body?JSON.parse(event.body):{};
    const {type}=body;

    if(type==="text2image"){
      return res(200,await volcRequest(AK,SK,"TextToImage",{model_name:"general_v2.1",prompt:body.prompt||"cat",width:1024,height:1024}));
    }

    if(type==="video"){
      return res(200,await volcRequest(AK,SK,"GenerateVideoEffect",{template_id:body.templateId,image_url:body.imgUrl}));
    }

    if(type==="avatar"){
      return res(200,await volcRequest(AK,SK,"ImageAudioDrive",{image_url:body.imgUrl,text:body.text}));
    }

    return res(400,{error:"invalid type"});
  }catch(e){
    return res(400,{error:e.message});
  }
};

async function volcRequest(ak,sk,action,body){
  const url=new URL("https://visual.volcengineapi.com");
  const host=url.host;
  const date=new Date().toUTCString();
  const auth=`Host: ${host}\nDate: ${date}\nContent-Type: application/json`;
  const sig=crypto.createHmac("sha256",sk).update(auth).digest("base64");
  const res=await fetch("https://visual.volcengineapi.com?Action="+action+"&Version=2024-08-23",{
    method:"POST",headers:{
      "Content-Type":"application/json","Date":date,
      "Authorization":`HMAC-SHA256 Credential=${ak},Headers=host;date;content-type,Signature=${sig}`
    },body:JSON.stringify(body)
  });
  return res.json();
}

function res(code,data){
  return {statusCode:code,body:JSON.stringify(data)};
}
