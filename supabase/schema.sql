-- Supabase Schema for PrintFlow Studio
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'designer' CHECK (role IN ('admin', 'designer', 'gerente', 'producao', 'financeiro', 'vendedor', 'cliente')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  avatar_url TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  team_name TEXT,
  product_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Grade de tamanhos
  size_pp INTEGER DEFAULT 0,
  size_p INTEGER DEFAULT 0,
  size_m INTEGER DEFAULT 0,
  size_g INTEGER DEFAULT 0,
  size_gg INTEGER DEFAULT 0,
  size_xg INTEGER DEFAULT 0,
  size_xgg INTEGER DEFAULT 0,
  size_infantil INTEGER DEFAULT 0,
  size_custom TEXT,
  
  -- Modelo da peça
  model TEXT DEFAULT 'manga-curta' CHECK (model IN (
    'manga-curta', 'manga-longa', 'gola-careca', 'gola-alta', 
    'gola-polo', 'regata', 'short', 'conjunto', 'outro'
  )),
  
  description TEXT,
  specifications JSONB DEFAULT '{}',
  
  -- Cores e arte
  colors TEXT,
  logos_url TEXT,
  reference_image_url TEXT,
  ai_mockup_url TEXT,
  
  status TEXT NOT NULL DEFAULT 'novo-pedido' CHECK (status IN (
    'novo-pedido', 'aguardando-info', 'em-criacao', 'revisao-interna', 
    'mockup-pronto', 'enviado-aprovacao', 'aprovado-cliente', 'ajustes-solicitados',
    'arte-finalizada', 'enviado-producao', 'sublimacao', 'finalizado', 'entregue'
  )),
  
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  deadline TIMESTAMPTZ,
  total_value NUMERIC(10, 2),
  custo_total NUMERIC(10, 2),
  lucro_estimado NUMERIC(10, 2),
  
  designer_id UUID REFERENCES profiles(id),
  approval_token TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  client_observations TEXT,
  rejection_reason TEXT,
  notes TEXT,
  
  -- Checklist
  checklist_logo_checked BOOLEAN DEFAULT FALSE,
  checklist_name_checked BOOLEAN DEFAULT FALSE,
  checklist_number_checked BOOLEAN DEFAULT FALSE,
  checklist_colors_checked BOOLEAN DEFAULT FALSE,
  checklist_sizes_checked BOOLEAN DEFAULT FALSE,
  checklist_front_checked BOOLEAN DEFAULT FALSE,
  checklist_back_checked BOOLEAN DEFAULT FALSE,
  checklist_high_quality BOOLEAN DEFAULT FALSE,
  checklist_ready_print BOOLEAN DEFAULT FALSE,
  checklist_client_approved BOOLEAN DEFAULT FALSE,
  
  created_by UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create order_files table
CREATE TABLE IF NOT EXISTS order_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  is_mockup BOOLEAN DEFAULT FALSE,
  is_final BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_logs table (Auditoria avançada)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES profiles(id),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create access_logs table (Auditoria de acessos)
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'PROFILE_UPDATE')),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ip_whitelist table (IP Whitelist para empresas)
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  cidr TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, ip_address)
);

-- Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      auth.uid(),
      NULL,
      to_jsonb(NEW),
      NULL,
      NULL,
      NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Calculate changed fields
    SELECT ARRAY_AGG(key) INTO changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(to_jsonb(OLD))
      WHERE to_jsonb(OLD)->>key IS DISTINCT FROM to_jsonb(NEW)->>key
    ) t;
    
    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values,
        changed_fields,
        ip_address,
        user_agent
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        'UPDATE',
        auth.uid(),
        to_jsonb(OLD),
        to_jsonb(NEW),
        changed_fields,
        NULL,
        NULL
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD),
      NULL,
      NULL,
      NULL,
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create audit triggers for main tables
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON system_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'designer'),
    'pending'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can update profiles" 
  ON profiles FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Service role can insert profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (true);

