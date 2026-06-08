-- MÓDULO 23 - UPLOAD DE ARQUIVOS ROBUSTO
-- Tabela para versionamento de arquivos

CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  preview_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_versions_original_name ON file_versions(original_name);
CREATE INDEX IF NOT EXISTS idx_file_versions_uploaded_by ON file_versions(uploaded_by);

ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view file versions"
  ON file_versions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert file versions"
  ON file_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own file versions"
  ON file_versions FOR DELETE
  USING (uploaded_by = auth.uid());
