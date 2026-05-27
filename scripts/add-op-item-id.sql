-- Adiciona o ID do item no ObraPlay para casamento com respostas do webhook
ALTER TABLE cotacao_itens ADD COLUMN IF NOT EXISTS op_item_id INTEGER;
