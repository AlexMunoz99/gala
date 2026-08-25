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
 * Sistema de Notificaciones Toast Luxury Dark
 * @param {string} message - Mensaje a mostrar
 * @param {'success'|'error'|'info'} type - Tipo de notificación
 * @param {number} duration - Duración en milisegundos
 */
function showToast(message, type = "success", duration = 3500) {
  let container = document.getElementById("gala-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "gala-toast-container";
    container.className = "fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-md w-full px-4";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-xl border transition-all duration-300 transform translate-y-4 opacity-0";

  let iconName = "check_circle";
  let borderClass = "border-tertiary/40 bg-surface-container/95 text-on-surface";
  let iconClass = "text-tertiary";

  if (type === "error") {
    iconName = "error";
    borderClass = "border-error/40 bg-surface-container/95 text-on-surface";
    iconClass = "text-error";
  } else if (type === "info") {
    iconName = "info";
    borderClass = "border-secondary/40 bg-surface-container/95 text-on-surface";
    iconClass = "text-secondary";
  }

  toast.className += ` ${borderClass}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined ${iconClass} text-[22px] shrink-0">${iconName}</span>
    <span class="font-body-md text-sm leading-snug flex-1">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-4", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
  });

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Diálogo de Confirmación Luxury Dark
 * @param {Object} options - { title, message, confirmText, cancelText, isDestructive }
 * @returns {Promise<boolean>}
 */
function showConfirmDialog({ title = "¿Estás seguro?", message = "Esta acción no se puede deshacer.", confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = true } = {}) {
  return new Promise((resolve) => {
    const existing = document.getElementById("gala-confirm-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "gala-confirm-modal";
    modal.className = "fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-200 opacity-0";

    const confirmBtnClass = isDestructive 
      ? "bg-error/20 border border-error/40 text-error hover:bg-error/30"
      : "bg-tertiary text-on-tertiary hover:brightness-110";

    modal.innerHTML = `
      <div class="bg-surface-container-high border border-tertiary/20 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 transform scale-95 transition-transform duration-200">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-full ${isDestructive ? 'bg-error/15 text-error border border-error/30' : 'bg-tertiary/15 text-tertiary border border-tertiary/30'} flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[22px]">${isDestructive ? 'warning' : 'help'}</span>
          </div>
          <div class="flex-1">
            <h3 class="font-headline-md text-lg text-on-surface">${title}</h3>
            <p class="font-body-md text-sm text-on-surface-variant mt-1 leading-relaxed">${message}</p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-tertiary/10">
          <button id="gala-modal-cancel" class="px-4 py-2 rounded-lg border border-tertiary/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all text-xs font-button-text uppercase tracking-wider">
            ${cancelText}
          </button>
          <button id="gala-modal-confirm" class="px-5 py-2 rounded-lg ${confirmBtnClass} transition-all text-xs font-button-text uppercase tracking-wider font-semibold shadow-lg">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      modal.classList.remove("opacity-0");
      modal.classList.add("opacity-100");
      modal.querySelector("div").classList.remove("scale-95");
      modal.querySelector("div").classList.add("scale-100");
    });

    function cleanUp(result) {
      modal.classList.remove("opacity-100");
      modal.classList.add("opacity-0");
      setTimeout(() => {
        modal.remove();
        resolve(result);
      }, 150);
    }

    modal.querySelector("#gala-modal-cancel").addEventListener("click", () => cleanUp(false));
    modal.querySelector("#gala-modal-confirm").addEventListener("click", () => cleanUp(true));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cleanUp(false);
    });
  });
}

window.requireAuth = requireAuth;
window.signOut = signOut;
window.requireEvent = requireEvent;
window.selectProject = selectProject;
window.exitProject = exitProject;
window.applyEventToHeader = applyEventToHeader;
window.formatCountdown = formatCountdown;
window.applyRoleBadge = applyRoleBadge;
window.showToast = showToast;
window.showConfirmDialog = showConfirmDialog;

