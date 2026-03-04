// index.js — Conecta con WhatsApp y escucha mensajes
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const { Boom }           = require("@hapi/boom");
const qrcode             = require("qrcode-terminal");
const pino               = require("pino");
const { procesarMensaje } = require("./bot");
const { inicializarDB, getCitasPendientesRecordatorio, marcarRecordatorioEnviado } = require("./db");
function iniciarRecordatorios(sock) {
  setInterval(async () => {
    const citas = await getCitasPendientesRecordatorio();
    for (const cita of citas) {
      await sock.sendMessage(cita.telefono, {
        text:
          `⏰ *Recordatorio de cita*\n\n` +
          `Hola *${cita.nombre}*, te recordamos que mañana tienes cita:\n\n` +
          `🕐 *Hora:* ${cita.hora}\n` +
          `🩺 *Motivo:* ${cita.motivo}\n\n` +
          `📍 Clínica Dr. García — Calle Principal 123\n\n` +
          `Para cancelar escribe *cancelar*`
      });
      await marcarRecordatorioEnviado(cita.id);
      console.log(`⏰ Recordatorio enviado a ${cita.nombre}`);
    }
  }, 60 * 60 * 1000); // Revisa cada hora
}
async function iniciarBot() {
  // Guarda la sesión para no escanear QR cada vez
  await inicializarDB();
  const { state, saveCreds } = await useMultiFileAuthState("./sesion_whatsapp");
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth:   state,
    logger: pino({ level: "silent" }), // Silencia logs internos
    printQRInTerminal: false,           // Muestra QR en consola
  });

  // ── Guardar credenciales cuando se actualicen ──
  sock.ev.on("creds.update", saveCreds);

  // ── Manejar conexión / desconexión ──
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {

    if (qr) {
  console.log("QR CODE BASE64:", qr);
}

   if (connection === "open") {
  console.log("✅ Bot conectado a WhatsApp!");
  console.log("💬 Esperando mensajes...\n");
  iniciarRecordatorios(sock); // ← agregar esta línea
}

    if (connection === "close") {
      const debeReconectar =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (debeReconectar) {
        console.log("🔄 Reconectando...");
        iniciarBot(); // Reintentar conexión automáticamente
      } else {
        console.log("🔴 Sesión cerrada. Borra la carpeta 'sesion_whatsapp' y vuelve a correr.");
      }
    }
  });

  // ── Escuchar mensajes entrantes ──
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return; // Solo mensajes nuevos

    for (const msg of messages) {
      // Ignorar mensajes propios y de grupos
      if (msg.key.fromMe)                    continue;
      if (msg.key.remoteJid.endsWith("@g.us")) continue;

      const telefono = msg.key.remoteJid; // ej: 521234567890@s.whatsapp.net
      const texto    = msg.message?.conversation
                    || msg.message?.extendedTextMessage?.text
                    || "";

      if (!texto) continue; // Ignorar mensajes sin texto (fotos, audios...)

      console.log(`📨 Mensaje de ${telefono}: ${texto}`);

      try {
        await procesarMensaje(telefono, texto, sock);
      } catch (err) {
        console.error("Error procesando mensaje:", err);
      }
    }
  });
}

// ── Iniciar ──
iniciarBot();