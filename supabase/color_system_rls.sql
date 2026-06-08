-- Políticas RLS para Sistema de Cores
-- Habilitar RLS em todas as tabelas

ALTER TABLE color_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE original_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sublimated_color_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_color_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_image_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_recommendations ENABLE ROW LEVEL SECURITY;

-- Políticas para color_libraries (leitura pública, escrita apenas admin)
CREATE POLICY "Public can read color libraries" 
  ON color_libraries FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert color libraries" 
  ON color_libraries FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update color libraries" 
  ON color_libraries FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete color libraries" 
  ON color_libraries FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para fabric_types (leitura pública, escrita apenas admin)
CREATE POLICY "Public can read fabric types" 
  ON fabric_types FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert fabric types" 
  ON fabric_types FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update fabric types" 
  ON fabric_types FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete fabric types" 
  ON fabric_types FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para original_colors (leitura pública, escrita apenas admin)
CREATE POLICY "Public can read original colors" 
  ON original_colors FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert original colors" 
  ON original_colors FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update original colors" 
  ON original_colors FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete original colors" 
  ON original_colors FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para sublimated_color_samples (leitura pública, escrita apenas admin)
CREATE POLICY "Public can read sublimated samples" 
  ON sublimated_color_samples FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert sublimated samples" 
  ON sublimated_color_samples FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update sublimated samples" 
  ON sublimated_color_samples FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete sublimated samples" 
  ON sublimated_color_samples FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para customer_color_analyses (ligadas ao pedido)
CREATE POLICY "Users can read analyses from their orders" 
  ON customer_color_analyses FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = customer_color_analyses.order_id
      AND (
        o.client_id IN (
          SELECT id FROM clients WHERE created_by = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
        )
      )
    )
  );

CREATE POLICY "Admins and designers can insert analyses" 
  ON customer_color_analyses FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins and designers can update analyses" 
  ON customer_color_analyses FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete analyses" 
  ON customer_color_analyses FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para detected_image_colors (ligadas à análise)
CREATE POLICY "Users can read detected colors from their analyses" 
  ON detected_image_colors FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM customer_color_analyses a
      WHERE a.id = detected_image_colors.analysis_id
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = a.order_id
        AND (
          o.client_id IN (
            SELECT id FROM clients WHERE created_by = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
          )
        )
      )
    )
  );

CREATE POLICY "Admins and designers can insert detected colors" 
  ON detected_image_colors FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins and designers can update detected colors" 
  ON detected_image_colors FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete detected colors" 
  ON detected_image_colors FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para color_recommendations (ligadas à análise)
CREATE POLICY "Users can read recommendations from their analyses" 
  ON color_recommendations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM customer_color_analyses a
      WHERE a.id = color_recommendations.analysis_id
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = a.order_id
        AND (
          o.client_id IN (
            SELECT id FROM clients WHERE created_by = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
          )
        )
      )
    )
  );

CREATE POLICY "Admins and designers can insert recommendations" 
  ON color_recommendations FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins and designers can update recommendations" 
  ON color_recommendations FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete recommendations" 
  ON color_recommendations FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );
