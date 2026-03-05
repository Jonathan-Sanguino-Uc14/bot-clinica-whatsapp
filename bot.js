// bot.js — Versión con IA integrada y mejorada
const { CLINICA, HORARIOS } = require("./datos");
const { guardarCita, getCita, cancelarCita, getCliente, upsertCliente } = require("./db");
const { procesarConIA, limpiarHistorial } = require("./ia");

const conversacionesCerradas = new Set();

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
async function procesarMensaje(telefono, texto, sock) {
  // Si la conversación fue cerrada recientemente, ignorar
  if (conversacionesCerradas.has(telefono)) return;
const citaActual = await getCita(telefono);
  const cliente    = await getCliente(telefono); // ← nuevo

  const onInactivo = async (tel, mensaje) => {
    await enviar(sock, tel, mensaje);
  };

  const { texto: respuestaIA, accion } = await procesarConIA(
    telefono, texto, HORARIOS, citaActual, onInactivo, cliente // ← pasar cliente
  );

  if (accion) {
    if (accion.accion === "confirmar") {
      await guardarCita(telefono, {
        nombre: accion.nombre,
        dia:    accion.dia,
        hora:   accion.hora,
        motivo: accion.motivo
      });

      // Guardar/actualizar perfil del cliente ← nuevo
      await upsertCliente(telefono, {
        nombre: accion.nombre,
        dia:    accion.dia,
        hora:   accion.hora
      });
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

  // Callback que se ejecuta cuando el usuario está inactivo
  const onInactivo = async (tel, mensaje) => {
    await enviar(sock, tel, mensaje);
  };

  // Enviar a la IA
  const { texto: respuestaIA, accion } = await procesarConIA(
    telefono, texto, HORARIOS, citaActual, onInactivo
  );

  // ── Procesar acción si la IA detectó una ──
  if (accion) {

    if (accion.accion === "confirmar") {
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
      } else {
        return enviar(sock, telefono,
          `No tienes citas reservadas. Escríbeme para agendar una 😊`
        );
      }
    }

    if (accion.accion === "salir") {
      limpiarHistorial(telefono);
      conversacionesCerradas.add(telefono);

      // Después de 30 segundos puede volver a escribir
      setTimeout(() => {
        conversacionesCerradas.delete(telefono);
      }, 30 * 1000);

      return enviar(sock, telefono,
        `¡Hasta pronto! 👋 Escríbeme cuando necesites agendar una cita 😊`
      );
    }
  }

  // Respuesta normal de la IA
  await enviar(sock, telefono, respuestaIA);
}

// ── Helper para enviar mensajes ──
async function enviar(sock, telefono, texto) {
  await sock.sendMessage(telefono, { text: texto });
}

module.exports = { procesarMensaje };}}