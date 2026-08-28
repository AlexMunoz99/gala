-- GALA ERP - MIGRACIONES DE BASE DE DATOS Y RLS
-- Copia y ejecuta este script completo en tu Supabase SQL Editor.

-- ==========================================
-- 1. ESTRUCTURA DE TABLAS (ALTERACIONES)
-- ==========================================

-- Añadir columna de plan a los perfiles de usuario
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

-- Añadir tipo de evento a la tabla events (ej: boda, cumpleaños, etc.)
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'boda';

-- Añadir columna de agradecimiento enviado en invitados (Fase 6)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS thank_you_sent boolean DEFAULT false;

-- Presupuesto planeado total del evento
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget_total numeric DEFAULT 0;

-- Tipo de gasto (proveedor vs gasto externo)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS expense_type text DEFAULT 'vendor';

-- Asegurar que la columna user_id en events tiene el valor por defecto correcto
ALTER TABLE events ALTER COLUMN user_id SET DEFAULT auth.uid();


-- ==========================================
-- 2. POLÍTICAS RLS (ROW-LEVEL SECURITY)
-- ==========================================

-- Habilitar RLS en todas las tablas por seguridad
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;

-- --- Función auxiliar para verificar si el usuario es Admin ---
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- --- políticas para PROFILES ---
-- Habilitamos RLS en profiles para producción y agregamos políticas protegidas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de perfil propio o admins leen todo" ON profiles;
CREATE POLICY "Permitir lectura de perfil propio o admins leen todo" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Permitir actualización de perfil propio o admins editan todo" ON profiles;
CREATE POLICY "Permitir actualización de perfil propio o admins editan todo" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

-- Disparador (Trigger) para evitar que usuarios comunes escalen privilegios
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS trigger SECURITY DEFINER AS $$
BEGIN
  -- Si el usuario logueado no es administrador, revertimos cualquier cambio en columnas protegidas
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    NEW.role := OLD.role;
    NEW.plan := OLD.plan;
    NEW.is_active := OLD.is_active;
    NEW.disabled_modules := OLD.disabled_modules;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_profile_columns ON profiles;
CREATE TRIGGER tr_protect_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_columns();

-- --- políticas para EVENTS (Eventos/Proyectos) ---
DROP POLICY IF EXISTS "Usuarios ven sus propios eventos" ON events;
CREATE POLICY "Usuarios ven sus propios eventos" ON events
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Usuarios insertan sus propios eventos" ON events;
CREATE POLICY "Usuarios insertan sus propios eventos" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL OR is_admin());

DROP POLICY IF EXISTS "Usuarios actualizan sus propios eventos" ON events;
CREATE POLICY "Usuarios actualizan sus propios eventos" ON events
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Usuarios eliminan sus propios eventos" ON events;
CREATE POLICY "Usuarios eliminan sus propios eventos" ON events
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- --- políticas para GUEST_GROUPS (Grupos de invitados) ---
DROP POLICY IF EXISTS "Manage own guest groups" ON guest_groups;
CREATE POLICY "Manage own guest groups" ON guest_groups FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para GUESTS (Invitados) ---
DROP POLICY IF EXISTS "Manage own guests" ON guests;
CREATE POLICY "Manage own guests" ON guests FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para VENDORS (Proveedores/Presupuesto) ---
DROP POLICY IF EXISTS "Manage own vendors" ON vendors;
CREATE POLICY "Manage own vendors" ON vendors FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = vendors.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = vendors.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para VENUES (Lugares) ---
DROP POLICY IF EXISTS "Manage own venues" ON venues;
CREATE POLICY "Manage own venues" ON venues FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = venues.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = venues.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para TASKS (Tablero Kanban) ---
DROP POLICY IF EXISTS "Manage own tasks" ON tasks;
CREATE POLICY "Manage own tasks" ON tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = tasks.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = tasks.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para ITINERARY_ITEMS (Itinerario) ---
DROP POLICY IF EXISTS "Manage own itinerary" ON itinerary_items;
CREATE POLICY "Manage own itinerary" ON itinerary_items FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = itinerary_items.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = itinerary_items.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para PROGRAM_ITEMS (Programa oficial) ---
DROP POLICY IF EXISTS "Manage own program" ON program_items;
CREATE POLICY "Manage own program" ON program_items FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = program_items.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = program_items.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para LAYOUT_ELEMENTS (Plano de asientos) ---
DROP POLICY IF EXISTS "Manage own layout" ON layout_elements;
CREATE POLICY "Manage own layout" ON layout_elements FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = layout_elements.event_id AND (events.user_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = layout_elements.event_id AND (events.user_id = auth.uid() OR is_admin())));

-- --- políticas para SEATING_ASSIGNMENTS (Asignación de sillas) ---
DROP POLICY IF EXISTS "Manage own seating" ON seating_assignments;
CREATE POLICY "Manage own seating" ON seating_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM guests WHERE guests.id = seating_assignments.guest_id AND EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND (events.user_id = auth.uid() OR is_admin()))))
  WITH CHECK (EXISTS (SELECT 1 FROM guests WHERE guests.id = seating_assignments.guest_id AND EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND (events.user_id = auth.uid() OR is_admin()))));


-- ==========================================
-- 3. TABLAS DE LA BÓVEDA POST-BODA (FASE 6)
-- ==========================================

CREATE TABLE IF NOT EXISTS event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  uploaded_by text DEFAULT 'Invitado',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES event_photos(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo en fotos" ON event_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en comentarios" ON event_photo_comments FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- FASE 7: CONTROL ADMINISTRATIVO Y MULTICUENTA (AGENCY)
-- ==========================================

-- Columnas de control en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disabled_modules text[] DEFAULT '{}';

-- Tabla team_members para colaboracion de equipos
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  member_email text NOT NULL,
  role text DEFAULT 'editor',
  created_at timestamp with time zone DEFAULT now()
);

-- Politicas RLS para team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir consulta global en team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Permitir gestion al dueno agency" ON team_members FOR ALL USING (auth.uid() = agency_user_id) WITH CHECK (auth.uid() = agency_user_id);
