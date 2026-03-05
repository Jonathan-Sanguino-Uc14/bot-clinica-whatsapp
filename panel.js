// panel.js — Panel web para gestionar citas
const express = require("express");
const {
  getCitasHoy, getAllCitas, getAllClientes,
  cancelarCitaById, getEstadisticas, getHorariosDisponibles
} = require("./db");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Contraseña simple para proteger el panel ──
const PASSWORD = process.env.PANEL_PASSWORD || "clinica123";

// ── Middleware de autenticación básica ──
function auth(req, res, next) {
  const pass = (req.query && req.query.pass) || (req.body && req.body.pass);
  if (pass !== PASSWORD) {
    return res.send(`
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Panel Clínica</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #f0f4f8; display: flex; justify-content: center; align-items: center; height: 100vh; }
          .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
          h2 { color: #2d3748; margin-bottom: 24px; text-align: center; }
          input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 16px; margin-bottom: 16px; }
          button { width: 100%; padding: 12px; background: #25D366; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
          button:hover { background: #1ea855; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🏥 Panel Clínica Dr. García</h2>
          <form method="GET" action="/panel">
            <input type="password" name="pass" placeholder="Contraseña" required/>
            <button type="submit">Entrar</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }
  next();
}

// ============================================================
// RUTAS
// ============================================================

// ── Panel principal ──
app.get("/panel", auth, async (req, res) => {
  const pass = req.query.pass;
  const [citasHoy, estadisticas] = await Promise.all([
    getCitasHoy(),
    getEstadisticas()
  ]);

  res.send(renderPanel(pass, citasHoy, estadisticas));
});

// ── Ver todas las citas ──
app.get("/panel/citas", auth, async (req, res) => {
  const pass = req.query.pass;
  const citas = await getAllCitas();
  res.send(renderCitas(pass, citas));
});

// ── Ver todos los clientes ──
app.get("/panel/clientes", auth, async (req, res) => {
  const pass = req.query.pass;
  const clientes = await getAllClientes();
  res.send(renderClientes(pass, clientes));
});

// ── Cancelar cita ──
app.post("/panel/cancelar", auth, async (req, res) => {
  const { id, pass } = req.body;
  await cancelarCitaById(id);
  res.redirect(`/panel/citas?pass=${pass}`);
});

// ============================================================
// RENDERIZADO HTML
// ============================================================

function estilos() {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; background: #f0f4f8; color: #2d3748; }
      nav { background: #25D366; padding: 16px 24px; display: flex; gap: 16px; align-items: center; }
      nav a { color: white; text-decoration: none; font-weight: bold; padding: 8px 16px; border-radius: 8px; }
      nav a:hover { background: rgba(255,255,255,0.2); }
      nav span { color: white; font-size: 20px; font-weight: bold; margin-right: auto; }
      .container { max-width: 1200px; margin: 24px auto; padding: 0 16px; }
      .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
      .stat { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center; }
      .stat .numero { font-size: 48px; font-weight: bold; color: #25D366; }
      .stat .label { color: #718096; margin-top: 8px; }
      table { width: 100%; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-collapse: collapse; overflow: hidden; }
      th { background: #25D366; color: white; padding: 14px 16px; text-align: left; }
      td { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #f7fafc; }
      .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
      .badge.confirmada { background: #c6f6d5; color: #276749; }
      .badge.cancelada { background: #fed7d7; color: #9b2c2c; }
      .btn { padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; }
      .btn-cancelar { background: #fed7d7; color: #c53030; }
      .btn-cancelar:hover { background: #fc8181; color: white; }
      h2 { margin-bottom: 16px; color: #2d3748; }
      .empty { text-align: center; padding: 48px; color: #a0aec0; }
    </style>
  `;
}

function nav(pass) {
  return `
    <nav>
      <span>🏥 Clínica Dr. García</span>
      <a href="/panel?pass=${pass}">🏠 Inicio</a>
      <a href="/panel/citas?pass=${pass}">📅 Citas</a>
      <a href="/panel/clientes?pass=${pass}">👥 Clientes</a>
    </nav>
  `;
}

function renderPanel(pass, citasHoy, stats) {
  const filas = citasHoy.length ? citasHoy.map(c => `
    <tr>
      <td>${c.hora}</td>
      <td>${c.nombre}</td>
      <td>${c.motivo}</td>
      <td>${c.telefono.replace("@s.whatsapp.net", "")}</td>
      <td><span class="badge ${c.estado}">${c.estado}</span></td>
    </tr>
  `).join("") : `<tr><td colspan="5" class="empty">No hay citas para hoy</td></tr>`;

  return `
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Panel Clínica</title>${estilos()}</head>
    <body>
    ${nav(pass)}
    <div class="container">
      <div class="stats">
        <div class="stat"><div class="numero">${stats.total_citas}</div><div class="label">Total citas</div></div>
        <div class="stat"><div class="numero">${stats.citas_hoy}</div><div class="label">Citas hoy</div></div>
        <div class="stat"><div class="numero">${stats.total_clientes}</div><div class="label">Clientes</div></div>
        <div class="stat"><div class="numero">${stats.citas_semana}</div><div class="label">Esta semana</div></div>
      </div>
      <h2>📅 Citas de hoy</h2>
      <table>
        <thead><tr><th>Hora</th><th>Paciente</th><th>Motivo</th><th>Teléfono</th><th>Estado</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    </body></html>
  `;
}

function renderCitas(pass, citas) {
  const filas = citas.length ? citas.map(c => `
    <tr>
      <td>${c.dia}</td>
      <td>${c.hora}</td>
      <td>${c.nombre}</td>
      <td>${c.motivo}</td>
      <td><span class="badge ${c.estado}">${c.estado}</span></td>
      <td>
        ${c.estado === "confirmada" ? `
          <form method="POST" action="/panel/cancelar" style="display:inline">
            <input type="hidden" name="id" value="${c.id}">
            <input type="hidden" name="pass" value="${pass}">
            <button class="btn btn-cancelar" onclick="return confirm('¿Cancelar esta cita?')">Cancelar</button>
          </form>` : "—"}
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="empty">No hay citas registradas</td></tr>`;

  return `
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Citas — Panel Clínica</title>${estilos()}</head>
    <body>
    ${nav(pass)}
    <div class="container">
      <h2>📅 Todas las citas</h2>
      <table>
        <thead><tr><th>Día</th><th>Hora</th><th>Paciente</th><th>Motivo</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    </body></html>
  `;
}

function renderClientes(pass, clientes) {
  const filas = clientes.length ? clientes.map(c => `
    <tr>
      <td>${c.nombre || "—"}</td>
      <td>${c.telefono.replace("@s.whatsapp.net", "").replace("52", "+52 ")}</td>
      <td>${c.total_citas}</td>
      <td>${c.dia_preferido || "—"}</td>
      <td>${c.hora_preferida || "—"}</td>
      <td>${c.ultima_cita ? new Date(c.ultima_cita).toLocaleDateString("es-MX") : "—"}</td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="empty">No hay clientes registrados</td></tr>`;

  return `
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Clientes — Panel Clínica</title>${estilos()}</head>
    <body>
    ${nav(pass)}
    <div class="container">
      <h2>👥 Clientes</h2>
      <table>
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Total citas</th><th>Día preferido</th><th>Hora preferida</th><th>Última cita</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    </body></html>
  `;
}

module.exports = { app };