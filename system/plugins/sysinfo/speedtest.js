import speedtest from "speedtest-net";
//=================
const handler = async (m, { conn, isAccess, command, prefix }) => {
if (!isAccess) return m.reply(mess.owner);
try {
await m.reply(mess.wait);  
let test;
let lastError;
for (let attempt = 0; attempt < 2; attempt++) {
try {
test = await speedtest({
acceptLicense: true,
acceptGdpr: true,
});
break;
} catch (error) {
lastError = error;
}
}
if (!test) throw lastError;
if (!test) return m.reply(mess.error);
const downloadSpeed = (test.download.bandwidth * 8 / 1000000).toFixed(2);
const uploadSpeed = (test.upload.bandwidth * 8 / 1000000).toFixed(2);
const replyText = `*⌗ Speedtest Result*
> *Download:* ${downloadSpeed} Mbps
> *Upload:* ${uploadSpeed} Mbps
> *Ping:* ${test.ping.latency.toFixed(2)} ms
> *Jitter:* ${test.ping.jitter.toFixed(2)} ms

*⌗ Server & ISP Info*
> *ISP Name:* ${test.isp || "-"}
> *Server Name:* ${test.server.name || "-"}
> *Location:* ${test.server.location || "-"}, ${test.server.country || "-"}
> *Host:* ${test.server.host || "-"}`;
m.reply(replyText.trim());
} catch (e) {
console.error(e);
if (e?.code === 110 || /timeout|timed out|cannot open socket/i.test(e?.message || "")) {
return m.reply("Speedtest timeout saat terhubung ke server pengujian. Coba lagi beberapa saat atau cek firewall/port jaringan server.");
}
m.reply(mess.error);
}
};
//=================
handler.command = ["speedtest"];
export default handler;
