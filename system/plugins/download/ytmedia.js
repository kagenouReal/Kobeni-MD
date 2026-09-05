import axios from "axios";

async function downloadApiMedia(url, config) {
const headers = {
accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
"accept-language": "en-US,en;q=0.9",
priority: "u=0, i",
referer: `${config.origin}/`,
"sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
"sec-ch-ua-mobile": "?0",
"sec-ch-ua-platform": '"Windows"',
"sec-fetch-dest": "document",
"sec-fetch-mode": "navigate",
"sec-fetch-site": "cross-site",
"upgrade-insecure-requests": "1",
"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
};
for (let attempt = 0; attempt < 3; attempt++) {
const response = await axios.get(url, {headers, responseType: "arraybuffer", timeout: 120000});
const data = Buffer.from(response.data);
const body = data.toString("utf8");
if (!/^\s*\{/.test(body) || !/"(?:error|progress)"/.test(body)) {
if (data.length === 0) throw new Error("API returned an empty media response");
return data;
}
if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 2000));
}
throw new Error("API returned an error instead of media");
}

async function convertWithApi(url, config, format) {
const headers = {
"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36",
"origin": config.origin,
"referer": `${config.origin}/`,
"accept": "*/*",
"accept-language": "en-US,en;q=0.9",
priority: "u=1, i",
"sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
"sec-ch-ua-mobile": "?0",
"sec-ch-ua-platform": '"Windows"',
"sec-fetch-dest": "empty",
"sec-fetch-mode": "cors",
"sec-fetch-site": "cross-site",
};
try {
const idMatch = url.match(/(?:v=|\/embed\/|\/11\/|\/v\/|https:\/\/youtu\.be\/)([^"&?\/\s]{11})/);
if (!idMatch) throw new Error("Invalid YouTube URL");
const videoId = idMatch[1];
const buildDownloadUrl = (downloadUrl) => {
const separator = downloadUrl.includes("?") ? "&" : "?";
const referrer = config.downloadReferrer ? `&r=${encodeURIComponent(config.downloadReferrer)}` : "";
return `${downloadUrl}${separator}v=${videoId}&f=${format}${referrer}`;
};
const timestamp = Date.now();
const requestConfig = {headers, timeout: 30000};
const auth = (await axios.get(`https://${config.host}/api/v1/auth?_=${timestamp}`, requestConfig)).data;
if (auth.err !== 0 || !auth.key) throw new Error("API auth failed");
const init = (await axios.get(`https://${config.host}/api/v1/init?_=${timestamp + 100}`, {
...requestConfig,
headers: {...headers, authorization: `Bearer ${auth.key}`},
})).data;
if (!init.convertURL || init.error !== "0") throw new Error("API init failed");
const first = (await axios.get(`${init.convertURL}&v=${videoId}&f=${format}&_=${timestamp + 200}`, requestConfig)).data;
if (first.progressURL) {
let completed = false;
for (let attempt = 0; attempt < 25; attempt++) {
const progressUrl = `${first.progressURL}${first.progressURL.includes("?") ? "&" : "?"}_=${timestamp + 300 + attempt}`;
const progress = (await axios.get(progressUrl, requestConfig)).data;
if (progress.error && progress.error !== 0) throw new Error(`API conversion failed: ${progress.error}`);
if (progress.progress >= 1) {
completed = true;
break;
}
await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!completed) throw new Error("API conversion timed out");
}
if (first.downloadURL) {
return {success: true, title: first.title || "YouTube", downloadURL: buildDownloadUrl(first.downloadURL)};
}

if (first.redirect === 1 && first.redirectURL) {
let redirectUrl = first.redirectURL.replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
if (!redirectUrl.includes("_=")) redirectUrl += `&_=${timestamp + 300}`;
const second = (await axios.get(redirectUrl, requestConfig)).data;
if (second.error === 0 && second.downloadURL) {
return {success: true, title: second.title || "YouTube", downloadURL: buildDownloadUrl(second.downloadURL)};
}
}
throw new Error("No download URL");
} catch (error) {
return {success: false, error: error.message};
}
}

const handler = async (m, {conn, command, text, prefix}) => {
if (!text) return m.reply(`-Example: ${prefix + command} (YouTube URL)`);
const format = command === "ytmp4" ? "mp4" : "mp3";
try {
await m.reply(mess.wait);
const configs = [
{label: "Gamma (ytmp3.gl)", host: "gamma.gammacloud.net", origin: "https://ytmp3.gl", downloadReferrer: "ytmp3.gl"},
{label: "Epsilon (convertytmp3.org)", host: "epsilon.epsiloncloud.org", origin: "https://convertytmp3.org", downloadReferrer: "convertytmp3.org"},
];
for (const config of configs) {
const result = await convertWithApi(text.trim(), config, format);
if (!result.success || !result.downloadURL) {
console.error(`[${command}] API ${config.host}:`, result.error || "missing download URL");
continue;
}
try {
const media = await downloadApiMedia(result.downloadURL, config);
const caption = `Source: ${config.label}`;
await conn.sendMessage(m.chat, format === "mp3"
? {audio: media, mimetype: "audio/mpeg", fileName: `${result.title}.mp3`, caption}
: {video: media, mimetype: "video/mp4", fileName: `${result.title}.mp4`, caption}, {quoted: m});
return;
} catch (error) {
console.error(`[${command}] API ${config.host}:`, error.message);
}
}
m.reply(mess.error);
} catch (error) {
console.error(`[${command}]`, error);
m.reply(mess.error);
}
};

handler.command = ["ytmp3", "ytmp4"];
export default handler;
