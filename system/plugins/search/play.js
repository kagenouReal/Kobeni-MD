import yts from "yt-search";
import axios from "axios";
import { spawn } from "child_process";
import fs from "fs";
//=================
async function ytmp3(url, config = { host: 'epsilon.epsiloncloud.org', origin: 'https://convertytmp3.org' }, format = 'mp3') {
const headers = {
"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
"origin": config.origin,
"referer": config.origin + "/",
"accept": "*/*"
};
try {
const idMatch = url.match(/(?:v=|\/embed\/|\/11\/|\/v\/|https:\/\/youtu\.be\/)([^"&?\/\s]{11})/);
if (!idMatch) throw new Error("stupid.");
const videoId = idMatch[1];
const ts = Date.now();
const auth = await axios.get(`https://${config.host}/api/v1/auth?_=${ts}`, { headers });
if (auth.data.err !== 0 || !auth.data.key) throw new Error(`Auth gagal di ${config.host}`);
const authKey = auth.data.key;
const init = await axios.get(`https://${config.host}/api/v1/init?_=${ts + 100}`, {
headers: { ...headers, "authorization": `Bearer ${authKey}` }
});
if (!init.data.convertURL || init.data.error !== "0") throw new Error(`engror ${config.host}`);
const conv1Url = `${init.data.convertURL}&v=${videoId}&f=${format}&_=${ts + 200}`;
const conv1 = await axios.get(conv1Url, { headers });
if (conv1.data.downloadURL) {
return { success: true, title: conv1.data.title || "Unknown", downloadURL: conv1.data.downloadURL };
}
if (conv1.data.redirect === 1 && conv1.data.redirectURL) {
let targetUrl = conv1.data.redirectURL.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
if (!targetUrl.includes('_=')) targetUrl += `&_=${ts + 300}`;
const conv2 = await axios.get(targetUrl, { headers });
if (conv2.data.error === 0 && conv2.data.downloadURL) {
return { 
success: true, 
title: conv2.data.title || "undefined", 
downloadURL: conv2.data.downloadURL 
};
}
}
throw new Error("engror");
} catch (err) {
return { success: false, error: err.message };
}
}
//=================
const handler = async (m, { conn, command, text, prefix }) => {
if (!text) return m.reply(`-Example: ${prefix + command} (title)`);
try {
await m.reply(mess.wait);
const search = await yts(text);
const vid = search.videos[0];
if (!vid) return m.reply(mess.error);
const thumb = vid.thumbnail || `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`;
const icon = vid.author?.image || vid.author?.thumbnail || thumb;
const cap = `*⌗ YouTube Play*
> *Title:* ${vid.title}
> *Duration:* ${vid.timestamp}
> *Views:* ${String(vid.views)}
> *Author:* ${vid.author.name}

_Status: Downloading audio, please wait..._`;
await conn.sendExternalThumb(
m.chat,
{
text: cap,
title: vid.title,
body: `Channel: ${vid.author.name}`,
thumbUrl: thumb,
iconUrl: icon,
sourceUrl: vid.url,
},{ quoted: m });
const output = `./node_modules/.bin/${Date.now()}.mp3`;
const ytdlp = spawn("./node_modules/.bin/yt-dlp", [
"-f",
"bestaudio",
"--extract-audio",
"--audio-format",
"mp3",
"--no-playlist",
"--quiet",
"-o",
output,
vid.url,
]);
let stderr = "";
ytdlp.stderr.on("data", (data) => {
stderr += data.toString();
});
ytdlp.on("close", async (code) => {
try {
if (code === 0 && fs.existsSync(output)) {
await conn.sendMessage(
m.chat,
{
audio: fs.readFileSync(output),
mimetype: "audio/mpeg",
fileName: `${vid.title}.mp3`,
},
{ quoted: m }
);
if (fs.existsSync(output)) fs.unlinkSync(output);
return;
}
if (fs.existsSync(output)) fs.unlinkSync(output);
let dlUrl;
let res = await ytmp3(vid.url, { host: 'epsilon.epsiloncloud.org', origin: 'https://convertytmp3.org' });
if (!res.success) {
res = await ytmp3(vid.url, { host: 'gamma.gammacloud.net', origin: 'https://freeytmp3.org' });
}
if (res.success && res.downloadURL) {
dlUrl = res.downloadURL;
}
if (!dlUrl) return m.reply(mess.error);
await conn.sendMessage(
m.chat,
{
audio: { url: dlUrl },
mimetype: "audio/mpeg",
fileName: `${vid.title}.mp3`,
},
{ quoted: m }
);
} catch (err) {
if (fs.existsSync(output)) fs.unlinkSync(output);
m.reply(mess.error);
}
});
} catch (err) {
m.reply(mess.error);
}
};
//=================
handler.command = ["play"];
export default handler;
