// bot.js — Versión con IA integrada y mejorada
const { CLINICA, HORARIOS } = require("./datos");
const { guardarCita, getCita, cancelarCita, getCliente, upsertCliente } = require("./db");
const { procesarConIA, limpiarHistorial } = require("./ia");

const conversacionesCerradas = new Set();

async function procesarMensaje(telefono, texto, sock) {
  // Si la conversación fue cerrada recientemente, ignorar
  if (conversacionesCerradas.has(telefono)) return;

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

  const citaActual = await getCita(telefono);
  const cliente    = await getCliente(telefono);

  const onInactivo = async (tel, mensaje) => {
    await enviar(sock, tel, mensaje);
  };

  const { texto: respuestaIA, accion } = await procesarConIA(
    telefono, texto, HORARIOS, citaActual, onInactivo, cliente
  );

  if (accion) {

    if (accion.accion === "confirmar") {
      await guardarCita(telefono, {
        nombre: accion.nombre,
        dia:    accion.dia,
        hora:   accion.hora,
        motivo: accion.motivo
      });

      await upsertCliente(telefono, {
        nombre: accion.nombre,
        dia:    accion.dia,
        hora:   accion.hora
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
      } else {
        return enviar(sock, telefono,
          `No tienes citas reservadas. Escríbeme para agendar una 😊`
        );
      }
    }

    if (accion.accion === "salir") {
      limpiarHistorial(telefono);
      conversacionesCerradas.add(telefono);

      setTimeout(() => {
        conversacionesCerradas.delete(telefono);
      }, 30 * 1000);

      return enviar(sock, telefono,
        `¡Hasta pronto! 👋 Escríbeme cuando necesites agendar una cita 😊`
      );
    }
  }

  await enviar(sock, telefono, respuestaIA);
}

async function enviar(sock, telefono, texto) {
  await sock.sendMessage(telefono, { text: texto });
}

module.exports = { procesarMensaje };