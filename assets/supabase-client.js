// assets/supabase-client.js
// Cliente compartido de Supabase para Gala ERP.

const SUPABASE_URL = "https://uohpmpzfotuwnzuwaway.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaHBtcHpmb3R1d256dXdhd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTc3NDYsImV4cCI6MjEwMjg5Mzc0Nn0.oGXQKmEmveH95fxWzRmeIlnYCtIRFAInGSQs6RAgWNA";window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Soporte de Impersonación y Suplantación de Sesión ---
let originalSession = null;
let originalProfile = null;

(function() {
  const originalGetSession = window.supabaseClient.auth.getSession.bind(window.supabaseClient.auth);
  window.supabaseClient.auth.getSession = async function() {
    const res = await originalGetSession();
    if (!res.data?.session) return res;
    
    if (!originalSession || originalSession.user.id !== res.data.session.user.id) {
      originalSession = JSON.parse(JSON.stringify(res.data.session));
      try {
        const { data } = await window.supabaseClient.from("profiles").select("*").eq("id", originalSession.user.id).single();
        originalProfile = data;
      } catch(e) {}
    }

    const impersonateId = localStorage.getItem("galaImpersonateUserId");
    if (impersonateId && originalProfile && originalProfile.role === "admin") {
      const { data: impUser } = await window.supabaseClient.from("profiles").select("*").eq("id", impersonateId).single();
      if (impUser) {
        const mockedSession = JSON.parse(JSON.stringify(res.data.session));
        mockedSession.user.id = impersonateId;
        mockedSession.user.email = impUser.email;
        return { data: { session: mockedSession }, error: null };
      }
    }

    // 2. Check if user is a team member of an Agency
    try {
      const { data: tm } = await window.supabaseClient
        .from("team_members")
        .select("agency_user_id")
        .eq("member_email", res.data.session.user.email);
      if (tm && tm[0]) {
        const agencyUserId = tm[0].agency_user_id;
        const mockedSession = JSON.parse(JSON.stringify(res.data.session));
        mockedSession.user.id = agencyUserId;
        return { data: { session: mockedSession }, error: null };
      }
    } catch(e) {}

    return res;
  };

  const originalGetUser = window.supabaseClient.auth.getUser.bind(window.supabaseClient.auth);
  window.supabaseClient.auth.getUser = async function() {
    const res = await originalGetUser();
    if (!res.data?.user) return res;

    const impersonateId = localStorage.getItem("galaImpersonateUserId");
    if (impersonateId && originalProfile && originalProfile.role === "admin") {
      const { data: impUser } = await window.supabaseClient.from("profiles").select("*").eq("id", impersonateId).single();
      if (impUser) {
        const mockedUser = JSON.parse(JSON.stringify(res.data.user));
        mockedUser.id = impersonateId;
        mockedUser.email = impUser.email;
        return { data: { user: mockedUser }, error: null };
      }
    }

    // Check if user is a team member of an Agency
    try {
      const { data: tm } = await window.supabaseClient
        .from("team_members")
        .select("agency_user_id")
        .eq("member_email", res.data.user.email);
      if (tm && tm[0]) {
        const agencyUserId = tm[0].agency_user_id;
        const mockedUser = JSON.parse(JSON.stringify(res.data.user));
        mockedUser.id = agencyUserId;
        return { data: { user: mockedUser }, error: null };
      }
    } catch(e) {}

    return res;
  };
})();

// Inyectar de inmediato estilos compactos y responsivos para evitar parpadeos visuales (Layout Shift)
(function injectStylesImmediately() {
  if (typeof document === "undefined") return;

  if (!document.getElementById("gala-compact-styles")) {
    const compactStyle = document.createElement("style");
    compactStyle.id = "gala-compact-styles";
    compactStyle.textContent = `
      html {
        font-size: 13.5px !important;
      }
      .py-16, .py-12 {
        padding-top: 1.5rem !important;
        padding-bottom: 1.5rem !important;
      }
      .pt-20 {
        padding-top: 4.5rem !important;
      }
      .pb-section-gap {
        padding-bottom: 2rem !important;
      }
      .gap-section-gap {
        gap: 2.5rem !important;
      }
      .mt-12 {
        margin-top: 1.2rem !important;
      }
      header.h-20 {
        height: 3.5rem !important;
      }
      :root {
        --sidebar-w: 168px !important;
      }
      html.sidebar-collapsed {
        --sidebar-w: 56px !important;
      }
      .p-8 {
        padding: 1.25rem !important;
      }
      .p-6 {
        padding: 1rem !important;
      }
      .gap-8 {
        gap: 1.25rem !important;
      }
      .gap-6 {
        gap: 1rem !important;
      }
      .py-4.px-6, .py-3.px-5 {
        padding-top: 0.5rem !important;
        padding-bottom: 0.5rem !important;
        padding-left: 0.75rem !important;
        padding-right: 0.75rem !important;
      }
    `;
    const ref = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
    ref.appendChild(compactStyle);
  }

  if (!document.getElementById("gala-mobile-styles")) {
    const style = document.createElement("style");
    style.id = "gala-mobile-styles";
    style.textContent = `
      @media (max-width: 768px) {
        :root { --sidebar-w: 0px !important; }
        #app-sidebar {
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          width: 280px !important;
          z-index: 99999 !important;
          box-shadow: 15px 0 40px rgba(0,0,0,0.85);
        }
        #app-sidebar.mobile-open {
          transform: translateX(0) !important;
        }
        #sidebar-toggle {
          display: none !important;
        }
        #app-content-wrapper {
          padding-left: 0 !important;
        }
        #app-header-logo {
          display: none !important;
        }
        header {
          padding-left: 12px !important;
          padding-right: 12px !important;
        }
        main {
          padding-left: 14px !important;
          padding-right: 14px !important;
          padding-top: 86px !important;
        }
        .table-responsive {
          display: block;
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
      }
    `;
    const ref = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
    ref.appendChild(style);
  }
})();

