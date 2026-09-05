
import axios from "axios";
//=================
const TYPECAST_APIKEY="eyJhbGciOiJSUzI1NiIsImtpZCI6IjI0N2Y4MDYwMDM5YjVmNDBkOTQ5NjkzOGJiMTg5NzA2ZWY4ODkzM2QiLCJ0eXAiOiJKV1QifQ.eyJfaWQiOiI2YTljNTViNWU2NDA3NzMzODg0MTg4ZWQiLCJhcHByb3ZlZCI6dHJ1ZSwiYXV0aHR5cGUiOiJmaXJlYmFzZSIsInByb3ZpZGVyIjoicGFzc3dvcmQiLCJpc19wYWlkIjpmYWxzZSwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3R5cGVjYXN0LXByb2QtNTBjYjEiLCJhdWQiOiJ0eXBlY2FzdC1wcm9kLTUwY2IxIiwiYXV0aF90aW1lIjoxNzg4NjMzODYzLCJ1c2VyX2lkIjoiUGZRUVQ4YnFJbVlzZzBTVEhESndaeUd0ZVVGMiIsInN1YiI6IlBmUVFUOGJxSW1Zc2cwU1RIREp3WnlHdGVVRjIiLCJpYXQiOjE3ODg2MzM4NjMsImV4cCI6MTc4ODYzNzQ2MywiZW1haWwiOiJrYWdlbm91cmVhbEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJrYWdlbm91cmVhbEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.sLEvPIngst5VluJQgLKVrdMK2RFJEkYUTu8s31iERw6PBihI0d8j5FZhk2B3UboEbBsltZANKM7MQ5J1Uj_K8hOhdO3MO6s165bILIIs4rk_1Ou5wP7lpV7rSzl5WXxCy-zNFGdfYg73zCjOt8-lT4UtCuqdsBpjr6eHOh0QLhkHlj90yDxpMrNxiCb4q0QI9RT98FCNQb4czuX-0C-9TkmSo85vgwEpjHH-W4omR8axtNaMHOY2MY38C8ytjXo51UrnEuDBgMGoAWkI_elEnftSuAoA-fVOZN3nNJ2ilP8oCuXKrzTDtLJKrJlM2ct70c6ZGAXM2JWz3Xj1s8d7xQ"
//=================
async function typecast(text){
try{
if(!TYPECAST_APIKEY)throw new Error("API key missing");
const headers={
Accept:"application/json, text/plain, */*",
Authorization:`Bearer ${TYPECAST_APIKEY}`,
"Content-Type":"application/json",
Origin:"https://studio.typecast.ai",
Referer:"https://studio.typecast.ai/",
"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
};
const {data}=await axios.post(
"https://typecast.ai/api/speak/batch/post",
[{
text,
actor_id:"63edf3ccd8e2eb7338999376",
expressivity:0,
tempo:1,
pitch:0,
style_label:"normal-1",
reference_style_label:"sad-1",
style_label_version:"v2",
emotion_label:"sad",
emotion_scale:1,
lang:"auto",
mode:"one-vocoder",
retake:true,
bp_c_l:true,
adjust_lastword:0
}],
{headers,timeout:30000}
);
const speakUrl=data?.result?.speak_urls?.[0];
if(!speakUrl)throw new Error("Speak URL missing");

let result=null;
for(let i=0;i<30;i++){
const {data}=await axios.post(
"https://typecast.ai/api/speak/batch/get",
[speakUrl],
{headers,timeout:30000}
);
result=data?.result?.[0];
if(result?.status==="done")break;
if(result?.status==="error")throw new Error(result?.error_message||"Typecast generation failed");
await new Promise(r=>setTimeout(r,2000));
}
if(result?.status!=="done")throw new Error("Typecast generation timeout");

const audioUrl=result.audio?.high?.url||result.audio?.url||result.audio?.hd1?.url;
if(!audioUrl)throw new Error("Audio URL missing");

const {data:audio}=await axios.get(audioUrl,{
headers:{
Authorization:`Bearer ${TYPECAST_APIKEY}`,
"User-Agent":"Mozilla/5.0"
},
responseType:"arraybuffer",
timeout:60000
});
const buffer=Buffer.from(audio);
if(!buffer.length)throw new Error("Empty audio");
return buffer;
}catch(e){
console.error("Typecast:",e?.response?.data||e.message);
return null;
}
//=================
}
const handler=async(m,{conn,command,text,prefix})=>{
try{
if(!text)return m.reply(`-Example: ${prefix+command} (text)`);
await m.reply(mess.wait);
const audio=await typecast(text.trim());
if(!audio)return m.reply(mess.error);
await conn.sendMessage(m.chat,{
audio,
mimetype:"audio/mpeg"
},{quoted:m});
}catch(e){
console.error("Handler:",e.message);
m.reply(mess.error);
}
};
//=================
handler.command=["typecast"];
export default handler;
