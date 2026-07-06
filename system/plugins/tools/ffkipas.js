import axios from "axios";
import * as cheerio from "cheerio";
//=================
class FFKipasVerifier {
constructor() {
this.baseUrl = 'https://ffkipas.my.id';
this.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
}
#sleep(ms) {
return new Promise((resolve) => setTimeout(resolve, ms));
}
async verify(uidTarget, delayMs = 2000) {
try {
const responsePage = await axios.get(`${this.baseUrl}/verifyuid`, {
headers: { 'User-Agent': this.userAgent }
});
const cookieSession = responsePage.headers['set-cookie'] ? responsePage.headers['set-cookie'][0].split(';')[0] : '';
const $ = cheerio.load(responsePage.data);
const token = $('#csrf-token').val();
const verification = $('#verification-hash').val();
const timestamp = $('#page-timestamp').val();
if (!token || !verification) return null;
await this.#sleep(delayMs);
const payloadObjek = {
action: "verify_uid",
uid: uidTarget,
token: token,
verification: verification,
timestamp: timestamp,
steps: "1,2,3,4,5"
};
const stringJson = JSON.stringify(payloadObjek);
const base64SecureData = Buffer.from(stringJson).toString('base64');
const bodyData = `secure_data=${encodeURIComponent(base64SecureData)}`;
const responseAjax = await axios.post(`${this.baseUrl}/api/ajax`, bodyData, {
headers: {
'Host': 'ffkipas.my.id',
'Cookie': cookieSession,
'User-Agent': this.userAgent,
'Origin': this.baseUrl,
'Referer': `${this.baseUrl}/verifyuid`
}
});
return responseAjax.data;
} catch (error) {
console.error(error);
return null;
}
}
}
//=================
const handler = async (m, { conn, isBotAdmins, isAdmins, command, args, text, isAccess, prefix }) => {
if (!text) return m.reply(`-Example: ${prefix + command} (uid)`);
try {
await m.reply(mess.wait);
const verifier = new FFKipasVerifier();
const res = await verifier.verify(text.trim(), 2000);
if (!res) return m.reply(mess.error);
const caption = `*⌗ Verify FF Kipas Info*
> *Status:* ${res.status || "-"}
> *Message:* ${res.message || "-"}`.trim();
await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
} catch (e) {
console.error(e);
m.reply(mess.error);
}
};
//=================
handler.command = ["vffkipas"];
export default handler;
