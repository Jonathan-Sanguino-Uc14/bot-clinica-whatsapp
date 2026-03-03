// datos.js — Aquí configuras tu clínica
const CLINICA = {
  nombre:    "Clínica Dr. García",
  direccion: "Calle Principal 123, Col. Centro",
  telefono:  "+52 999 123 4567",
  doctor:    "529988262714@s.whatsapp.net", // ← debe tener @s.whatsapp.net
};

const HORARIOS = {
  "1": { dia: "Lunes",      horas: ["09:00", "10:00", "11:00", "16:00", "17:00"] },
  "2": { dia: "Martes",     horas: ["09:00", "10:00", "11:00", "16:00", "17:00"] },
  "3": { dia: "Miércoles",  horas: ["09:00", "10:00", "11:00"] },
  "4": { dia: "Jueves",     horas: ["09:00", "10:00", "11:00", "16:00", "17:00"] },
  "5": { dia: "Viernes",    horas: ["09:00", "10:00", "11:00"] },
};

module.exports = { CLINICA, HORARIOS };