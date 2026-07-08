import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";
import axios from "axios";
import * as cheerio from "cheerio";
import imageToPdf from "image-to-pdf";
import { spawn } from "child_process";
//=================
const userCache = new Map();
class DojingScraper {
constructor() {
this.baseUrl = "https://dojing.net/wp-admin/admin-ajax.php";
this.headers = {
"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
"X-Requested-With": "XMLHttpRequest",
"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
"Origin": "https://dojing.net",
"Referer": "https://dojing.net/",
"Accept": "*/*"
};
}
async getMangaData(judul) {
try {
const searchParams = new URLSearchParams();
searchParams.append("action", "ts_ac_do_search");
searchParams.append("ts_ac_query", judul);
const searchRes = await axios.post(this.baseUrl, searchParams.toString(), { 
headers: this.headers,
responseType: "text" 
});
const rawData = searchRes.data;
const jsonStartIndex = rawData.indexOf("{");
if (jsonStartIndex === -1) return null;
const searchData = JSON.parse(rawData.substring(jsonStartIndex));
const manga = searchData.series?.[0]?.all?.[0];
if (!manga) return null;
const chapterParams = new URLSearchParams();
chapterParams.append("action", "get_chapters");
chapterParams.append("id", manga.ID);
const chapterRes = await axios.post(this.baseUrl, chapterParams.toString(), { 
headers: this.headers,
responseType: "text"
});
const $ = cheerio.load(chapterRes.data);
const chapters = [];
$("option").each((_, el) => {
const url = $(el).val();
if (url && url !== "#") {
chapters.push({
title: $(el).text().trim(),
link: url
});
}
});
return {
manga_id: manga.ID, 
title: manga.post_title,
thumb: manga.post_image,
type: manga.post_type,
status: manga.post_status,
genres: manga.post_genres ? manga.post_genres.split(", ").map(g => g.trim()) : [],
chapters: chapters
};
} catch {
return null;
}
}
async getChapterImages(chapterUrl) {
try {
const res = await axios.get(chapterUrl, {
headers: {
"User-Agent": this.headers["User-Agent"],
"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
"Referer": "https://dojing.net/"
}
});
const $ = cheerio.load(res.data);
const images = [];
const noscriptHtml = $("#readerarea noscript").html();
if (noscriptHtml) {
const $images = cheerio.load(noscriptHtml);
$images("img").each((_, el) => {
const src = $images(el).attr("src");
if (src) images.push(src);
});
} else {
$("#readerarea img").each((_, el) => {
const src = $(el).attr("src") || $(el).attr("data-src");
if (src && !src.includes("readerarea.svg")) images.push(src);
});
}
return images;
} catch {
return [];
}
}
}
const dj = new DojingScraper();
//=================
const handler = async (m, { conn, isBotAdmins, isAdmins, command, args, text, isAccess, prefix }) => {
try {
if (!isAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (title)`);
if (args[0] === "read") {
const idx = parseInt(args[1]);
const mangaId = args[2]; 
const userMangaData = userCache.get(m.sender);
if (!userMangaData || !userMangaData[mangaId]) {
return m.reply(`-Example: ${prefix + command} (title)`);
}
const dojingCache = userMangaData[mangaId]; 
if (isNaN(idx) || !dojingCache.chapters[idx]) return m.reply(mess.error);
await m.reply(mess.wait);
const chLink = dojingCache.chapters[idx].link;
const imgUrls = await dj.getChapterImages(chLink);
if (!imgUrls.length) return m.reply(mess.error);
const imageBuffers = await Promise.all(
imgUrls.map(async (url) => {
try {
const res = await axios.get(url, { responseType: "arraybuffer" });
const buffer = Buffer.from(res.data, "binary");
if (url.endsWith(".webp") || url.includes(".webp")) {
return await new Promise((resolve) => {
const ffmpeg = spawn("ffmpeg", [
"-i", "pipe:0",
"-f", "image2",
"-vcodec", "mjpeg",
"pipe:1"
]);
const chunks = [];
ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
ffmpeg.stdout.on("end", () => resolve(Buffer.concat(chunks)));
ffmpeg.on("error", () => resolve(null));
ffmpeg.stdin.write(buffer);
ffmpeg.stdin.end();
});
}
return buffer;
} catch {
return null;
}
})
);
const validBuffers = imageBuffers.filter(buf => buf !== null);
if (!validBuffers.length) return m.reply(mess.error);
const pdfBuffer = await new Promise((resolve, reject) => {
const chunks = [];
const stream = imageToPdf(validBuffers);
stream.on("data", (chunk) => chunks.push(chunk));
stream.on("end", () => resolve(Buffer.concat(chunks)));
stream.on("error", (err) => reject(err));
});
const pdfName = `${dojingCache.title} - ${dojingCache.chapters[idx].title}.pdf`.replace(/[\\/:*?"<>|]/g, "");
return await conn.sendMessage(m.chat, {
document: pdfBuffer,
mimetype: "application/pdf",
fileName: pdfName,
caption: `*⌗ Dojing PDF Reader*
> *Judul:* ${dojingCache.title}
> *Chapter:* ${dojingCache.chapters[idx].title}`
}, { quoted: m });
}
await m.reply(mess.wait);
const meta = await dj.getMangaData(text);
if (!meta) return m.reply(mess.error);
const currentUserCache = userCache.get(m.sender) || {};
currentUserCache[meta.manga_id] = meta;
userCache.set(m.sender, currentUserCache);
const cap = `*⌗ Dojing Search*
> *Title:* ${meta.title}
> *Type:* ${meta.type || "-"}
> *Status:* ${meta.status || "-"}
> *Genre:* ${meta.genres.join(", ") || "-"}
> *Total Chapter:* ${meta.chapters.length}

_Status: Please select a chapter below to read..._`;
const sections = [
{
title: "Chapter List",
rows: meta.chapters.map((ch, idx) => ({
title: ch.title,
description: `Read Chapter ${idx + 1}`,
id: `${prefix + command} read ${idx} ${meta.manga_id}` 
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
handler.command = ["dojing"];
export default handler;
