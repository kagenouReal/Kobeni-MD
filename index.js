import './system/setting.js'
import makeWASocket, {useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion} from "@whiskeysockets/baileys";
import pino from "pino";
import {Boom} from "@hapi/boom";
import readline from "readline";
import fs from "node:fs";
import path from "node:path";
import {startAllBot, reloadOutdex} from "./outdex.js";
import {smsg} from "./system/lib/smsg.js";
// ====================
process.on("uncaughtException", (err) => {
console.error(err.message);
});
process.on("unhandledRejection", (err) => {
console.error(err.message);
});
process.on("SIGINT", () => {
console.log("\n[ SYSTEM ] Stopping bot...");
process.exit(0);
});
process.on("SIGTERM", () => {
console.log("\n[ SYSTEM ] Stopping bot...");
process.exit(0);
});
// ====================
global.plugins = {};
const question = (text) =>
new Promise((res) => {
const rl = readline.createInterface({
input: process.stdin,
output: process.stdout,
});
rl.question(text, (ans) => {
rl.close();
res(ans);
});
});
// ====================
async function loadPlugins() {
const pluginDir = path.join(import.meta.dirname, "system", "plugins");
global.plugins = {};
try {
const folders = (await fs.promises.readdir(pluginDir, { withFileTypes: true }))
.filter((dirent) => dirent.isDirectory())
.map((dirent) => dirent.name);

await Promise.all(folders.map(async (folder) => {
const folderPath = path.join(pluginDir, folder);
const files = (await fs.promises.readdir(folderPath, { withFileTypes: true }))
.filter((dirent) => dirent.isFile() && dirent.name.endsWith(".js"))
.map((dirent) => dirent.name);

await Promise.all(files.map(async (file) => {
const filePath = path.join(folderPath, file);
try {
const plugin = await import(`file://${filePath}?t=${Date.now()}`);
const pluginObj = plugin.default || plugin;
const handlerFunc = typeof pluginObj === "function" ? pluginObj : pluginObj?.handler;
const commands = pluginObj?.command;
if (typeof handlerFunc === "function" && Array.isArray(commands)) {
const categoryName = folder.toLowerCase();
for (const cmd of commands) {
global.plugins[cmd.toLowerCase()] = {
name: file,
category: categoryName,
handler: handlerFunc,
};
}
}
} catch (e) {
console.error(`Error loading plugin ${file}:`, e);
}
}));
}));
console.log(`[ PLUGIN ] Total ${Object.keys(global.plugins).length} commands loaded.`);
} catch (err) {
console.error("Error reading plugin directory:", err);
}
}
// ====================
let mainHandler;
async function loadMainHandler() {
const mod = await import(`./system/handler.js?t=${Date.now()}`);
mainHandler = mod.default;
}
await loadMainHandler();
await reloadOutdex(); 
// ====================
async function SartMBG() {
const { state, saveCreds } = await useMultiFileAuthState(`./session`);
const { version, isLatest } = await fetchLatestBaileysVersion();
const connectionOptions = {
version,
keepAliveIntervalMs: 30000,
printQRInTerminal: !global.usePairingCode,
logger: pino({ level: "fatal" }),
auth: state,
browser: ["Mac OS", "Safari", "17.0"],
markOnlineOnConnect: false,
generateHighQualityLinkPreview: false,
getMessage: async (_key) => {
return { conversation: "kyahh" };
},
};
const conn = makeWASocket(connectionOptions);
const mod = await import(`./system/lib/pathconn.js?t=${Date.now()}`);
mod.default(conn);
// ====================
if (global.usePairingCode && !conn.authState.creds.registered) {
let targetNumber; 
if (global.useOwnerToPair) {
targetNumber = global.owner;
console.log(`-[ Auto-Pairing using Owner Number: ${targetNumber} ]`);
await new Promise(resolve => setTimeout(resolve, 4000)); 
} else {
const phone = await question("-[ Enter Your Phone Number ] : ");
targetNumber = phone.trim();
}
const code = await conn.requestPairingCode(
targetNumber,
global.pairingcode
);
console.log(`[ Your Pairing Code ] : ${code} `);
}
// ====================
conn.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
if (connection === "open") return console.log("-[ WhatsApp Connected! ]")
if (connection !== "close") return
let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
console.log(`Connection closed: ${reason}`)
if (reason === DisconnectReason.loggedOut) {
let sess = path.join(import.meta.dirname, "./session")
if (fs.existsSync(sess)) fs.rmSync(sess, { recursive: true, force: true })
process.exit()
} else {
setTimeout(SartMBG, 3000)
}
})
// ====================
conn.ev.on("messages.upsert", async ({ messages, type }) => {
if (type !== "notify") return;
const msg = messages[0];
if (!msg?.message || msg.key?.remoteJid === "status@broadcast") return;
try {
const m = smsg(conn, msg);
await mainHandler(conn, m, msg); 
} catch (e) {
console.error(e);
}
});
// ====================
conn.ev.on("creds.update", saveCreds);
return conn;
}
// ====================
process.stdout.write("\x1Bc");
console.log(`
╭╮╭━┳━━━━┳━━╮╭━━━┳━╮╱╭╮╭━━╮
┃┃┃╭┫╭╮╭╮┃╭╮┃┃╭━━┫┃╰╮┃┃╭┫┣╮
┃╰╯╯┃╭━━╮┃╰╯╰┫╰━━┫╭╮╰╯┃┃┃┃┃
┃╭╮┃┃┃┃┃┃┃╭━╮┃╭━━┫┃╰╮┃┃╱┃┃╱
┃┃┃╰┫╰━━╯┃╰━╯┃╰━━┫┃╱┃┃┃╰┫┣╯
╰╯╰━┻━━━━┻━━━┻━━━┻╯╱╰━╯╰━━╯`);
// ====================
await loadPlugins();
const pluginDir = path.join(import.meta.dirname, "system", "plugins");
let debounceTimeout;
fs.watch(pluginDir, { recursive: true }, (_eventType, filename) => {
if (!filename) return;
if (filename.endsWith(".js")) {
clearTimeout(debounceTimeout);
debounceTimeout = setTimeout(async () => {
await loadPlugins(); 
}, 500);
}
});
const waFile = path.join(import.meta.dirname, "system", "handler.js");
fs.watchFile(waFile, async () => {
console.log("[ WATCHER ] handler.js reloaded.");
await loadMainHandler(); 
await reloadOutdex();
});
// ====================
SartMBG();
startAllBot();