-- Clients policies
CREATE POLICY "Authenticated users can view clients" 
  ON clients FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Admins can insert clients" 
  ON clients FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update clients" 
  ON clients FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Orders policies
CREATE POLICY "Authenticated users can view orders" 
  ON orders FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Admins can insert orders" 
  ON orders FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update orders" 
  ON orders FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Designers can update assigned orders" 
  ON orders FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'designer' AND status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'designer' AND status = 'approved'
    )
  );

-- Order files policies
CREATE POLICY "Authenticated users can view order files" 
  ON order_files FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert order files" 
  ON order_files FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Activity logs policies
CREATE POLICY "Authenticated users can view activity logs" 
  ON activity_logs FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert activity logs" 
  ON activity_logs FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- System settings policies
CREATE POLICY "Authenticated users can view system settings" 
  ON system_settings FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update system settings" 
  ON system_settings FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" 
  ON audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Access logs policies
CREATE POLICY "Admins can view access logs" 
  ON access_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Users can view their own access logs" 
  ON access_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- IP whitelist policies
CREATE POLICY "Admins can view ip whitelist" 
  ON ip_whitelist FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can insert ip whitelist" 
  ON ip_whitelist FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete ip whitelist" 
  ON ip_whitelist FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_number TEXT;
  formatted_date TEXT;
  seq_value TEXT;
BEGIN
  formatted_date := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_value := LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
  order_number := 'PED-' || formatted_date || '-' || seq_value;
  RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- Create trigger to generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Insert initial system settings
