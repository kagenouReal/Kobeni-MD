import fs from "node:fs";
import crypto from "node:crypto";
import { Jimp } from 'jimp';
import {
prepareWAMessageMedia,
downloadContentFromMessage,
} from "@whiskeysockets/baileys";
//=================
export default (conn) => {
conn.decodeJid = (jid) => {
if (!jid) return jid;
const clean = jid.split(":")[0];
if (/@s\.whatsapp\.net$|@g\.us$/.test(clean)) return clean;
if (/^\d+$/.test(clean)) return `${clean}@s.whatsapp.net`;
return clean;
};
//=================
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
//=================
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
//=================
conn.sendText = (jid, text, quoted = "", opts = {}) =>
conn.sendMessage(jid, { text, ...opts }, { quoted });
//=================
conn.sendExternalThumb = async (jid, config = {}, options = {}) => {
const { text, title, body, thumbUrl, iconUrl, sourceUrl } = config;
const quoted = options.quoted || ""; 
let jpegBuf = null;
let thumbData = {};
let iconData = {};
let tasks = [];
if (thumbUrl) {
tasks.push(
prepareWAMessageMedia({ image: { url: thumbUrl } }, { upload: conn.waUploadToServer, mediaTypeOverride: "thumbnail-link" })
.then(wam => {
let i = wam.imageMessage || wam;
jpegBuf = i.jpegThumbnail || null;
thumbData = {
thumbnailDirectPath: i.directPath || "",
thumbnailSha256: i.fileSha256?.toString('base64') || "",
thumbnailEncSha256: i.fileEncSha256?.toString('base64') || "",
mediaKey: i.mediaKey?.toString('base64') || "",
thumbnailHeight: i.height || 1,
thumbnailWidth: i.width || 1
};
}).catch(() => {})
);
}
if (iconUrl) {
tasks.push(
prepareWAMessageMedia({ image: { url: iconUrl } }, { upload: conn.waUploadToServer, mediaTypeOverride: "thumbnail-link" })
.then(wam => {
let i = wam.imageMessage || wam;
iconData = {
faviconMMSMetadata: {
thumbnailDirectPath: i.directPath || "",
thumbnailSha256: i.fileSha256?.toString('base64') || "",
thumbnailEncSha256: i.fileEncSha256?.toString('base64') || "",
mediaKey: i.mediaKey?.toString('base64') || "",
}
};
}).catch(() => {})
);
}
await Promise.all(tasks);
let finalText = text || "";
if (sourceUrl && !finalText.includes(sourceUrl)) {
finalText = `${sourceUrl}\n${finalText}`;
}
let content = {
extendedTextMessage: {
text: finalText,
matchedText: sourceUrl || "",
title: title || "",
description: body || "",
previewType: 1,
renderLargerThumbnail: true,
jpegThumbnail: jpegBuf,
...thumbData,
...iconData,
contextInfo: quoted ? {
stanzaId: quoted.key.id,
participant: quoted.key.participant || quoted.key.remoteJid,
quotedMessage: quoted.message
} : {}
},
messageContextInfo: { messageSecret: crypto.randomBytes(32) }
};
return await conn.relayMessage(jid, content, { quoted });
};
//=================
conn.sendAlbum = async (jid, images, caption = "", m) => {
const quotedMsg = m.message?.extendedTextMessage
? m.message.extendedTextMessage.text
: m.text || " ";
const album = await generateWAMessageFromContent(
jid,
{
albumMessage: {
expectedImageCount: images.filter((i) => i.image).length,
expectedVideoCount: images.filter((i) => i.video).length,
contextInfo: {
stanzaId: m.key.id,
participant: m.sender,
quotedMessage: { conversation: quotedMsg },
forwardingScore: 1,
isForwarded: false,
},
},
},
{}
);
await conn.relayMessage(jid, album.message, { messageId: album.key.id });
for (let i = 0; i < images.length; i++) {
let type, input;
if (images[i].image) {
type = "image";
input = images[i].image;
} else if (images[i].video) {
type = "video";
input = images[i].video;
} else {
continue;
}
let buffer;
if (Buffer.isBuffer(input)) {
buffer = input;
} else if (typeof input === "string" && input.startsWith("http")) {
buffer = await getBuffer(input);
} else if (typeof input === "string") {
buffer = fs.readFileSync(input);
} else {
continue;
}
const media = await prepareWAMessageMedia(
{ [type]: buffer },
{ upload: conn.waUploadToServer }
);
const msg = await generateWAMessageFromContent(
jid,
{
[`${type}Message`]: {
...media[`${type}Message`],
caption: images[i].caption || caption,
contextInfo: { forwardingScore: 999, isForwarded: true },
},
messageContextInfo: {
messageAssociation: {
associationType: 1,
parentMessageKey: album.key,
},
},
},
{ upload: conn.waUploadToServer }
);
await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
}
};
//=================
return conn;
};