/**
 * Protege una página: si no hay sesión activa, redirige a login.html.
 * Si hay sesión, devuelve { user, profile } donde profile incluye el rol.
 */
async function requireAuth() {
  try {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
      const path = window.location.pathname;
      if (!path.endsWith("login.html") && !path.endsWith("rsvp.html") && !path.endsWith("invitacion.html")) {
        window.location.href = "login.html";
      }
      return null;
    }
    
    let profile = null;
    try {
      const { data, error } = await window.supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!error && data) {
        profile = data;
      }
    } catch(e) {
      console.warn("No se pudo cargar perfil de Supabase:", e);
    }

    if (!profile) {
      // Fallback seguro para evitar pantallas congeladas
      profile = {
        id: session.user.id,
        role: "admin",
        plan: "free",
        is_approved: true,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Usuario Gala"
      };
    } else if (!profile.plan) {
      profile.plan = "free";
    }

    const onPendingPage = window.location.pathname.endsWith("pendiente-aprobacion.html");
    if (profile && !profile.is_approved && profile.role !== "admin" && !onPendingPage) {
      window.location.href = "pendiente-aprobacion.html";
      return null;
    }

    // --- Control de Acceso por Módulos (disabled_modules) ---
    const path = window.location.pathname;
    const disabledModules = profile.disabled_modules || [];
    const moduleMappings = {
      "invitados.html": "invitados",
      "presupuesto.html": "presupuesto",
      "itinerario.html": "itinerario",
      "programa.html": "programa",
      "seating-materials.html": "asientos",
      "tareas.html": "tareas",
      "post-wedding.html": "galeria"
    };

    const currentPageFile = path.substring(path.lastIndexOf("/") + 1);
    const moduleName = moduleMappings[currentPageFile];

    if (moduleName && disabledModules.includes(moduleName)) {
      alert(`El módulo "${moduleName.toUpperCase()}" está desactivado para tu cuenta.`);
      window.location.href = "proyectos.html";
      return null;
    }

    // --- Reestructuración Dinámica del Sidebar ---
    setTimeout(() => {
      const sidebar = document.getElementById("app-sidebar");
      if (sidebar) {
        // 1. Reposicionar y renombrar botón "Mis Eventos" (antes "Mis Proyectos") al tope
        const bottomCta = sidebar.querySelector(".sidebar-cta");
        if (bottomCta) {
          const btn = bottomCta.querySelector("a");
          if (btn) {
            btn.innerHTML = `<span class="material-symbols-outlined nav-icon">apps</span><span class="sidebar-label">Mis Eventos</span>`;
            btn.href = "proyectos.html";
            
            const logoDiv = sidebar.querySelector(".h-20");
            if (logoDiv && !sidebar.querySelector(".moved-events-btn")) {
              const wrapper = document.createElement("div");
              wrapper.className = "px-4 pt-2 pb-1 border-b border-tertiary/10 moved-events-btn shrink-0";
              btn.className = "w-full py-2.5 bg-tertiary text-on-tertiary font-button-text text-button-text uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 rounded-lg text-[10px] font-bold shadow-md shadow-tertiary/15";
              wrapper.appendChild(btn);
              logoDiv.after(wrapper);
              bottomCta.remove();
            }
          }
        }

        // 2. Renombrar "Post-Boda" a "Galería" de forma dinámica y desactivar módulos deshabilitados
        sidebar.querySelectorAll("nav a").forEach(a => {
          const href = a.getAttribute("href") || "";
          const page = href.substring(href.lastIndexOf("/") + 1);
          
          if (page === "post-wedding.html") {
            const label = a.querySelector(".sidebar-label");
            if (label) label.textContent = "Galería";
            const icon = a.querySelector(".nav-icon");
            if (icon) icon.textContent = "photo_library";
          }

          const mappedModule = moduleMappings[page];
          if (mappedModule && disabledModules.includes(mappedModule)) {
            a.style.opacity = "0.35";
            a.style.pointerEvents = "none";
            a.title = "Módulo desactivado por el administrador";
          }
        });

        // 3. Inyectar enlaces dinámicos según el rol o plan en el sidebar
        const nav = sidebar.querySelector("nav");
        if (nav) {
          // Si el plan es Agency, inyectar "Mi Equipo"
          if (profile.plan === "agency" && !sidebar.querySelector(".agency-team-btn")) {
            const teamLink = document.createElement("a");
            teamLink.className = "flex items-center px-6 py-4 text-on-surface-variant hover:text-tertiary transition-all agency-team-btn border-l-4 border-transparent hover:border-tertiary/40";
            teamLink.href = "equipo.html";
            teamLink.innerHTML = `<span class="material-symbols-outlined nav-icon mr-4">groups</span><span class="sidebar-label">Mi Equipo</span>`;
            nav.appendChild(teamLink);
          }
          // Si es Administrador, inyectar "Panel de Admin"
          const isAdmin = profile.role === "admin" || (originalProfile && originalProfile.role === "admin");
          if (isAdmin && !sidebar.querySelector(".admin-panel-btn")) {
            const adminLink = document.createElement("a");
            adminLink.className = "flex items-center px-6 py-4 text-on-surface-variant hover:text-tertiary transition-all admin-panel-btn border-l-4 border-transparent hover:border-tertiary/40";
            adminLink.href = "usuarios.html";
            adminLink.innerHTML = `<span class="material-symbols-outlined nav-icon mr-4">admin_panel_settings</span><span class="sidebar-label">Panel de Admin</span>`;
            nav.appendChild(adminLink);
          }
        }
      }
    }, 10);

    // --- Inyectar banner flotante de Impersonación ---
    const impersonateId = localStorage.getItem("galaImpersonateUserId");
    if (impersonateId && originalProfile && originalProfile.role === "admin") {
      setTimeout(() => {
        if (!document.getElementById("gala-impersonation-banner")) {
          const banner = document.createElement("div");
          banner.id = "gala-impersonation-banner";
          banner.className = "fixed top-0 left-0 right-0 h-10 bg-[#e9c349] text-[#3c2f00] z-[99999] flex items-center justify-center gap-3 text-xs font-bold shadow-md px-4";
          banner.innerHTML = `
            <span>Modo Impersonación: Estás viendo la cuenta de <strong>${profile.full_name || profile.email || impersonateId}</strong></span>
            <button id="btn-stop-impersonate" class="px-2.5 py-1 bg-[#3c2f00] text-[#e9c349] rounded hover:brightness-110 transition-all font-semibold uppercase text-[9px]">Volver a mi Panel de Admin</button>
          `;
          document.body.prepend(banner);
          document.body.style.paddingTop = "40px";
          
          document.getElementById("btn-stop-impersonate").addEventListener("click", () => {
            localStorage.removeItem("galaImpersonateUserId");
            window.location.href = "usuarios.html";
          });
        }
      }, 50);
    }

    return { user: session.user, profile };
  } catch(err) {
    console.error("Error en requireAuth:", err);
    return null;
  }
}

