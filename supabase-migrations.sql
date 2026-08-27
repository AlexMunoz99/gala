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

-- --- políticas para PROFILES ---
DROP POLICY IF EXISTS "Permitir lectura de perfiles propios" ON profiles;
CREATE POLICY "Permitir lectura de perfiles propios" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir actualización de perfiles propios" ON profiles;
CREATE POLICY "Permitir actualización de perfiles propios" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- --- políticas para EVENTS (Eventos/Proyectos) ---
DROP POLICY IF EXISTS "Usuarios ven sus propios eventos" ON events;
CREATE POLICY "Usuarios ven sus propios eventos" ON events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios insertan sus propios eventos" ON events;
CREATE POLICY "Usuarios insertan sus propios eventos" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuarios actualizan sus propios eventos" ON events;
CREATE POLICY "Usuarios actualizan sus propios eventos" ON events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios eliminan sus propios eventos" ON events;
CREATE POLICY "Usuarios eliminan sus propios eventos" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- --- políticas para GUEST_GROUPS (Grupos de invitados) ---
DROP POLICY IF EXISTS "Manage own guest groups" ON guest_groups;
CREATE POLICY "Manage own guest groups" ON guest_groups FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND events.user_id = auth.uid()));

-- --- políticas para GUESTS (Invitados) ---
DROP POLICY IF EXISTS "Manage own guests" ON guests;
CREATE POLICY "Manage own guests" ON guests FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid()));

-- --- políticas para VENDORS (Proveedores/Presupuesto) ---
DROP POLICY IF EXISTS "Manage own vendors" ON vendors;
CREATE POLICY "Manage own vendors" ON vendors FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = vendors.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = vendors.event_id AND events.user_id = auth.uid()));

-- --- políticas para VENUES (Lugares) ---
DROP POLICY IF EXISTS "Manage own venues" ON venues;
CREATE POLICY "Manage own venues" ON venues FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = venues.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = venues.event_id AND events.user_id = auth.uid()));

-- --- políticas para TASKS (Tablero Kanban) ---
DROP POLICY IF EXISTS "Manage own tasks" ON tasks;
CREATE POLICY "Manage own tasks" ON tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = tasks.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = tasks.event_id AND events.user_id = auth.uid()));

-- --- políticas para ITINERARY_ITEMS (Itinerario) ---
DROP POLICY IF EXISTS "Manage own itinerary" ON itinerary_items;
CREATE POLICY "Manage own itinerary" ON itinerary_items FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = itinerary_items.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = itinerary_items.event_id AND events.user_id = auth.uid()));

-- --- políticas para PROGRAM_ITEMS (Programa oficial) ---
DROP POLICY IF EXISTS "Manage own program" ON program_items;
CREATE POLICY "Manage own program" ON program_items FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = program_items.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = program_items.event_id AND events.user_id = auth.uid()));

-- --- políticas para LAYOUT_ELEMENTS (Plano de asientos) ---
DROP POLICY IF EXISTS "Manage own layout" ON layout_elements;
CREATE POLICY "Manage own layout" ON layout_elements FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = layout_elements.event_id AND events.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = layout_elements.event_id AND events.user_id = auth.uid()));

-- --- políticas para SEATING_ASSIGNMENTS (Asignación de sillas) ---
DROP POLICY IF EXISTS "Manage own seating" ON seating_assignments;
CREATE POLICY "Manage own seating" ON seating_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM guests WHERE guests.id = seating_assignments.guest_id AND EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM guests WHERE guests.id = seating_assignments.guest_id AND EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid())));
