import fs from "node:fs";
import crypto from "node:crypto";
import { Jimp } from 'jimp';
import {
prepareWAMessageMedia,
downloadContentFromMessage,
generateWAMessageFromContent,
} from "@whiskeysockets/baileys";
// ====================
export default (conn) => {
conn.decodeJid = (jid) => {
if (!jid) return jid;
const clean = jid.split(":")[0];
if (/@s\.whatsapp\.net$|@g\.us$/.test(clean)) return clean;
if (/^\d+$/.test(clean)) return `${clean}@s.whatsapp.net`;
return clean;
};
// ====================
conn.downloadMediaMessage = async (message) => {
const mime = (message.msg || message).mimetype || "";
const messageType = message.mtype
? message.mtype.replace(/Message/gi, "")
: mime.split("/")[0];
const stream = await downloadContentFromMessage(message, messageType);
let buffer = Buffer.from([]);
for await (const chunk of stream) {
buffer = Buffer.concat([buffer, chunk]);
}
return buffer;
};
// ====================
conn.updatePFPMod = async (content) => {
const bufferOrFilePath = Buffer.isBuffer(content)
? content
: "url" in content
? content.url.toString()
: content;
const image = await Jimp.read(bufferOrFilePath);
const cropped =
image.bitmap.width > image.bitmap.height
? image.resize(550, Jimp.AUTO)
: image.resize(Jimp.AUTO, 650);
const img = await cropped.quality(100).getBufferAsync(Jimp.MIME_JPEG);
await conn.query({
tag: "iq",
attrs: {
to: "@s.whatsapp.net",
type: "set",
xmlns: "w:profile:picture",
},
content: [
{
tag: "picture",
attrs: { type: "image" },
content: img,
},
],
});
};
// ====================
conn.sendText = (jid, text, quoted = "", opts = {}) =>
conn.sendMessage(jid, { text, ...opts }, { quoted });
return conn;
};
