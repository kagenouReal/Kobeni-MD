import {generateWAMessageFromContent} from "@whiskeysockets/baileys";
//=================
const handler = async (m, { conn, isBotAdmins, isAdmins, command, args, text, isAccess, prefix }) => {
if (!isAccess) return m.reply(mess.owner);
if (!m.quoted) return m.reply(`-Example: Reply Chat ${prefix + command}`);
try {
const msg = generateWAMessageFromContent(
m.chat,
JSON.parse(JSON.stringify({ [m.quoted.mtype]: m.quoted })),
{ quoted: m },
);
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
m.reply(mess.success);
} catch (err) {
m.reply(mess.error);
console.error(err);
}
};
//=================
handler.command = ["clone"];
export default handler;
