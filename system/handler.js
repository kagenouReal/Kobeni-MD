//===============
import fs from "fs-extra";
import {
prepareWAMessageMedia,
downloadContentFromMessage,
generateWAMessageFromContent,
} from "@whiskeysockets/baileys";
import { exec } from "node:child_process";
import util from "node:util";
import crypto from "node:crypto";
const { createRequire } = await import("module");
import { addAccessUser, delAccessUser, setPublic, isPublic, get } from "./lib/access.js";
import { getGroupAdmins } from "./lib/smsg.js";
import { addBot, delBot, listBot } from "../outdex.js";
import { fileURLToPath } from "node:url";
import {
setKobeniStatus,
getKobeniStatus,
getChatClient,
chatClients
} from "./lib/kobeni.js";
//====================
export default async (conn, m) => {
try {
const currentFilePath = fileURLToPath(import.meta.url);
const body = m.body || "";
const prefix = global.prefix.find((p) => body.startsWith(p)) || "";
//====================
const routerCode = fs.readFileSync(currentFilePath, "utf-8");
const botNumberJid = conn.decodeJid(conn.user.id);
const botNumber = botNumberJid.replace(/[^0-9]/g, "");
const globalOwnerJid = `${global.owner}@s.whatsapp.net`;
const isMainBot = !conn.isClone;
const dbId = isMainBot ? "main" : botNumber;
const isKobeniActive = getKobeniStatus(dbId);
const isCallingKobeni = body.toLowerCase().includes("kobeni");
const mainData = get("main");
const mainAccess = mainData.access || [];
const isMainAccess =
m.sender === globalOwnerJid ||
(m.sender === botNumberJid && isMainBot) ||
mainAccess.some(
(u) => `${u.id.replace(/\D/g, "")}@s.whatsapp.net` === m.sender,
);
//====================
if (!prefix) {
if (!isKobeniActive || (!isCallingKobeni)) return;
}
let args = prefix
? body.slice(prefix.length).trim().split(/ +/).slice(1)
: body.trim().split(/ +/).slice(1);
let command = prefix
? body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase()
: body.trim().split(/ +/)[0].toLowerCase();
let text = args.join(" ");
//====================
const currentData = get(dbId);
const premuser = currentData.access || [];
const isAccess =
m.sender === botNumberJid ||
m.sender === globalOwnerJid ||
mainAccess.some((u) => `${u.id.replace(/\D/g, "")}@s.whatsapp.net` === m.sender) ||
premuser.some((u) => `${u.id.replace(/\D/g, "")}@s.whatsapp.net` === m.sender);
//====================
const groupMetadata = m.chat.endsWith("@g.us")
? await conn.groupMetadata(m.chat).catch((_e) => ({}))
: {};
const participants = groupMetadata?.participants ?? [];
const groupAdmins =
participants.length > 0 ? getGroupAdmins(participants) : [];
const isBotAdmins = groupAdmins.includes(botNumberJid);
const isAdmins = groupAdmins.includes(m.sender);
const groupOwner = groupMetadata.owner || groupAdmins[0] || "";
//====================
const isBotPublic = isPublic(dbId);
if (!isBotPublic && !isAccess) return;
const logId = isMainBot ? "MAIN" : botNumber;
console.log(
`\x1b[90m[ MSG - ${logId} ]\x1b[0m ` +
`\x1b[90m${m.body || m.mtype}\x1b[0m ` +
`Dari \x1b[90m${m.pushName}\x1b[0m`,
);
//====================
const lowerBody = body.toLowerCase().trim();
const containsKobeni = /\bkobeni\b/i.test(body);
const isCall = containsKobeni;
const isKobeniControlCmd = command === "kobeni" && ["on", "off", "reset"].includes(args[0]?.toLowerCase()); 
if (isKobeniActive && (isCall || !prefix) && !isKobeniControlCmd) {
let promptText = body.trim();
if (isCall) {
let cleanText = body;
if (prefix && cleanText.startsWith(prefix)) {
cleanText = cleanText.slice(prefix.length);
}
promptText = cleanText.replace(/\bkobeni\b/gi, "").replace(/\s+/g, " ").trim();
}
//====================
if (!promptText) {
if (isCall) {
return m.reply(`I-Iya? Ada yang bisa Kobeni bantu, ${m.pushName}?`);
}
} else {
await conn.sendPresenceUpdate("composing", m.chat);
try {
const userName = m.pushName || "User";
const commandListWithPerms = [];
for (const cmd in global.plugins) {
if (global.plugins[cmd].handler) {
const handlerStr = global.plugins[cmd].handler.toString();
const reqs = [];
if (handlerStr.includes("isAccess")) reqs.push("isAccess");
if (handlerStr.includes("isMainAccess")) reqs.push("isMainAccess");
if (handlerStr.includes("isAdmins")) reqs.push("isAdmins");
if (handlerStr.includes("isBotAdmins")) reqs.push("isBotAdmins");
if (handlerStr.includes("isMainBot")) reqs.push("isMainBot");
commandListWithPerms.push(`- ${cmd} (Syarat: ${reqs.length > 0 ? reqs.join(", ") : "Public"})`);
}
}
const caseRegex = /case\s+["']([^"']+)["']\s*:([\s\S]*?)(?=case\s+["']|default\s*:|$)/g;
let matchCase;
while ((matchCase = caseRegex.exec(routerCode)) !== null) {
const cmdName = matchCase[1];
const cmdCode = matchCase[2];
const reqs = [];
if (cmdCode.includes("isAccess")) reqs.push("isAccess");
if (cmdCode.includes("isMainAccess")) reqs.push("isMainAccess");
if (cmdCode.includes("isAdmins")) reqs.push("isAdmins");
if (cmdCode.includes("isBotAdmins")) reqs.push("isBotAdmins");
if (cmdCode.includes("isMainBot")) reqs.push("isMainBot");
if (cmdName !== "kobeni") {
commandListWithPerms.push(`- ${cmdName} (Syarat: ${reqs.length > 0 ? reqs.join(", ") : "Public"})`);
}
}
const client = getChatClient(m.sender);
const response = await client.chat(promptText, {
userName,
isAccess,
isMainAccess,
isAdmins,
isBotAdmins,
isMainBot,
commandListWithPerms
});
let replyText = response.text || "";
const sendKobeniReply = async (textMsg) => {
await conn.sendMessage(m.chat, {
text: textMsg
},{ quoted: {
key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: "0@s.whatsapp.net"},
message: { orderMessage: { orderId: "65bh4ddqr90", thumbnail: fs.readFileSync("./system/media/kobeni.jpg"), itemCount: 999, status: "INQUIRY", surface: "CATALOG", orderTitle: "product", message: "ᴋᴏʙᴇɴɪ ʏᴏɴᴏᴍᴏʀɪ", sellerJid: m.sender, token: "775BBQR0", totalAmount1000: 777, totalCurrencyCode: "MYR", contextInfo: { mentionedJid: [m.sender] } } }
} })
};
//=================
const cmdStart = replyText.lastIndexOf('[CMD:');
const cmdEnd = replyText.lastIndexOf(']');
if (cmdStart !== -1 && cmdEnd > cmdStart) {
const kobeniDialog = replyText.substring(0, cmdStart).trim();
const cmdFull = replyText.substring(cmdStart, cmdEnd + 1);
const cmdMatch = cmdFull.match(/\[CMD:\s*(\w+)(?:\s+([\s\S]*?))?\s*\]$/);

if (cmdMatch) {
const cmdName = cmdMatch[1].toLowerCase().trim();
const cmdArgsText = (cmdMatch[2] || "").trim();
if (kobeniDialog) {
await sendKobeniReply(kobeniDialog);
}
const fakeBody = `${prefix || "."}${cmdName} ${cmdArgsText}`.trim();
const fakeArgs = cmdArgsText ? cmdArgsText.split(/\n/).filter(l => l.trim()) : [];
const fakeM = {
...m,
body: fakeBody,
text: cmdArgsText,
args: fakeArgs,
query: cmdArgsText,
};
const targetPlugin = global.plugins[cmdName];
if (targetPlugin) {
await targetPlugin.handler(fakeM, {
conn,
m: fakeM,
isBotAdmins,
isAdmins,
command: cmdName,
args: fakeArgs,
text: cmdArgsText,
isAccess,
prefix: prefix || ".",
});
return;
} else {
m.body = fakeBody;
m.text = cmdArgsText;
m.args = fakeArgs;
command = cmdName;
args = fakeArgs;
text = cmdArgsText;
}
} else {
if (replyText) {
return await sendKobeniReply(replyText);
}
}
} else {
if (replyText) {
return await sendKobeniReply(replyText);
} else {
return m.reply("Maaf, Kobeni bingung mau jawab apa..");
}
}
} catch (err) {
console.error("Error Kobeni Agent:", err);
return m.reply("A-Aduh, sepertinya otak Kobeni sedang konslet...");
}
}
};
//====================
const pluginData = global.plugins[command];
if (pluginData) {
await pluginData.handler(m, {
conn,
m,
isBotAdmins,
isAdmins,
command,
args,
text,
isAccess,
prefix,
});
return;
}
//====================
switch (command) {
//====================
case "kobeni": {
const mode = (args[0] || "").toLowerCase().trim();
if (!mode) {
const status = isKobeniActive ? "ON" : "OFF";
return m.reply(
`-Status Saat Ini: *${status}*\n\n` +
`Format Penggunaan:\n` +
`> ${prefix + command} on\n` +
`> ${prefix + command} off\n` +
`> ${prefix + command} reset`
);
}
if (mode === "on") {
if (!isAccess) return m.reply(mess.owner);
setKobeniStatus(true, dbId); 
return m.reply(mess.success);
} 
if (mode === "off") {
if (!isAccess) return m.reply(mess.owner);
setKobeniStatus(false, dbId); 
return m.reply(mess.success);
}
if (mode === "reset") {
if (chatClients && chatClients.has(m.sender)) {
chatClients.get(m.sender).reset();
}
return m.reply(mess.success);
}
return m.reply(mess.wrong);
}
break;
//=================
case "menu":
case "smenu":
case "allmenu": {
const categories = {
owner: ["kobeni", "public", "self", "addaccess", "delaccess", "listaccess", "addbot", "delbot", "listbot", "exec", "eval"]
};
for (const cmd in global.plugins) {
const cat = (global.plugins[cmd].category || "plugins").toLowerCase();
if (!categories[cat]) categories[cat] = [];
if (!categories.owner.includes(cmd)) {
categories[cat].push(cmd);
}
}
let totalCmds = 0;
for (const cat in categories) totalCmds += categories[cat].length;
const uptime = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;
const statusBot = isPublic(dbId) ? "Public" : "Self"; 
let captionText = "";
if (command === "menu") {
let catList = Object.keys(categories).map(k => `> │ ◦ ${prefix}smenu ${k}`).join("\n");
captionText = (`> ┌ *Bot Info*
> │ ◦ Uptime: ${uptime}
> │ ◦ Mode: ${statusBot}
> │ ◦ Total: ${totalCmds} Cmds
> └ 

> ┌ *User Info*
> │ ◦ Sender: ${m.sender.replace(/\D/g, "")}
> │ ◦ Access: ${isAccess ? "True" : "False"}
> └ 

> ┌ *Categories*
${catList}
> │ ◦ ${prefix}allmenu
> └ `);
} else if (command === "smenu") {
const category = (args[0] || "owner").toLowerCase();
const commandsList = categories[category];
if (!commandsList) return m.reply(mess.wrong);
captionText = (`> ┌ *Category*: ${category.charAt(0).toUpperCase() + category.slice(1)}
> │ ◦ Total: ${commandsList.length} Cmds
> └ 

> ┌ *Commands*
${commandsList.map(cmd => `> │ ◦ ${prefix}${cmd}`).join("\n")}
> └ `);
} else if (command === "allmenu") {
let allCatText = "";
for (const cat in categories) {
allCatText += `> ┌ *${cat.charAt(0).toUpperCase() + cat.slice(1)}*\n${categories[cat].map(cmd => `> │ ◦ ${prefix}${cmd}`).join("\n")}\n> └ \n\n`;
}
captionText = (`> ┌ *All Menu*
> │ ◦ Total: ${totalCmds} Cmds
> └ \n\n${allCatText.trim()}`);
}
let finalText = `https://github.com/kagenouReal/Kobeni-MD
${captionText}`;
let jpegBuf = "";
let thumbData = {}, iconData = {};
let tasks = [];
tasks.push(
prepareWAMessageMedia({ image: { url: "./system/media/mainthumb.jpg" } }, { upload: conn.waUploadToServer, mediaTypeOverride: "thumbnail-link" })
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
tasks.push(
prepareWAMessageMedia({ image: { url: "./system/media/iconthumb.png" } }, { upload: conn.waUploadToServer, mediaTypeOverride: "thumbnail-link" })
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
await Promise.all(tasks);
let content = {
extendedTextMessage: {
text: finalText,
matchedText: "https://github.com/kagenouReal/Kobeni-MD",
description: "ɢɪᴛʜᴜʙ.ᴄᴏᴍ/ᴋᴀɢᴇɴᴏᴜʀᴇᴀʟ",
previewType: 1,
renderLargerThumbnail: true,
jpegThumbnail: jpegBuf,
...thumbData,
...iconData,
contextInfo: {
stanzaId: m.key.id,
participant: m.key.participant || m.key.remoteJid,
quotedMessage: m.message 
}
},
messageContextInfo: { messageSecret: crypto.randomBytes(32) }
};
await conn.relayMessage(m.chat, content, { quoted: m });
break;
}
//====================
case "addbot": {
if (!isMainBot) return m.reply(mess.owner);
if (!isMainAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (nomor)`);
const number = text.replace(/[^0-9]/g, "");
if (number === botNumber) return m.reply(mess.owner);
await m.reply(mess.wait);
const result = await addBot(number);
if (result.error) return m.reply(mess.error);
if (result.isNew) {
return m.reply(`*⌗ ${("Multi Device")}*
> ${("Number")}: ${(result.id || "-")}
> ${("Pairing Code")}: ${(result.code || "-")}`);
}
m.reply(mess.error);
}
break;
//====================
case "delbot": {
if (!isMainBot) return m.reply(mess.owner);
if (!isMainAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (nomor)`);
const id = text.replace(/[^0-9]/g, "");
delBot(id);
m.reply(mess.success);
}
break;
//====================
case "listbot": {
if (!isMainBot) return m.reply(mess.owner);
if (!isMainAccess) return m.reply(mess.owner);
const list = listBot();
if (!list.length) return m.reply(mess.wrong);
let txt = `*⌗ ${("List connected devices")}*\n`;
for (const v of list) {
txt += `> ${("ID")}: ${v}\n`;
}
m.reply(txt);
}
break;
//====================
case "exec": {
if (!isMainBot) return m.reply(mess.owner);
if (!isMainAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (ls -l)`);
exec(text, (err, stdout, stderr) => {
if (err) {
return m.reply(`-Exec Error:\n${stderr.trim() || err.message}`);
}
m.reply(stdout || stderr || "");
});
}
break;
//====================
case "eval": {
if (!isMainBot) return m.reply(mess.owner);
if (!isMainAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (Code)`);
try {
const require = createRequire(import.meta.url);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const fn = new AsyncFunction(
"m", "conn", "sock", "require", "util",
`return (async () => { ${text} })()`
);
let result = await fn(m, conn, conn, require, util);
if (result === undefined || result === null) {
result = String(result);
} else if (typeof result !== "string") {
result = util.inspect(result, { depth: 4 });
}
await m.reply(result || "");
} catch (err) {
await m.reply(`Error:\n${String(err)}`);
}
}
break;
//====================
case "public":
{
if (!isAccess) return m.reply(mess.owner);
if (isPublic(dbId)) return m.reply(mess.wrong);
setPublic(true, dbId);
m.reply(mess.success);
}
break;
//===================
case "self":
{
if (!isAccess) return m.reply(mess.owner);
if (!isPublic(dbId)) return m.reply(mess.wrong);
setPublic(false, dbId);
m.reply(mess.success);
}
break;
//====================
case "addaccess":
{
if (!isAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (nomor)`);
const user = text.replace(/[^\d]/g, "");
if (currentData.access.some((u) => u.id === user))
return m.reply(mess.wrong);
addAccessUser(user, dbId);
m.reply(mess.success);
}
break;
//====================
case "delaccess":
{
if (!isAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (nomor)`);
const user = text.replace(/[^\d]/g, "");
if (!currentData.access.some((u) => u.id === user))
return m.reply(mess.wrong);
delAccessUser(user, dbId);
m.reply(mess.success);
}
break;
//====================
case "listaccess":
{
if (!isAccess) return m.reply(mess.owner);
const list = currentData.access;
if (!list || list.length === 0) {
return m.reply(mess.wrong);
}
let teks = `*⌗ ʟɪsᴛ ᴀᴄᴄᴇss*\n`;
list.forEach((u, i) => {
teks += `> ${i + 1}: ${u.id}\n`;
});
m.reply(teks);
}
break;
//====================
case "getpl": {
if (!isMainAccess) return m.reply(mess.owner);
if (!text) return m.reply(`-Example: ${prefix + command} (pl)`);
const cmdName = text.toLowerCase();
const plugData = global.plugins[cmdName];
if (!plugData) return m.reply(mess.wrong);
const filePath = `./system/plugins/${plugData.category}/${plugData.name}`;
if (!(await fs.pathExists(filePath))) return m.reply(mess.wrong);
const codeUtama = await fs.readFile(filePath, "utf-8");
const regex = /(`(?:\\`|[^`])*`|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')|(\/\/.*|\/\*[\s\S]*?\*\/)|(\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|true|false|null|undefined)\b)|([a-zA-Z_$][a-zA-Z0-9_$]*)|([\s\S])/g;
const blocks = [];
let match;
while ((match = regex.exec(codeUtama)) !== null) {
if (match[1]) blocks.push({ highlightType: 3, codeContent: match[1] });
else if (match[2]) blocks.push({ highlightType: 5, codeContent: match[2] });
else if (match[3]) blocks.push({ highlightType: 1, codeContent: match[3] });
else if (match[4]) blocks.push({ highlightType: 2, codeContent: match[4] });
else if (match[5]) {
const last = blocks[blocks.length - 1];
if (last && last.highlightType === 0) last.codeContent += match[5];
else blocks.push({ highlightType: 0, codeContent: match[5] });
}
}
let teks = `*⌗ PLUGIN VIEWER*\n`;
teks += `> File: ${plugData.name}\n`;
teks += `> Category: ${plugData.category}`;
const msgData = {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2,
botMetadata: {
richResponseSourcesMetadata: { sources: [] }
}
},
botForwardedMessage: {
message: {
richResponseMessage: {
messageType: 1,
submessages: [
{
messageType: 2,
messageText: teks
},
{
messageType: 5,
codeMetadata: {
codeLanguage: "javascript",
codeBlocks: blocks
}
}
],
contextInfo: {
forwardingScore: 1,
isForwarded: true,
forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
forwardOrigin: 4,
stanzaId: m.key.id,
participant: m.sender,
quotedMessage: m.message
}
}
}
}
};
const msg = generateWAMessageFromContent(
m.chat,
msgData,
{
userJid: conn.user?.id
}
);
await conn.relayMessage(
m.chat,
msg.message,
{
messageId: msg.key.id
}
);
break;
}
//====================
default:
break;
}
} catch (e) {
console.error(e);
}
};
//====================
