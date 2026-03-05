// ia.js
require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const historiales = {};
const temporizadores = {}; // Para detectar inactividad

// ============================================================
// SYSTEM PROMPT MEJORADO
// ============================================================
function getSystemPrompt(horarios, citaActual) {
  const diasDisponibles = Object.values(horarios)
    .map(h => `${h.dia}: ${h.horas.join(", ")}`)
    .join("\n");

  return `Eres un asistente virtual amable y natural de la Clínica Dr. García. Tu nombre es "Clini".

HORARIOS DISPONIBLES:
${diasDisponibles}

${citaActual ? `CITA ACTUAL DEL PACIENTE: ${JSON.stringify(citaActual)}` : "El paciente no tiene cita activa."}

REGLAS DE CONVERSACIÓN:
- Sé cálido, natural y conciso. Como un recepcionista amable, no un robot.
- NUNCA repitas información que ya mencionaste antes en la conversación.
- Haz UNA sola pregunta a la vez, nunca varias juntas.
- Si el usuario se equivoca o escribe algo inválido, corrígelo amablemente sin regañar.
- Si el usuario escribe "salir", "adios", "bye", "cancelar" o similar responde exactamente: {"accion":"salir"}
- Si el usuario parece confundido o frustrado, sé más paciente y ofrece opciones claras.
- Nunca inventes horarios que no están en la lista.
- Responde siempre en español, máximo 3 líneas por mensaje.

CUANDO TENGAS TODOS LOS DATOS (nombre, día, hora, motivo) responde EXACTAMENTE:
{"accion":"confirmar","nombre":"...","dia":"...","hora":"...","motivo":"..."}

OTRAS ACCIONES:
- Usuario quiere cancelar su cita: {"accion":"cancelar"}
- Usuario quiere ver su cita: {"accion":"ver_cita"}
- Usuario quiere salir/terminar: {"accion":"salir"}

MANEJO DE ERRORES:
- Si pide un día no disponible: menciona solo los días disponibles sin listarlos todos de nuevo.
- Si pide una hora no disponible: menciona solo las horas libres de ese día.
- Si escribe algo sin sentido: pregunta amablemente qué necesita.`;
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
async function procesarConIA(telefono, mensaje, horarios, citaActual, onInactivo) {
  if (!historiales[telefono]) {
    historiales[telefono] = [];
  }

  historiales[telefono].push({ role: "user", content: mensaje });

  // Limitar historial a últimos 10 mensajes
  if (historiales[telefono].length > 10) {
    historiales[telefono] = historiales[telefono].slice(-10);
  }

  // Reiniciar temporizador de inactividad
  reiniciarTemporizador(telefono, onInactivo);

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: getSystemPrompt(horarios, citaActual) },
        ...historiales[telefono]
      ],
      temperature: 0.6, // Menos temperatura = más consistente
      max_tokens: 300,  // Respuestas más cortas
    });

    const respuesta = response.choices[0].message.content;

    historiales[telefono].push({ role: "assistant", content: respuesta });

    const accion = extraerAccion(respuesta);

    // Si terminó la conversación, limpiar temporizador
    if (accion && ["confirmar", "cancelar", "salir"].includes(accion.accion)) {
      limpiarTemporizador(telefono);
    }

    return { texto: respuesta, accion };

  } catch (err) {
    console.error("Error con Groq:", err.message);
    return {
      texto: "Lo siento, tuve un problema técnico. ¿Puedes repetir tu mensaje?",
      accion: null
    };
  }
}

// ============================================================
// TEMPORIZADOR DE INACTIVIDAD
// ============================================================
function reiniciarTemporizador(telefono, onInactivo) {
  limpiarTemporizador(telefono);

  // Si no responde en 5 minutos, preguntar si sigue ahí
  temporizadores[telefono] = setTimeout(async () => {
    if (onInactivo) {
      await onInactivo(telefono,
        "👋 ¿Sigues ahí? Si necesitas ayuda para agendar tu cita escríbeme, si no, ¡hasta pronto! 😊"
      );
    }

    // Si después de otros 5 minutos sigue sin responder, limpiar sesión
    temporizadores[telefono + "_final"] = setTimeout(() => {
      limpiarHistorial(telefono);
      console.log(`🕐 Sesión cerrada por inactividad: ${telefono}`);
    }, 5 * 60 * 1000);

  }, 5 * 60 * 1000); // 5 minutos
}

function limpiarTemporizador(telefono) {
  if (temporizadores[telefono]) {
    clearTimeout(temporizadores[telefono]);
    delete temporizadores[telefono];
  }
  if (temporizadores[telefono + "_final"]) {
    clearTimeout(temporizadores[telefono + "_final"]);
    delete temporizadores[telefono + "_final"];
  }
}

// ============================================================
// DETECTAR ACCIÓN EN RESPUESTA DE LA IA
// ============================================================
function extraerAccion(texto) {
  try {
    const match = texto.match(/\{.*\}/s);
    if (match) return JSON.parse(match[0]);
  } catch {
    // Respuesta normal de texto
  }
  return null;
}

function limpiarHistorial(telefono) {
  delete historiales[telefono];
  limpiarTemporizador(telefono);
}

module.exports = { procesarConIA, limpiarHistorial };