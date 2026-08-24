// assets/supabase-client.js
// Cliente compartido de Supabase para Gala ERP.
// La "anon key" es segura de exponer en el frontend: solo permite lo que las
// políticas de Row Level Security (RLS) autoricen para cada usuario logueado.

const SUPABASE_URL = "https://uohpmpzfotuwnzuwaway.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaHBtcHpmb3R1d256dXdhd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTc3NDYsImV4cCI6MjEwMjg5Mzc0Nn0.oGXQKmEmveH95fxWzRmeIlnYCtIRFAInGSQs6RAgWNA";

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Protege una página: si no hay sesión activa, redirige a login.html.
 * Si hay sesión, devuelve { user, profile } donde profile incluye el rol.
 * Úsalo en el <script type="module"> de cada página protegida:
 *
 *   const { user, profile } = await requireAuth();
 */
async function requireAuth() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("No se pudo cargar el perfil:", error);
  }

  // Cuenta nueva sin aprobar por el admin: no dejar pasar (salvo admins)
  const onPendingPage = window.location.pathname.endsWith("pendiente-aprobacion.html");
  if (profile && !profile.is_approved && profile.role !== "admin" && !onPendingPage) {
    window.location.href = "pendiente-aprobacion.html";
    return null;
  }

  return { user: session.user, profile };
}

/** Cierra sesión y regresa a login.html */
async function signOut() {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

const CURRENT_EVENT_KEY = "galaCurrentEventId";

/** Guarda cuál es el proyecto (evento) activo y navega a su panel. */
function selectProject(eventId) {
  localStorage.setItem(CURRENT_EVENT_KEY, eventId);
  window.location.href = "index.html";
}

/** Quita el proyecto activo y regresa a la lista de proyectos. */
function exitProject() {
  localStorage.removeItem(CURRENT_EVENT_KEY);
  window.location.href = "proyectos.html";
}

/**
 * Protege una página que pertenece a un proyecto: exige que haya un proyecto
 * activo guardado (elegido en proyectos.html) y que el usuario en verdad
 * tenga acceso a él. Si no, redirige a proyectos.html.
 * Devuelve el registro del evento ({ id, name, event_date, ... }).
 *
 *   const event = await requireEvent();
 */
async function requireEvent() {
  const eventId = localStorage.getItem(CURRENT_EVENT_KEY);
  if (!eventId) {
    window.location.href = "proyectos.html";
    return null;
  }
  const { data: event, error } = await window.supabaseClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    localStorage.removeItem(CURRENT_EVENT_KEY);
    window.location.href = "proyectos.html";
    return null;
  }
  return event;
}

/** Formatea la cuenta regresiva al estilo "42D : 12H : 08M" a partir de una fecha (YYYY-MM-DD) o null. */
function formatCountdown(eventDateStr) {
  if (!eventDateStr) return "Sin fecha";
  const target = new Date(eventDateStr + "T00:00:00");
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (isNaN(diffMs)) return "Sin fecha";
  if (diffMs <= 0) return "¡Es hoy o ya pasó!";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  return `${days}D : ${String(hours).padStart(2, "0")}H : ${String(minutes).padStart(2, "0")}M`;
}

/**
 * Aplica el nombre del proyecto y la cuenta regresiva real al header de una
 * página ya protegida por requireEvent(). Se llama una vez, con el evento.
 */
function applyEventToHeader(event) {
  const nameEl = document.getElementById("current-event-name");
  const countdownEl = document.getElementById("current-event-countdown");
  if (nameEl) nameEl.textContent = event.name || "Proyecto sin nombre";

  // Menciones sueltas del nombre del proyecto dentro del texto de cada página
  document.querySelectorAll("#current-event-name-inline").forEach((el) => {
    el.textContent = event.name || "tu evento";
  });

  // Cuenta regresiva en vivo: se actualiza sola cada minuto, no solo al cargar
  if (countdownEl) {
    const tick = () => { countdownEl.textContent = formatCountdown(event.event_date); };
    tick();
    if (window.__galaCountdownInterval) clearInterval(window.__galaCountdownInterval);
    window.__galaCountdownInterval = setInterval(tick, 60 * 1000);
  }
}

/**
 * Aplica una insignia visual junto al nombre del usuario que distingue su
 * rol de un vistazo (admin vs. organizador/colaborador).
 */
function applyRoleBadge(role) {
  const badge = document.getElementById("role-badge");
  if (!badge) return;
  const icon = badge.querySelector(".role-badge-icon");
  const isAdmin = role === "admin";
  badge.title = isAdmin ? "Administrador" : "Planner";
  badge.classList.toggle("bg-tertiary/15", isAdmin);
  badge.classList.toggle("text-tertiary", isAdmin);
  badge.classList.toggle("bg-secondary-container/50", !isAdmin);
  badge.classList.toggle("text-secondary", !isAdmin);
  if (icon) icon.textContent = isAdmin ? "workspace_premium" : "event_available";
}

window.requireAuth = requireAuth;
window.signOut = signOut;
window.requireEvent = requireEvent;
window.selectProject = selectProject;
window.exitProject = exitProject;
window.applyEventToHeader = applyEventToHeader;
window.formatCountdown = formatCountdown;
window.applyRoleBadge = applyRoleBadge;
