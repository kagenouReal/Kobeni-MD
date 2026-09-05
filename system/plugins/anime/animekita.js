import axios from "axios";
//=================
async function scrapeAnimekita(keyword) {
try {
const safe = (v, def = null) =>
v === undefined || v === null || v === "" ? def : v;
const random = (arr) =>
arr[Math.floor(Math.random() * arr.length)];
const searchRes = await axios.get(
`https://apps.animekita.org/api/v1.2.5/search.php?keyword=${encodeURIComponent(keyword)}`,
{
headers: {
"User-Agent": "Dart/3.9 (dart:io)",
Accept: "application/json"
},
timeout: 20000
}
);
const results =
searchRes.data?.data?.[0]?.result || [];
if (!results.length) {
throw new Error("Anime tidak ditemukan");
}
const anime = random(results);
const seriesRes = await axios.post(
`https://apps.animekita.org/api/v1.2.5/series.php?url=${anime.url}`,
{
get: "top",
post_type: "1",
post_id: anime.url
},
{
headers: {
"User-Agent": "Dart/3.9 (dart:io)",
Accept: "application/json"
},
timeout: 20000
}
);
const detail =
seriesRes.data?.data?.[0] || {};
const chapters =
detail.chapter || [];
const result = {
meta: {
id: anime.id,
title: safe(
anime.judul,
detail.judul
),
cover: safe(
anime.cover,
detail.cover
),
status: safe(
detail.status,
anime.status
),
rating: safe(
detail.rating,
anime.rating || anime.score
),
studio: safe(
detail.author,
detail.studio
),
release: safe(
detail.published,
detail.rilis
),
genre:
anime.genre ||
detail.genre ||
[],
sinopsis: safe(
anime.sinopsis,
detail.sinopsis
),
total_episode:
chapters.length
},
episodes: []
};
result.episodes =
await Promise.all(
chapters.map(
async (ep) => {
try {
const streamRes =
await axios.post(
`https://apps.animekita.org/api/v1.2.5/series/episode/data.php?url=${ep.url}`,
{
post_type: "2",
post_id: ep.url,
series_id:
detail.series_id,
series_url:
`${detail.series_id}/`,
episode: ep.ch
},
{
headers: {
"User-Agent":
"Flutter/2.5.3",
Accept:
"application/json",
"content-type":
"text/plain; charset=utf-8"
},
timeout: 20000
}
);
return {
episode: ep.ch,
url: ep.url,
streams:
streamRes.data?.data?.[0]?.streams || {}
};
} catch {
return {
episode: ep.ch,
url: ep.url,
streams: {}
};
}
}
)
);
return result;
} catch (err) {
console.error(
"AnimeKita:",
err?.response?.data ||
err.message
);
return {
error: true,
message:
err?.message ||
"Request failed"
};
}
}
//=================
const handler = async (
m,
{ conn, text, prefix, command }
) => {
if (!text) {
return m.reply(
`-Example: ${prefix + command} (title)`
);
}
try {
await m.reply(mess.wait);
const res =
await scrapeAnimekita(
text.trim()
);
if (
!res ||
res.error ||
!res.episodes
) {
return m.reply(mess.error);
}
const mta =
res.meta || {};
let caption =
`*⌗ Anime Kita Download*\n`;
caption +=
`> *Title:* ${mta.title || "-"}\n`;
caption +=
`> *Status:* ${mta.status || "-"}\n`;
caption +=
`> *Episodes:* ${mta.total_episode || "-"}\n`;
caption +=
`> *Studio:* ${mta.studio || "-"}\n`;
caption +=
`> *Genre:* ${
Array.isArray(mta.genre)
? mta.genre.join(", ")
: mta.genre || "-"
}\n`;
caption +=
`> *Rating:* ${mta.rating || "-"}\n\n`;
caption +=
`*⌗ Download Links*`;
for (
let i = 0;
i < res.episodes.length;
i++
) {
const ep =
res.episodes[i];
const epName =
ep.episode ||
(ep.url?.toLowerCase().includes("ova")
? "OVA"
: "Special");
caption +=
`\n\n> *Episode ${epName}*`;
if (
ep.streams &&
Object.keys(
ep.streams
).length > 0
) {
for (
const [reso, list]
of Object.entries(
ep.streams
)
) {
if (
Array.isArray(list) &&
list.length > 0 &&
list[0]?.link
) {
const safeLink =
encodeURI(
list[0].link
);
caption +=
`\n> *${reso}:* ${safeLink}`;
}
}
} else {
caption +=
`\n> *Link:* -`;
}
}
let img;
try {
if (!mta.cover) {
throw new Error(
"No cover"
);
}
const imgRes =
await axios.get(
mta.cover,
{
responseType:
"arraybuffer",
headers: {
"User-Agent":
"Mozilla/5.0"
},
timeout: 20000
}
);
img = Buffer.from(
imgRes.data
);
} catch {
img =
mta.cover
? {url: mta.cover}
: null;
}
if (img) {
await conn.sendMessage(
m.chat,
{
image: img,
caption:
caption.trim()
},
{
quoted: m
}
);
} else {
await conn.sendMessage(
m.chat,
{
text:
caption.trim()
},
{
quoted: m
}
);
}
} catch (err) {
console.error(
"Handler:",
err.message
);
m.reply(mess.error);
}
};
//=================
handler.command = ["animekita"];
export default handler;