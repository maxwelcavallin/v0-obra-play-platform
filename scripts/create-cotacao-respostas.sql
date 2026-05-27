-- Armazena cada resposta de fornecedor recebida via webhook do ObraPlay
CREATE TABLE IF NOT EXISTS cotacao_respostas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id            UUID NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
  cotacao_fornecedor_id UUID REFERENCES cotacao_fornecedores(id) ON DELETE SET NULL,

  -- Identificadores ObraPlay
  op_answer_id          INTEGER NOT NULL,
  supplier_foreign_id   TEXT,

  -- Dados da resposta
  payment_method        INTEGER,
  installments          TEXT,
  installments_obs      TEXT,
  arrival_estimate      TIMESTAMPTZ,
  valid_until           TIMESTAMPTZ,
  observations          TEXT,
  answered_at           TIMESTAMPTZ,

  -- Payload bruto para auditoria
  raw_payload           JSONB,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(cotacao_id, op_answer_id)
);

-- Itens respondidos por fornecedor
CREATE TABLE IF NOT EXISTS cotacao_resposta_itens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id           UUID NOT NULL REFERENCES cotacao_respostas(id) ON DELETE CASCADE,
  cotacao_item_id       UUID REFERENCES cotacao_itens(id) ON DELETE SET NULL,

  -- ID do item no ObraPlay (answered_items[].id)
  op_item_id            INTEGER NOT NULL,

  answered              BOOLEAN DEFAULT false,
  available             BOOLEAN DEFAULT false,
  unit_price_micros     BIGINT,       -- preço unitário em micros (÷1.000.000 = valor real)
  quantity              NUMERIC,
  total_quantity_micros BIGINT,
  discount              NUMERIC DEFAULT 0,
  total_discount_micros BIGINT,

  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Frete por endereço de entrega
CREATE TABLE IF NOT EXISTS cotacao_resposta_fretes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id           UUID NOT NULL REFERENCES cotacao_respostas(id) ON DELETE CASCADE,
  op_address_id         INTEGER NOT NULL,
  freight               NUMERIC,
  total_freight_micros  BIGINT,
  free_shipping         BOOLEAN DEFAULT false,
  answered              BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now()
);
