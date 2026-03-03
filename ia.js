// ia.js — Maneja toda la inteligencia artificial
require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Historial de conversación por usuario
const historiales = {};

// ============================================================
// PROMPT DEL SISTEMA — Le dice a la IA cómo comportarse
// ============================================================
function getSystemPrompt(horarios, citaActual) {
  const diasDisponibles = Object.values(horarios)
    .map(h => `${h.dia}: ${h.horas.join(", ")}`)
    .join("\n");

  return `Eres un asistente virtual amable y profesional de la Clínica Dr. García.
Tu trabajo es ayudar a los pacientes a reservar citas médicas.

HORARIOS DISPONIBLES:
${diasDisponibles}

${citaActual ? `CITA ACTUAL DEL PACIENTE: ${JSON.stringify(citaActual)}` : "El paciente no tiene cita activa."}

INSTRUCCIONES:
- Sé amable, claro y conciso
- Guía al paciente para obtener: nombre, día, hora y motivo de consulta
- Cuando tengas TODOS los datos responde EXACTAMENTE en este formato JSON y nada más:
  {"accion":"confirmar","nombre":"...","dia":"...","hora":"...","motivo":"..."}
- Si el paciente quiere cancelar su cita responde: {"accion":"cancelar"}
- Si el paciente quiere ver su cita responde: {"accion":"ver_cita"}
- Si falta algún dato, pregúntalo de forma natural
- Si el paciente escribe un día u hora que no está disponible, indícaselo amablemente
- Responde siempre en español
- Nunca inventes horarios que no están en la lista`;
}

// ============================================================
// FUNCIÓN PRINCIPAL — Procesa mensaje con IA
// ============================================================
async function procesarConIA(telefono, mensaje, horarios, citaActual) {
  // Iniciar historial si no existe
  if (!historiales[telefono]) {
    historiales[telefono] = [];
  }

  // Agregar mensaje del usuario al historial
  historiales[telefono].push({
    role: "user",
    content: mensaje
  });

  // Limitar historial a últimos 10 mensajes para no gastar tokens
  if (historiales[telefono].length > 10) {
    historiales[telefono] = historiales[telefono].slice(-10);
  }

  try {
    const response = await groq.chat.completions.create({
model: "llama-3.3-70b-versatile",      messages: [
        {
          role: "system",
          content: getSystemPrompt(horarios, citaActual)
        },
        ...historiales[telefono]
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const respuesta = response.choices[0].message.content;

    // Guardar respuesta en historial
    historiales[telefono].push({
      role: "assistant",
      content: respuesta
    });

    // Intentar detectar si la IA devolvió un JSON con acción
    const accion = extraerAccion(respuesta);

    return { texto: respuesta, accion };

  } catch (err) {
    console.error("Error con Groq:", err.message);
    return {
      texto: "Lo siento, tuve un problema. ¿Puedes repetir tu mensaje?",
      accion: null
    };
  }
}

// ============================================================
// DETECTAR SI LA IA DEVOLVIÓ UN JSON DE ACCIÓN
// ============================================================
function extraerAccion(texto) {
  try {
    // Buscar JSON dentro del texto
    const match = texto.match(/\{.*\}/s);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch {
    // No era JSON, respuesta normal
  }
  return null;
}

// Limpiar historial cuando termina la conversación
function limpiarHistorial(telefono) {
  delete historiales[telefono];
}

module.exports = { procesarConIA, limpiarHistorial };