INSERT INTO system_settings (key, value) 
VALUES 
  ('max_admins', '2'::jsonb),
  ('company_name', '"GN Sublimais"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create fabrics table (Tecidos)
CREATE TABLE IF NOT EXISTS fabrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  base_price_complete NUMERIC(10, 2) DEFAULT 0,
  base_price_shirt_only NUMERIC(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create shirt_types table (Tipos de Camisa)
CREATE TABLE IF NOT EXISTS shirt_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'basic' CHECK (category IN ('basic', 'sports', 'fashion', 'custom')),
  has_sleeves BOOLEAN DEFAULT TRUE,
  sleeve_type TEXT CHECK (sleeve_type IN ('short', 'long', 'none')),
  collar_type TEXT CHECK (collar_type IN ('round', 'v-neck', 'polo', 'none', 'raglan')),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create short_types table (Tipos de Short)
CREATE TABLE IF NOT EXISTS short_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'basic' CHECK (category IN ('basic', 'sports', 'fashion', 'custom')),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create public_forms table (Formulários Públicos)
CREATE TABLE IF NOT EXISTS public_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_token TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  team_name TEXT,
  event_type TEXT CHECK (event_type IN ('interclass', 'football', 'commemorative', 'corporate', 'other')),
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create form_items table (Itens do Formulário)
CREATE TABLE IF NOT EXISTS form_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES public_forms(id) ON DELETE CASCADE,
  set_name TEXT NOT NULL,
  color TEXT NOT NULL,
  fabric_id UUID REFERENCES fabrics(id),
  shirt_type_id UUID REFERENCES shirt_types(id),
  short_type_id UUID REFERENCES short_types(id),
  has_name BOOLEAN DEFAULT FALSE,
  has_number BOOLEAN DEFAULT FALSE,
  item_type TEXT NOT NULL CHECK (item_type IN ('complete', 'shirt_only')),
  total_quantity INTEGER DEFAULT 0,
  estimated_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create form_participants table (Participantes do Formulário)
CREATE TABLE IF NOT EXISTS form_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_item_id UUID NOT NULL REFERENCES form_items(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  number TEXT,
  shirt_size TEXT CHECK (shirt_size IN ('PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'infantil')),
  short_size TEXT CHECK (short_size IN ('PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'infantil', 'none')),
  observations TEXT,
  -- Sport-specific fields (JSONB for flexibility)
  sport_type TEXT CHECK (sport_type IN ('futebol', 'basquete', 'volei', 'handebol', 'corrida', 'ciclismo', 'none')),
  sport_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create form_concept_uploads table (Uploads de Conceitos)
CREATE TABLE IF NOT EXISTS form_concept_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES public_forms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create triggers for updated_at on new tables
DROP TRIGGER IF EXISTS update_fabrics_updated_at ON fabrics;
CREATE TRIGGER update_fabrics_updated_at 
  BEFORE UPDATE ON fabrics 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shirt_types_updated_at ON shirt_types;
CREATE TRIGGER update_shirt_types_updated_at 
  BEFORE UPDATE ON shirt_types 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_short_types_updated_at ON short_types;
CREATE TRIGGER update_short_types_updated_at 
  BEFORE UPDATE ON short_types 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_public_forms_updated_at ON public_forms;
CREATE TRIGGER update_public_forms_updated_at 
  BEFORE UPDATE ON public_forms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_items_updated_at ON form_items;
CREATE TRIGGER update_form_items_updated_at 
  BEFORE UPDATE ON form_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_participants_updated_at ON form_participants;
CREATE TRIGGER update_form_participants_updated_at 
  BEFORE UPDATE ON form_participants 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shirt_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_concept_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fabrics
CREATE POLICY "Authenticated users can view fabrics" 
  ON fabrics FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert fabrics" 
  ON fabrics FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update fabrics" 
  ON fabrics FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete fabrics" 
  ON fabrics FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- RLS Policies for shirt_types
CREATE POLICY "Authenticated users can view shirt_types" 
  ON shirt_types FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert shirt_types" 
  ON shirt_types FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update shirt_types" 
  ON shirt_types FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete shirt_types" 
  ON shirt_types FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- RLS Policies for short_types
CREATE POLICY "Authenticated users can view short_types" 
  ON short_types FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert short_types" 
  ON short_types FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update short_types" 
  ON short_types FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete short_types" 
  ON short_types FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- RLS Policies for public_forms
CREATE POLICY "Public can access forms by token" 
  ON public_forms FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert public_forms" 
  ON public_forms FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update public_forms" 
  ON public_forms FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete public_forms" 
  ON public_forms FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- RLS Policies for form_items
CREATE POLICY "Public can access form_items by form" 
  ON form_items FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert form_items" 
  ON form_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update form_items" 
  ON form_items FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete form_items" 
  ON form_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- RLS Policies for form_participants
CREATE POLICY "Public can access form_participants by form" 
  ON form_participants FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert form_participants" 
  ON form_participants FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update form_participants" 
  ON form_participants FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete form_participants" 
  ON form_participants FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- RLS Policies for form_concept_uploads
CREATE POLICY "Public can access form_concept_uploads by form" 
  ON form_concept_uploads FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert form_concept_uploads" 
  ON form_concept_uploads FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete form_concept_uploads" 
  ON form_concept_uploads FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Insert initial fabric data
INSERT INTO fabrics (name, description, base_price_complete, base_price_shirt_only, sort_order) 
VALUES 
  ('Dry Fit', 'Tecido Dry Fit de alta qualidade', 40.00, 25.00, 1),
  ('Helanca', 'Tecido Helanca elasticizado', 45.00, 28.00, 2),
  ('Poliamida', 'Tecido Poliamida resistente', 50.00, 32.00, 3),
  ('Algodão', 'Tecido Algodão confortável', 35.00, 22.00, 4),
  ('Microfibra', 'Tecido Microfibra leve', 38.00, 24.00, 5)
ON CONFLICT (name) DO NOTHING;

-- Insert initial shirt types
INSERT INTO shirt_types (name, description, has_sleeves, sleeve_type, collar_type, sort_order) 
VALUES 
  ('Regata', 'Camisa regata sem mangas', false, 'none', 'none', 1),
  ('Manga Curta Gola Redonda', 'Camisa manga curta com gola redonda', true, 'short', 'round', 2),
  ('Manga Curta Gola V', 'Camisa manga curta com gola V', true, 'short', 'v-neck', 3),
  ('Manga Comprida Gola Redonda', 'Camisa manga comprida com gola redonda', true, 'long', 'round', 4),
  ('Manga Comprida Gola V', 'Camisa manga comprida com gola V', true, 'long', 'v-neck', 5),
  ('Gola Polo', 'Camisa com gola polo', true, 'short', 'polo', 6),
  ('Raglan', 'Camisa estilo raglan', true, 'short', 'raglan', 7),
  ('Babylook Gola Redonda', 'Camisa babylook com gola redonda', true, 'short', 'round', 8),
  ('Babylook Gola V', 'Camisa babylook com gola V', true, 'short', 'v-neck', 9)
ON CONFLICT (name) DO NOTHING;

-- Insert initial short types
INSERT INTO short_types (name, description, sort_order) 
VALUES 
  ('Short Básico', 'Short básico esportivo', 1),
  ('Short Com Elástico', 'Short com elástico na cintura', 2),
  ('Short Ciclista', 'Short estilo ciclista', 3),
  ('Short Boardshort', 'Short estilo boardshort', 4),
  ('Short Térmico', 'Short térmico para frio', 5)
ON CONFLICT (name) DO NOTHING;

-- Create digital_assets table (DAM - Digital Asset Management)
CREATE TABLE IF NOT EXISTS digital_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  category TEXT NOT NULL DEFAULT 'outros' CHECK (category IN (
    'logos', 'vetores', 'fontes', 'mockups', 'fotos', 'arquivos_producao', 'outros'
  )),
  tags TEXT[] DEFAULT '{}',
  client_id UUID REFERENCES clients(id),
  order_id UUID REFERENCES orders(id),
  metadata JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for updated_at on digital_assets
DROP TRIGGER IF EXISTS update_digital_assets_updated_at ON digital_assets;
CREATE TRIGGER update_digital_assets_updated_at 
  BEFORE UPDATE ON digital_assets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on digital_assets
ALTER TABLE digital_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for digital_assets
CREATE POLICY "Authenticated users can view digital_assets" 
  ON digital_assets FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Admins can insert digital_assets" 
  ON digital_assets FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update digital_assets" 
  ON digital_assets FOR UPDATE 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete digital_assets" 
  ON digital_assets FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Designers can insert digital_assets" 
  ON digital_assets FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'designer' AND status = 'approved'
    )
  );

CREATE POLICY "Designers can update digital_assets" 
  ON digital_assets FOR UPDATE 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'designer' AND status = 'approved'
    )
  );

-- Create indexes for digital_assets
CREATE INDEX IF NOT EXISTS idx_digital_assets_category ON digital_assets(category);
CREATE INDEX IF NOT EXISTS idx_digital_assets_client_id ON digital_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_digital_assets_order_id ON digital_assets(order_id);
CREATE INDEX IF NOT EXISTS idx_digital_assets_tags ON digital_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_digital_assets_created_by ON digital_assets(created_by);
CREATE INDEX IF NOT EXISTS idx_digital_assets_name_trgm ON digital_assets USING gin(name gin_trgm_ops);

-- Create companies table for multi-tenant SaaS architecture
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for updated_at on companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Authenticated users can view companies" 
  ON companies FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert companies" 
  ON companies FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update companies" 
  ON companies FOR UPDATE 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create index for companies
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Performance indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_deadline ON orders(deadline);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_designer ON orders(designer_id);

-- Performance indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_order ON activity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Performance indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Performance indexes for digital_assets
CREATE INDEX IF NOT EXISTS idx_digital_assets_category ON digital_assets(category);
CREATE INDEX IF NOT EXISTS idx_digital_assets_client ON digital_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_digital_assets_order ON digital_assets(order_id);
