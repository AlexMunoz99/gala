// assets/supabase-client.js
// Cliente compartido de Supabase para Gala ERP.

const SUPABASE_URL = "https://uohpmpzfotuwnzuwaway.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaHBtcHpmb3R1d256dXdhd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTc3NDYsImV4cCI6MjEwMjg5Mzc0Nn0.oGXQKmEmveH95fxWzRmeIlnYCtIRFAInGSQs6RAgWNA";window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Soporte de Impersonación y Suplantación de Sesión ---
let originalSession = null;
let originalProfile = null;
let isBypassingSession = false;

(function() {
  const originalGetSession = window.supabaseClient.auth.getSession.bind(window.supabaseClient.auth);
  window.supabaseClient.auth.getSession = async function() {
    const res = await originalGetSession();
    if (!res.data?.session) return res;
    
    if (isBypassingSession) {
      return res;
    }

    isBypassingSession = true;
    try {
      if (!originalSession || originalSession.user.id !== res.data.session.user.id) {
        originalSession = JSON.parse(JSON.stringify(res.data.session));
        const { data } = await window.supabaseClient.from("profiles").select("*").eq("id", originalSession.user.id).single();
        originalProfile = data;
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
    } catch(e) {
      console.warn("Error en getSession mocked wrapper:", e);
    } finally {
      isBypassingSession = false;
    }

    return res;
  };

  const originalGetUser = window.supabaseClient.auth.getUser.bind(window.supabaseClient.auth);
  window.supabaseClient.auth.getUser = async function() {
    const res = await originalGetUser();
    if (!res.data?.user) return res;

    if (isBypassingSession) {
      return res;
    }

    isBypassingSession = true;
    try {
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
    } catch(e) {
      console.warn("Error en getUser mocked wrapper:", e);
    } finally {
      isBypassingSession = false;
    }

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
      html.sidebar-collapsed #app-sidebar .sidebar-top-btn-wrapper,
      html.sidebar-collapsed #app-sidebar .sidebar-top-btn {
        padding-left: 8px !important;
        padding-right: 8px !important;
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

// =============================================================================
// CATÁLOGO MAESTRO DE MÓDULOS DE GALA ERP
// =============================================================================
const GALA_AVAILABLE_MODULES = [
  { key: "invitados",   label: "Invitados & RSVP",   icon: "group",             path: "invitados.html",               desc: "Lista de invitados, pases y confirmaciones" },
  { key: "invitacion",  label: "Invitación Web",     icon: "auto_awesome",      path: "personalizar-invitacion.html", desc: "Diseñador interactivo, sobre 3D y portal" },
  { key: "presupuesto", label: "Presupuesto",        icon: "payments",          path: "presupuesto.html",             desc: "Control de pagos, cotizaciones y balance" },
  { key: "itinerario",  label: "Itinerario",         icon: "calendar_today",    path: "itinerario.html",              desc: "Cronograma del día, horarios y PDF" },
  { key: "lugares",     label: "Lugares",            icon: "location_on",       path: "lugares.html",                 desc: "Catálogo de sedes y disponibilidad" },
  { key: "proveedores", label: "Proveedores",        icon: "business_center",   path: "proveedores.html",             desc: "Cartera de proveedores y contratos" },
  { key: "tareas",      label: "Tareas",             icon: "check_circle",      path: "tareas.html",                  desc: "Checklist de pendientes y seguimiento" },
  { key: "programa",    label: "Programa",           icon: "list_alt",          path: "programa.html",                desc: "Minuto a minuto de la recepción" },
  { key: "asientos",    label: "Asientos",           icon: "chair",             path: "seating-materials.html",       desc: "Plano arquitectónico de salón y mesas" },
  { key: "galeria",     label: "Galería",            icon: "photo_library",     path: "post-wedding.html",            desc: "Galería de fotos y entrega de recuerdos" }
];

const GALA_MODULE_PRESETS = {
  boda: {
    name: "Boda Completa",
    icon: "favorite",
    badge: "💍 Boda",
    modules: ["invitados", "invitacion", "presupuesto", "itinerario", "lugares", "proveedores", "tareas", "programa", "asientos", "galeria"]
  },
  corporativo: {
    name: "Evento Corporativo",
    icon: "business_center",
    badge: "💼 Corporativo",
    modules: ["itinerario", "lugares", "proveedores", "presupuesto", "tareas", "programa"]
  },
  social: {
    name: "Social / XV Años / Fiesta",
    icon: "party_mode",
    badge: "🎉 Social",
    modules: ["invitados", "invitacion", "presupuesto", "itinerario", "asientos", "galeria", "tareas"]
  },
  banquete: {
    name: "Cena / Banquete Privado",
    icon: "restaurant",
    badge: "🍽️ Banquete",
    modules: ["invitados", "presupuesto", "asientos", "proveedores", "tareas"]
  },
  personalizado: {
    name: "Personalizado",
    icon: "tune",
    badge: "🛠️ Personalizado",
    modules: ["invitados", "presupuesto", "itinerario", "tareas"]
  }
};

function getEventActiveModules(event) {
  if (event && Array.isArray(event.active_modules) && event.active_modules.length > 0) {
    return event.active_modules;
  }
  const eventId = event?.id || localStorage.getItem(CURRENT_EVENT_KEY);
  if (eventId) {
    try {
      const cached = localStorage.getItem("galaEventModules_" + eventId);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
  }
  // Fallback por defecto: todos los módulos activos
  return GALA_AVAILABLE_MODULES.map(m => m.key);
}

function isModuleEnabledForEvent(moduleKey, event) {
  const active = getEventActiveModules(event);
  return active.includes(moduleKey);
}

function refreshSidebarNavigation(profile, currentEvent) {
  const sidebar = document.getElementById("app-sidebar");
  if (!sidebar) return;

  const disabledModules = profile?.disabled_modules || [];
  const eventActiveModules = getEventActiveModules(currentEvent || window.__currentEventObj);

  const moduleMappings = {
    "invitados.html": "invitados",
    "personalizar-invitacion.html": "invitacion",
    "invitacion.html": "invitacion",
    "presupuesto.html": "presupuesto",
    "itinerario.html": "itinerario",
    "lugares.html": "lugares",
    "proveedores.html": "proveedores",
    "tareas.html": "tareas",
    "programa.html": "programa",
    "seating-materials.html": "asientos",
    "post-wedding.html": "galeria"
  };

  // 1. Eliminar cualquier contenedor .sidebar-cta residual si existiera
  const bottomCta = sidebar.querySelector(".sidebar-cta");
  if (bottomCta) {
    bottomCta.remove();
  }

  // 2. Renombrar "Post-Boda" a "Galería" y filtrar según módulos activos del evento y del perfil
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
    if (mappedModule) {
      const isAccountDisabled = disabledModules.includes(mappedModule);
      const isEventDisabled = !eventActiveModules.includes(mappedModule);

      if (isAccountDisabled || isEventDisabled) {
        a.style.display = "none";
      } else {
        a.style.display = "flex";
      }
    }
  });

  // 3. Inyectar enlaces dinámicos según el rol o plan en el sidebar
  const nav = sidebar.querySelector("nav");
  if (nav && profile) {
    if (profile.plan === "agency" && !sidebar.querySelector(".agency-team-btn")) {
      const teamLink = document.createElement("a");
      teamLink.className = "flex items-center px-6 py-4 text-on-surface-variant hover:text-tertiary transition-all agency-team-btn border-l-4 border-transparent hover:border-tertiary/40";
      teamLink.href = "equipo.html";
      teamLink.innerHTML = `<span class="material-symbols-outlined nav-icon mr-4">groups</span><span class="sidebar-label">Mi Equipo</span>`;
      nav.appendChild(teamLink);
    }
    const isAdmin = profile.role === "admin" || (window.__originalUserProfile && window.__originalUserProfile.role === "admin");
    if (isAdmin && !sidebar.querySelector(".admin-panel-btn")) {
      const adminLink = document.createElement("a");
      adminLink.className = "flex items-center px-6 py-4 text-on-surface-variant hover:text-tertiary transition-all admin-panel-btn border-l-4 border-transparent hover:border-tertiary/40";
      adminLink.href = "usuarios.html";
      adminLink.innerHTML = `<span class="material-symbols-outlined nav-icon mr-4">admin_panel_settings</span><span class="sidebar-label">Panel de Admin</span>`;
      nav.appendChild(adminLink);
    }
  }
}

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
      // Fallback seguro y registro automático en profiles si no existe
      profile = {
        id: session.user.id,
        email: session.user.email,
        role: "organizador",
        plan: "standard",
        is_active: true,
        is_approved: true,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Usuario Gala"
      };
      try {
        await window.supabaseClient.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: profile.full_name,
          role: "organizador",
          plan: "standard",
          is_active: true,
          is_approved: true
        });
      } catch(e) {}
    } else {
      if (!profile.plan) profile.plan = "standard";
      if (profile.is_approved === undefined || profile.is_approved === null) profile.is_approved = true;
      if (profile.is_active === undefined || profile.is_active === null) profile.is_active = true;
    }

    let originalProfile = profile;
    window.__originalUserProfile = originalProfile;
    window.__currentUserProfile = profile;

    // --- Soporte para Modo Impersonación de Admin ---
    const impersonateId = localStorage.getItem("galaImpersonateUserId");
    if (impersonateId && originalProfile.role === "admin") {
      try {
        const { data: impProfile } = await window.supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", impersonateId)
          .single();
        if (impProfile) {
          profile = impProfile;
          window.__currentUserProfile = profile;
        }
      } catch(e) {
        console.warn("Error al cargar perfil impersonado:", e);
      }
    }

    const onPendingPage = window.location.pathname.endsWith("pendiente-aprobacion.html");
    // Solo bloquear si la cuenta fue explícitamente suspendida por el Administrador (is_active === false)
    if (profile && profile.is_active === false && profile.role !== "admin" && !onPendingPage) {
      window.location.href = "pendiente-aprobacion.html";
      return null;
    }
    if (onPendingPage && profile && profile.is_active !== false) {
      window.location.href = "proyectos.html";
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
      "lugares.html": "lugares",
      "proveedores.html": "proveedores",
      "post-wedding.html": "galeria"
    };

    const currentPageFile = path.substring(path.lastIndexOf("/") + 1);
    const moduleName = moduleMappings[currentPageFile];

    if (moduleName && disabledModules.includes(moduleName)) {
      window.showToast(`El módulo "${moduleName.toUpperCase()}" está desactivado para tu cuenta.`, "error");
      setTimeout(() => { window.location.href = "proyectos.html"; }, 1000);
      return null;
    }

    // Reestructuración y filtrado del sidebar
    setTimeout(() => {
      refreshSidebarNavigation(profile, null);
    }, 10);

    // --- Inyectar banner flotante de Impersonación ---
    if (impersonateId && originalProfile && originalProfile.role === "admin") {
      setTimeout(() => {
        if (!document.getElementById("gala-impersonation-banner")) {
          const banner = document.createElement("div");
          banner.id = "gala-impersonation-banner";
          banner.className = "fixed top-0 left-0 right-0 h-10 bg-[#e9c349] text-[#3c2f00] z-[99999] flex items-center justify-center gap-3 text-xs font-bold shadow-md px-4";
          banner.innerHTML = `
            <span>Modo Impersonación: Estás viendo la cuenta de <strong>${profile.full_name || profile.email || impersonateId}</strong></span>
            <button id="btn-stop-impersonate" class="px-2.5 py-1 bg-[#3c2f00] text-[#e9c349] rounded hover:brightness-110 transition-all font-semibold uppercase text-[9px] cursor-pointer">Volver a mi Panel de Admin</button>
          `;
          document.body.prepend(banner);
          document.body.style.paddingTop = "40px";
          
          document.getElementById("btn-stop-impersonate")?.addEventListener("click", () => {
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
        window.__currentEventObj = latest[0];
        refreshSidebarNavigation(originalProfile || window.__currentUserProfile, latest[0]);
        return latest[0];
      }
      localStorage.removeItem(CURRENT_EVENT_KEY);
      window.location.href = "proyectos.html";
      return null;
    }
    window.__currentEventObj = event;
    refreshSidebarNavigation(originalProfile || window.__currentUserProfile, event);
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
  window.__currentEventObj = event;
  refreshSidebarNavigation(originalProfile || window.__currentUserProfile, event);
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
    <span class="text-xs font-medium leading-snug flex-1">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-4", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("translate-y-4", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Modal de Confirmación Asíncrono Personalizado
 */
function showConfirmDialog({ title = "Confirmar Acción", message = "¿Estás seguro?", confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = true }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[999999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 opacity-0 transition-opacity duration-200";
    
    const confirmBtnClass = isDestructive
      ? "bg-error text-on-error hover:brightness-110 shadow-error/20"
      : "bg-tertiary text-on-tertiary hover:brightness-110 shadow-tertiary/20";

    overlay.innerHTML = `
      <div class="bg-surface-container-low border border-tertiary/20 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 transform scale-95 transition-transform duration-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full ${isDestructive ? 'bg-error/15 text-error border border-error/30' : 'bg-tertiary/15 text-tertiary border border-tertiary/30'} flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[20px]">${isDestructive ? 'warning' : 'help'}</span>
          </div>
          <h3 class="font-headline-lg text-lg text-on-surface font-semibold leading-tight">${title}</h3>
        </div>
        <p class="text-xs text-on-surface-variant leading-relaxed">${message}</p>
        <div class="flex items-center justify-end gap-3 pt-2">
          <button id="dialog-cancel-btn" class="px-4 py-2.5 rounded-xl border border-tertiary/20 text-on-surface-variant hover:bg-surface-container text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">${cancelText}</button>
          <button id="dialog-confirm-btn" class="px-5 py-2.5 rounded-xl ${confirmBtnClass} text-xs font-bold uppercase tracking-wider shadow-lg transition-all cursor-pointer">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.remove("opacity-0");
      overlay.querySelector("div").classList.remove("scale-95");
    });

    const cleanup = (result) => {
      overlay.classList.add("opacity-0");
      overlay.querySelector("div").classList.add("scale-95");
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    overlay.querySelector("#dialog-confirm-btn").addEventListener("click", () => cleanup(true));
    overlay.querySelector("#dialog-cancel-btn").addEventListener("click", () => cleanup(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/**
 * Optimización y Adaptabilidad Móvil Global (Mobile Drawer & Responsive Engine)
 */
function initMobileEngine() {
  const isMobile = window.innerWidth < 768;
  let backdrop = document.getElementById("gala-sidebar-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "gala-sidebar-backdrop";
    backdrop.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden transition-opacity duration-300 opacity-0 md:hidden";
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

/**
 * Compresor de Imágenes de Alto Rendimiento en el Navegador.
 * Reduce fotos de 5MB-15MB a WebP/JPEG optimizados (~150KB-300KB) para subida ultrarrápida.
 */
function compressImage(file, options = {}) {
  const maxWidth = options.maxWidth || 1600;
  const maxHeight = options.maxHeight || 1600;
  const quality = options.quality !== undefined ? options.quality : 0.82;
  const outputType = options.outputType || "image/webp";

  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      return reject(new Error("El archivo seleccionado no es una imagen válida."));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL(outputType, quality);
        } catch(err) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        
        canvas.toBlob((blob) => {
          resolve({
            dataUrl,
            blob: blob || file,
            width,
            height,
            originalSize: file.size,
            compressedSize: blob ? blob.size : dataUrl.length
          });
        }, outputType, quality);
      };
      img.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

// Monitor de Conexión de Red (Offline / Online Resilience)
window.addEventListener("offline", () => {
  showToast("Conexión perdida. Los cambios se sincronizarán al reconectar.", "info", 5000);
});
window.addEventListener("online", () => {
  showToast("Conexión restablecida con éxito.", "success", 3000);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileEngine);
} else {
  initMobileEngine();
}

window.GALA_AVAILABLE_MODULES = GALA_AVAILABLE_MODULES;
window.GALA_MODULE_PRESETS = GALA_MODULE_PRESETS;
window.getEventActiveModules = getEventActiveModules;
window.isModuleEnabledForEvent = isModuleEnabledForEvent;
window.refreshSidebarNavigation = refreshSidebarNavigation;

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
window.compressImage = compressImage;
