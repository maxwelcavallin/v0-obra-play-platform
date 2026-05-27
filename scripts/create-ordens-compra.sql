CREATE TABLE IF NOT EXISTS ordens_compra (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cotacao_id           UUID REFERENCES cotacoes(id) ON DELETE SET NULL,
  identifier           VARCHAR(20) NOT NULL UNIQUE,
  supplier_name        TEXT NOT NULL,
  supplier_cnpj        VARCHAR(20),
  supplier_email       TEXT,
  supplier_phone       VARCHAR(30),
  items                JSONB NOT NULL DEFAULT '[]',
  subtotal             NUMERIC(14,2) NOT NULL DEFAULT 0,
  freight              NUMERIC(14,2) NOT NULL DEFAULT 0,
  total                NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method       INTEGER,
  arrival_estimate     TIMESTAMPTZ,
  obraplay_answer_id   INTEGER,
  status               VARCHAR(50) NOT NULL DEFAULT 'Aguardando fornecedor',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ordens_compra_company ON ordens_compra(company_id);
CREATE INDEX IF NOT EXISTS idx_ordens_compra_cotacao ON ordens_compra(cotacao_id);
