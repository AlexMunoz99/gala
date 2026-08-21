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
  return { user: session.user, profile };
}

/** Cierra sesión y regresa a login.html */
async function signOut() {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

window.requireAuth = requireAuth;
window.signOut = signOut;
