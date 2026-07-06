import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";
import axios from "axios";
import * as cheerio from "cheerio";
let komikCache = null;
//=================
class KomikindoScraper {
static headers = { "User-Agent": "Mozilla/5.0" };
static async search(title) {
try {
const { data: html } = await axios.get(
`https://komikindo.ch/daftar-manga/?title=${encodeURIComponent(title)}`,
{ headers: this.headers }
);
const $ = cheerio.load(html);
const all = $(".animepost").toArray();
if (!all.length) return null;
const el = all[0];
const link = $(el).find("h3 a").attr("href");
const { data: html2 } = await axios.get(link, { headers: this.headers });
const $$ = cheerio.load(html2);
const meta = {
title: $$(".infox h1").text().replace(/\s+/g, " ").trim() || $(el).find("h3 a").text().trim(),
thumb: $$(".thumb img").attr("src") || $(el).find("img").attr("src") || null,
author: $$('.spe span:contains("Pengarang")').text().replace(/Pengarang:/i, "").replace(/\s+/g, " ").trim(),
type: $$('.spe span:contains("Jenis")').text().replace(/Jenis Komik:/i, "").replace(/\s+/g, " ").trim(),
total_chapter: $$("#chapter_list ul li").length,
link
};
const ch = [];
$$("#chapter_list ul li").each((i, e) => {
ch.push({
title: $$(e).find(".lchx a").text().replace(/\s+/g, " ").trim(),
link: $$(e).find(".lchx a").attr("href")
});
});
return { ...meta, chapters: ch.reverse() };
} catch (e) {
return null;
}
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
const chLink = komikCache.chapters[idx].link;
const { data: html } = await axios.get(chLink, { headers: KomikindoScraper.headers });
const $ = cheerio.load(html);
const imgs = $("#chimg-auh img").map((i, e) => $(e).attr("src")).get();
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
submessages: [{ messageType: 2, messageText: `*${komikCache.chapters[idx].title}*\n\nTotal halaman: ${imgs.length}` }],
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
const meta = await KomikindoScraper.search(text);
if (!meta) return m.reply(mess.error);
komikCache = meta;
const cap = `*⌗ Komikindo Search*
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
description: `Read Chapter ${idx + 1}`,
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
handler.command = ["komikindo"];
export default handler;
