
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    sslmode: 'verify-full'
  },
});

async function inicializarDB() {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Conectado a Supabase correctamente");
  } catch (err) {
    console.error("❌ Error conectando a Supabase:", err.message);
    console.error("❌ Detalle:", err); // ← agrega esta línea
  }
}

async function guardarCita(telefono, cita) {
  const result = await pool.query(
    `INSERT INTO citas (telefono, nombre, dia, hora, motivo)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [telefono, cita.nombre, cita.dia, cita.hora, cita.motivo]
  );
  return result.rows[0].id;
}

async function getCita(telefono) {
  const result = await pool.query(
    `SELECT * FROM citas
     WHERE telefono = $1 AND estado = 'confirmada'
     ORDER BY creado_en DESC LIMIT 1`,
    [telefono]
  );
  return result.rows[0] || null;
}

async function cancelarCita(telefono) {
  await pool.query(
    `UPDATE citas SET estado = 'cancelada'
     WHERE telefono = $1 AND estado = 'confirmada'`,
    [telefono]
  );
}

async function getCitasPendientesRecordatorio() {
  const result = await pool.query(`
    SELECT * FROM citas
    WHERE estado = 'confirmada'
      AND recordatorio_enviado = false
      AND TRIM(TO_CHAR(NOW() + INTERVAL '1 day', 'Day')) = dia
  `);
  return result.rows;
}

async function marcarRecordatorioEnviado(id) {
  await pool.query(
    `UPDATE citas SET recordatorio_enviado = true WHERE id = $1`,
    [id]
  );
}

async function getSesion(telefono) {
  const result = await pool.query(
    `SELECT datos FROM sesiones WHERE telefono = $1`,
    [telefono]
  );
  return result.rows[0]?.datos || { paso: null };
}

async function setSesion(telefono, datos) {
  await pool.query(
    `INSERT INTO sesiones (telefono, datos, actualizado)
     VALUES ($1, $2, NOW())
     ON CONFLICT (telefono)
     DO UPDATE SET datos = $2, actualizado = NOW()`,
    [telefono, JSON.stringify(datos)]
  );
}

async function deleteSesion(telefono) {
  await pool.query(
    `DELETE FROM sesiones WHERE telefono = $1`,
    [telefono]
  );
}

module.exports = {
  inicializarDB,
  guardarCita,
  getCita,
  cancelarCita,
  getCitasPendientesRecordatorio,
  marcarRecordatorioEnviado,
  getSesion,
  setSesion,
  deleteSesion,
};