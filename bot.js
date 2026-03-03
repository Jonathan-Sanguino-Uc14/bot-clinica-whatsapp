// bot.js — Versión con IA integrada
const { CLINICA, HORARIOS } = require("./datos");
const { guardarCita, getCita, cancelarCita, getSesion, setSesion, deleteSesion } = require("./db");
const { procesarConIA, limpiarHistorial } = require("./ia");

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
async function procesarMensaje(telefono, texto, sock) {
  const msg = texto.trim().toLowerCase();

  // Comando para ver cita actual
  if (msg === "micita") {
    const cita = await getCita(telefono);
    if (cita) {
      return enviar(sock, telefono,
        `📅 *Tu cita actual:*\n\n` +
        `👤 ${cita.nombre}\n` +
        `📆 ${cita.dia} a las ${cita.hora}\n` +
        `🩺 ${cita.motivo}`
      );
    } else {
      return enviar(sock, telefono,
        `No tienes citas reservadas. Escríbeme para agendar una 😊`
      );
    }
  }

  // Obtener cita actual del paciente para contexto
  const citaActual = await getCita(telefono);

  // Enviar a la IA
  const { texto: respuestaIA, accion } = await procesarConIA(
    telefono, texto, HORARIOS, citaActual
  );

  // ── Procesar acción si la IA detectó una ──
  if (accion) {

    if (accion.accion === "confirmar") {
      // Guardar cita en Supabase
      await guardarCita(telefono, {
        nombre: accion.nombre,
        dia:    accion.dia,
        hora:   accion.hora,
        motivo: accion.motivo
      });

      limpiarHistorial(telefono);

      return enviar(sock, telefono,
        `✅ *¡Cita confirmada!* 🎉\n\n` +
        `Te esperamos el *${accion.dia} a las ${accion.hora}* 🏥\n\n` +
        `📍 *Dirección:* ${CLINICA.direccion}\n` +
        `📞 *Dudas:* ${CLINICA.telefono}\n\n` +
        `_Recibirás un recordatorio el día anterior._`
      );
    }

    if (accion.accion === "cancelar") {
      await cancelarCita(telefono);
      limpiarHistorial(telefono);

      return enviar(sock, telefono,
        `❌ Tu cita ha sido cancelada.\n\nEscríbeme cuando quieras agendar de nuevo 😊`
      );
    }

    if (accion.accion === "ver_cita") {
      const cita = await getCita(telefono);
      if (cita) {
        return enviar(sock, telefono,
          `📅 *Tu cita actual:*\n\n` +
          `👤 ${cita.nombre}\n` +
          `📆 ${cita.dia} a las ${cita.hora}\n` +
          `🩺 ${cita.motivo}`
        );
      }
    }
  }

  // Respuesta normal de la IA
  await enviar(sock, telefono, respuestaIA);
}

// ── Helper para enviar mensajes ──
async function enviar(sock, telefono, texto) {
  await sock.sendMessage(telefono, { text: texto });
}

module.exports = { procesarMensaje };
