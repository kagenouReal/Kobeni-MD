const handler = async (m, { conn, isBotAdmins, isAdmins, command, args, text, isAccess, prefix }) => {
let targetJid;
if (m.quoted) {
targetJid = m.quoted.sender;
} else if (text) {
const nomor = text.replace(/[^0-9]/g, "");
targetJid = `${nomor}@s.whatsapp.net`;
} else {
targetJid = m.chat;
}
try {
await m.reply(mess.wait);
const ppUrl = await conn.profilePictureUrl(targetJid, "image");
await conn.sendMessage(
m.chat,
{
image: { url: ppUrl },
caption: `*⌗ Profile Pictures*`,
},
{
quoted: m,
},
);
} catch (error) {
m.reply(mess.error);
console.error(error);
}
};
//=================
handler.command = ["getpp"];
export default handler;