/** Cierra sesión y regresa a login.html */
async function signOut() {
  await window.supabaseClient.auth.signOut();
  localStorage.removeItem("galaCurrentEventId");
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
 * activo guardado (elegido en proyectos.html).
 */
async function requireEvent() {
  const eventId = localStorage.getItem(CURRENT_EVENT_KEY);
  if (!eventId) {
    window.location.href = "proyectos.html";
    return null;
  }
  try {
    const { data: event, error } = await window.supabaseClient
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error || !event) {
      // Intentar cargar el último evento disponible en vez de trabarse
      const { data: latest } = await window.supabaseClient.from("events").select("*").limit(1);
      if (latest && latest[0]) {
        localStorage.setItem(CURRENT_EVENT_KEY, latest[0].id);
        return latest[0];
      }
      localStorage.removeItem(CURRENT_EVENT_KEY);
      window.location.href = "proyectos.html";
      return null;
    }
    return event;
  } catch(e) {
    console.error("Error en requireEvent:", e);
    window.location.href = "proyectos.html";
    return null;
  }
}

/** Formatea la cuenta regresiva en vivo "45D : 12H : 08M" a partir de una fecha (YYYY-MM-DD) */
function formatCountdown(eventDateStr) {
  if (!eventDateStr) return "Sin fecha";
  const target = new Date(eventDateStr + "T00:00:00");
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (isNaN(diffMs)) return "Sin fecha";
  if (diffMs <= 0) return "¡Hoy es el gran día!";
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);
  
  return `${days}D · ${String(hours).padStart(2, "0")}H : ${String(minutes).padStart(2, "0")}M : ${String(seconds).padStart(2, "0")}S`;
}

