import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";
import axios from "axios";
let komikCache = null;
//=================
async function getMangaList(query) {
try {
const headers = { "User-Agent": "okhttp/5.3.2" };
const url = `https://api.shngm.io/v1/manga/list?page=1&page_size=1&q=${encodeURIComponent(query)}`;
const { data: res } = await axios.get(url, { headers });
if (res.retcode !== 0 || !res.data.length) return null;
const mangaData = res.data[0];
const mangaId = mangaData.manga_id;
const chUrl = `https://api.shngm.io/v1/chapter/${mangaId}/list?page=1&page_size=100000&sort_by=chapter_number&sort_order=desc`;
const { data: resCh } = await axios.get(chUrl, { headers });
const chapters = (resCh.data || []).map(c => ({
title: `Chapter ${c.chapter_number} ${c.chapter_title ? '- ' + c.chapter_title : ''}`.trim(),
id: c.chapter_id
}));
return {
title: mangaData.title,
thumb: mangaData.cover_image_url,
author: mangaData.taxonomy?.Author?.[0]?.name || "-",
type: mangaData.taxonomy?.Format?.[0]?.name || "-",
total_chapter: resCh.meta?.total_record || chapters.length,
manga_id: mangaId,
chapters: chapters.reverse()
};
} catch (e) {
return null;
}
}
async function getChapterImages(chapterId) {
try {
const headers = { "User-Agent": "okhttp/5.3.2" };
const url = `https://api.shngm.io/v1/chapter/detail/${chapterId}`;
const { data: res } = await axios.get(url, { headers });
if (res.retcode !== 0 || !res.data?.chapter?.data) return [];
const baseUrl = res.data.base_url;
const path = res.data.chapter.path;
return res.data.chapter.data.map(imgName => `${baseUrl}${path}${imgName}`);
} catch (e) {
return [];
}
}
//=================
const handler = async (m, { conn, isBotAdmins, isAdmins, command, args, text, isAccess, prefix }) => {
try {
if (!text) return m.reply(`-Example: ${prefix + command} (title)`);
if (args[0] === "read") {
if (!komikCache) return m.reply(`-Example: ${prefix + command} (title)`);
const idx = parseInt(args[1]);
if (isNaN(idx) || !komikCache.chapters[idx]) return m.reply(mess.error);
await m.reply(mess.wait);
const targetChapter = komikCache.chapters[idx];
const imgs = await getChapterImages(targetChapter.id);
if (!imgs.length) return m.reply(mess.error);
const sections = imgs.map(img => ({
view_model: {
primitive: { 
media: { url: img, mime_type: "image/jpeg" }, 
imagine_type: 3, 
status: { status: "READY" }, 
__typename: "GenAIImaginePrimitive" 
},
__typename: "GenAISingleLayoutViewModel"
}
}));
const contextInfo = { 
forwardingScore: 1, 
isForwarded: true, 
forwardedAiBotMessageInfo: { botJid: "0@bot" }, 
forwardOrigin: 4, 
stanzaId: m.key.id, 
participant: m.sender || m.key.participant || m.key.remoteJid, 
quotedMessage: m.message || { conversation: "" } 
};
const msgData = {
messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2, botMetadata: {} },
botForwardedMessage: {
message: {
richResponseMessage: {
messageType: 1,
submessages: [{ messageType: 2, messageText: `*${targetChapter.title}*\n\nTotal halaman: ${imgs.length}` }],
unifiedResponse: { data: Buffer.from(JSON.stringify({ response_id: Math.random().toString(16).slice(2), sections })).toString("base64") },
contextInfo
}
}
}
};
const msg = generateWAMessageFromContent(m.chat, msgData, { userJid: conn.user?.id });
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
return await conn.sendMessage(m.chat, {
text: "Scroll up."
}, { quoted: msg });
}
await m.reply(mess.wait);
const meta = await getMangaList(text);
if (!meta) return m.reply(mess.error);
komikCache = meta;
const cap = `*⌗ Komiku Search*
> *Title:* ${meta.title}
> *Author:* ${meta.author || "-"}
> *Type:* ${meta.type || "-"}
> *Total Chapter:* ${meta.total_chapter || 0}

_Status: Please select a chapter below to read..._`;
const sections = [
{
title: "Chapter List",
rows: meta.chapters.map((ch, idx) => ({
title: ch.title,
id: `${prefix + command} read ${idx}`
}))
}
];
const contextInfo = { 
stanzaId: m.key.id, 
participant: m.sender || m.key.participant || m.key.remoteJid, 
quotedMessage: m.message || { conversation: "" } 
};
let imageHeader = {};
if (meta.thumb) {
const mediaUpload = await prepareWAMessageMedia({ image: { url: meta.thumb } }, { upload: conn.waUploadToServer });
imageHeader = { imageMessage: mediaUpload.imageMessage };
}
const msgData = {
interactiveMessage: {
body: { text: cap },
footer: { text: "© ᴋᴏʙᴇɴɪ-ᴍᴅ" },
header: {
hasMediaAttachment: meta.thumb ? true : false,
...imageHeader
},
nativeFlowMessage: {
buttons: [
{
name: "single_select",
buttonParamsJson: JSON.stringify({
title: "\u0000",
sections: sections
})
}
]
},
contextInfo
},
};
const msg = generateWAMessageFromContent(m.chat, msgData, { userJid: conn.user?.id });
const INTERACTIVE_NODES = [
{
tag: "biz",
attrs: {},
content: [
{
tag: "interactive",
attrs: { type: "native_flow", v: "1" },
content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
},
],
},
];
await conn.relayMessage(m.chat, msg.message, { 
messageId: msg.key.id,
additionalNodes: INTERACTIVE_NODES
});
} catch (err) {
console.error(err);
m.reply(mess.error);
}
};
//=================
handler.command = ["komiku"];
export default handler;
