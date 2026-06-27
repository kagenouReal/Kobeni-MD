import crypto from "node:crypto";
import fs from "fs-extra";
import axios from "axios";
//===============
class TakoClient {
constructor() {
this.systemPrompt = "[SYSTEM INSTRUCTION: You are a text-based AI assistant. Do not generate or create any images, drawings, or visual art under any circumstances. Always respond with pure text or markdown.]";
}
generateDynamicToken() {
const prefixPayload = "03e10ee26165e4bd3221bbd98679972f480157d2"; 
const randomPayloadBody = crypto.randomBytes(67).toString('hex');
return `${prefixPayload}${randomPayloadBody}--KageVibeCoder`;
}
getHeaders(currentTimestamp, token) {
return {
'host': 'tako22-normal-alisg.tiktokv.com',
'x-ss-req-ticket': currentTimestamp,
'x-tt-token': token,
'user-agent': 'com.ss.android.ugc.trill/440503 (Linux; U; Android 15; en_GB; 23127PN0CC; Build/BP1A.250505.005; Cronet/TTNetVersion:b18ffdba 2026-03-04 QuicVersion:3679867a 2026-02-06)'
};
}
async chat(prompt, options = {}) {
try {
const currentTimestamp = Date.now().toString();
const currentUnixSec = Math.floor(Date.now() / 1000);
const randomUuid = crypto.randomUUID();
const dynamicToken = this.generateDynamicToken();
const finalPrompt = `${this.systemPrompt}\n\nUser: ${prompt}`;
const payload = new URLSearchParams();
payload.append('op_type', '1');
payload.append('entry_time', currentTimestamp);
payload.append('uuid', randomUuid);
payload.append('conversation_id', ''); 
payload.append('msg_id', '');
payload.append('msg_type', '1');
payload.append('msg_content', JSON.stringify({ text: finalPrompt }));
payload.append('request_time', currentTimestamp);
payload.append('enable_deep_search', options.deepSearch ? 'true' : 'false');
const apiUrl = `https://tako22-normal-alisg.tiktokv.com/aweme/v1/tako/op/stream/?device_platform=android&os=android&ssmix=a&_rticket=${currentTimestamp}&channel=googleplay&aid=1180&app_name=trill&version_code=440503&version_name=44.5.3&manifest_version_code=440503&update_version_code=440503&ab_version=44.5.3&resolution=720*1600&dpi=281&device_type=23127PN0CC&device_brand=Xiaomi&language=en&os_api=35&os_version=15&ac=wifi&is_pad=0&current_region=MY&app_type=normal&sys_region=GB&last_install_time=1782319800&timezone_name=Asia%2FKuala_Lumpur&residence=MY&app_language=en&timezone_offset=28800&host_abi=arm64-v8a&locale=en-GB&ac2=unknown&uoo=0&op_region=MY&build_number=44.5.3&region=GB&ts=${currentUnixSec}&iid=7623820063082530568&device_id=7570082692370843144`;
const response = await axios({
method: 'POST',
url: apiUrl,
headers: this.getHeaders(currentTimestamp, dynamicToken),
data: payload.toString(),
responseType: 'stream'
});
return new Promise((resolve, reject) => {
let finalMessage = "";
let bufferStr = "";
let logId = "unknown";
let serverConversationId = "";
response.data.on('data', (chunk) => {
const chunkStr = chunk.toString('utf8');
bufferStr += chunkStr;
const jsonLines = bufferStr.match(/\{"status_code":.+?\}(?=\s*(\{|$))/gs);
if (jsonLines) {
jsonLines.forEach(line => {
try {
const cleanLine = line.substring(line.indexOf('{'));
const parsed = JSON.parse(cleanLine);
if (parsed.extra && parsed.extra.log_id) logId = parsed.extra.log_id;
if (parsed.msg && parsed.msg.conversation_id) {
serverConversationId = parsed.msg.conversation_id;
}
if (parsed.msg_content_patch && parsed.msg_content_patch.patch) {
parsed.msg_content_patch.patch.forEach(p => {
if ((p.field === 'text') && (p.op === 'add' || p.op === 'replace')) {
if (p.value.includes('<data-inline')) return;
try {
const textObj = JSON.parse(p.value);
if (textObj && textObj.text) {
finalMessage += textObj.text;
}
} catch (e) {
if (!p.value.startsWith('{')) {
finalMessage += p.value;
}
}
}
});
}
} catch (err) {}
});
const lastMatch = bufferStr.lastIndexOf(jsonLines[jsonLines.length - 1]);
if (lastMatch !== -1) {
bufferStr = bufferStr.substring(lastMatch + jsonLines[jsonLines.length - 1].length);
}
}
});
response.data.on('end', () => {
resolve({
text: finalMessage.trim(),
meta: { 
log_id: logId, 
returned_conversation_id: serverConversationId
}
});
});
response.data.on('error', () => reject(new Error('ah error')));
});
} catch (error) {
throw new Error(error.response ? 'ah error' : 'ah mising');
}
}
}
//===============
let handler = async (m, {conn,isBotAdmins,isAdmins,command,args,text,isAccess,prefix,}) => {
if (!text) return m.reply(`-Example: ${prefix + command} (text)`);
await m.reply(mess.wait)
try {
const tako = new TakoClient();
const result = await tako.chat(text, { deepSearch: false });
if (!result.text) {
return m.reply(mess.error);
}
await conn.sendMessage(m.chat,{ text: result.text }, { quoted: {
key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "0@s.whatsapp.net"},
message: { orderMessage: { orderId: "65bh4ddqr90", thumbnail: fs.readFileSync("./system/media/tako.jpg"), itemCount: 999, status: "INQUIRY", surface: "CATALOG", orderTitle: "product", message: "ᴛɪᴋᴛᴏᴋ.ᴄᴏᴍ/ᴛᴀᴋᴏ", sellerJid: m.sender, token: "775BBQR0", totalAmount1000: 777, totalCurrencyCode: "MYR", contextInfo: { mentionedJid: [m.sender] } } } } })
} catch (err) {
console.error("Error Tako:", err.message);
return m.reply(mess.error);
}
};
handler.command = ["tako"];
export default handler;