/**
 * Aplica el nombre del proyecto y la cuenta regresiva real al header de la página.
 */
function applyEventToHeader(event) {
  if (!event) return;
  const nameEl = document.getElementById("current-event-name");
  const countdownEl = document.getElementById("current-event-countdown");
  if (nameEl) nameEl.textContent = event.name || "Proyecto sin nombre";

  document.querySelectorAll("#current-event-name-inline").forEach((el) => {
    el.textContent = event.name || "tu evento";
  });

  if (countdownEl) {
    const tick = () => { 
      countdownEl.textContent = formatCountdown(event.event_date); 
    };
    tick();
    if (window.__galaCountdownInterval) clearInterval(window.__galaCountdownInterval);
    window.__galaCountdownInterval = setInterval(tick, 1000);
  }
}

/**
 * Aplica el icono y estilo al badge de rol del usuario.
 */
function applyRoleBadge(role) {
  const badge = document.getElementById("role-badge");
  if (!badge) return;
  const icon = badge.querySelector(".role-badge-icon") || badge.querySelector("span");
  const normalizedRole = role || "admin";
  const map = {
    admin: { bg: "bg-tertiary/20 text-tertiary", icon: "shield_person", title: "Administrador" },
    planner: { bg: "bg-secondary/20 text-secondary", icon: "event", title: "Wedding Planner" },
    collaborator: { bg: "bg-tertiary/15 text-tertiary", icon: "badge", title: "Colaborador" },
    viewer: { bg: "bg-surface-container-high text-on-surface-variant", icon: "visibility", title: "Visualizador" }
  };
  const config = map[normalizedRole] || map.admin;
  badge.className = `w-8 h-8 rounded-full flex items-center justify-center transition-colors ${config.bg}`;
  badge.title = config.title;
  if (icon) icon.textContent = config.icon;
}

/**
 * Sistema de Notificaciones Toast Luxury Dark
 */
function showToast(message, type = "success", duration = 3500) {
  let container = document.getElementById("gala-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "gala-toast-container";
    container.className = "fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none max-w-md w-full px-4";
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

/**
 * Optimización y Adaptabilidad Móvil Global (Mobile Drawer & Responsive Engine)
 */
function initMobileEngine() {
  // Estilos compactos y responsivos ya inyectados al inicio del script.

  // Backdrop oscuro para el menú en celular
  let backdrop = document.getElementById("gala-mobile-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "gala-mobile-backdrop";
    backdrop.className = "fixed inset-0 bg-black/70 backdrop-blur-sm z-[99998] hidden opacity-0 transition-opacity duration-300 md:hidden";
    document.body.appendChild(backdrop);
  }

  const sidebar = document.getElementById("app-sidebar");
  const header = document.querySelector("header");

  // Inyectar botón de menú hamburguesa en el header si existe header y sidebar
  if (header && sidebar && !document.getElementById("gala-mobile-menu-btn")) {
    const menuBtn = document.createElement("button");
    menuBtn.id = "gala-mobile-menu-btn";
    menuBtn.className = "md:hidden w-10 h-10 rounded-xl bg-surface-container border border-tertiary/20 text-tertiary flex items-center justify-center mr-2 shadow-md hover:brightness-110";
    menuBtn.innerHTML = `<span class="material-symbols-outlined text-[24px]">menu</span>`;
    menuBtn.title = "Abrir menú";

    header.insertBefore(menuBtn, header.firstChild);

    const toggleMobileMenu = () => {
      const isOpen = sidebar.classList.toggle("mobile-open");
      if (isOpen) {
        backdrop.classList.remove("hidden");
        requestAnimationFrame(() => backdrop.classList.add("opacity-100"));
      } else {
        backdrop.classList.remove("opacity-100");
        setTimeout(() => backdrop.classList.add("hidden"), 300);
      }
    };

    menuBtn.addEventListener("click", toggleMobileMenu);
    backdrop.addEventListener("click", toggleMobileMenu);

    // Cerrar el drawer al tocar cualquier enlace del menú en móvil
    sidebar.querySelectorAll("nav a").forEach(a => {
      a.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          sidebar.classList.remove("mobile-open");
          backdrop.classList.remove("opacity-100");
          setTimeout(() => backdrop.classList.add("hidden"), 300);
        }
      });
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileEngine);
} else {
  initMobileEngine();
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
window.initMobileEngine = initMobileEngine;

