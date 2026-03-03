// sesiones.js — Ahora usa PostgreSQL via Supabase
const db = require("./db");

module.exports = {
  getSesion:    db.getSesion,
  setSesion:    db.setSesion,
  deleteSesion: db.deleteSesion,
  guardarCita:  db.guardarCita,
  getCita:      db.getCita,
};