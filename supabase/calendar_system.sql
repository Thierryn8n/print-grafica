-- ============================================
-- SISTEMA DE CALENDÁRIO
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela de eventos do calendário
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'deadline', 'meeting', 'maintenance', 'delivery', 'reminder', 'other'
  )),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3b82f6',
  reminder_minutes INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  reminder_time TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end ON calendar_events(end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_order ON calendar_events(order_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_reminders_event ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time);

-- Habilitar RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their own events" ON calendar_events FOR ALL USING (
  user_id = auth.uid() OR created_by = auth.uid()
);

CREATE POLICY "Admins can manage all events" ON calendar_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read all events" ON calendar_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
);

CREATE POLICY "Users can manage their own reminders" ON reminders FOR ALL USING (
  EXISTS (
    SELECT 1 FROM calendar_events e
    WHERE e.id = reminders.event_id
    AND (e.user_id = auth.uid() OR e.created_by = auth.uid())
  )
);

CREATE POLICY "Admins can manage all reminders" ON reminders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Sistema de calendário criado com sucesso!' as status;
