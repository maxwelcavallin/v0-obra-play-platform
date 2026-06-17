# ObraPlay Constructor — Guia de Integração para Agentes de IA

> **Versão:** 1.0  
> **Base URL:** `https://v0-obra-play-platform.vercel.app`  
> **Formato:** JSON em todas as requisições e respostas  
> **Content-Type:** `application/json`

---

## Sumário

1. [Autenticação](#1-autenticação)
2. [Conceitos e Entidades](#2-conceitos-e-entidades)
3. [Fluxo Completo — Cotação](#3-fluxo-completo--cotação)
   - 3.1 [Buscar ou criar uma Obra](#31-buscar-ou-criar-uma-obra)
   - 3.2 [Buscar Insumos disponíveis](#32-buscar-insumos-disponíveis)
   - 3.3 [Buscar Fornecedores do ObraPlay](#33-buscar-fornecedores-do-obraplay)
   - 3.4 [Criar a Cotação (local + ObraPlay)](#34-criar-a-cotação-local--obraplay)
   - 3.5 [Consultar respostas — Mapa de Cotação](#35-consultar-respostas--mapa-de-cotação)
   - 3.6 [Editar uma Cotação](#36-editar-uma-cotação)
   - 3.7 [Cancelar uma Cotação](#37-cancelar-uma-cotação)
4. [Fluxo Completo — Ordem de Compra](#4-fluxo-completo--ordem-de-compra)
   - 4.1 [Criar Ordem de Compra](#41-criar-ordem-de-compra)
   - 4.2 [Listar Ordens de Compra](#42-listar-ordens-de-compra)
5. [Referência de Status](#5-referência-de-status)
6. [Tratamento de Erros](#6-tratamento-de-erros)
7. [Fluxo Completo em Sequência (resumo)](#7-fluxo-completo-em-sequência-resumo)

---

## 1. Autenticação

Toda requisição autenticada deve incluir o token de sessão no header HTTP.

### 1.1 Obter token (login)

```
POST /api/auth/login
```

**Body:**
```json
{
  "email": "agente@empresa.com",
  "password": "senha_segura"
}
```

**Resposta 200:**
```json
{
  "user": {
    "id": "uuid-do-usuario",
    "name": "Nome do Usuário",
    "email": "agente@empresa.com",
    "phone": "+5511999999999"
  },
  "companies": [
    {
      "id": "uuid-da-empresa",
      "fantasy_name": "Construtora ABC",
      "cnpj": "12.345.678/0001-90",
      "obraplay_company_id": 123
    }
  ],
  "token": "TOKEN_DE_SESSAO_AQUI"
}
```

> **Importante:** Guarde o `token` e o `companies[0].id` (company_id). Eles serão usados em todas as requisições seguintes.

### 1.2 Enviar o token nas requisições

Inclua o token no header Authorization em **todas** as chamadas autenticadas:

```
Authorization: Bearer TOKEN_DE_SESSAO_AQUI
```

O token também é aceito via cookie `op_session_token`, mas o header Authorization é o método recomendado para agentes.

### 1.3 Encerrar sessão

```
POST /api/auth/logout
Authorization: Bearer TOKEN_DE_SESSAO_AQUI
```

---

## 2. Conceitos e Entidades

| Entidade | Descrição |
|---|---|
| `company` | Empresa construtora. Toda cotação e ordem de compra pertence a uma empresa. |
| `obra` | Obra da construtora. Fornece o endereço de entrega para a cotação. |
| `insumo` | Material ou serviço a ser cotado. Pode ser do catálogo do sistema ou personalizado. |
| `cotacao` | Solicitação de preços enviada a múltiplos fornecedores. Criada localmente e enviada ao ObraPlay simultaneamente. |
| `cotacao_item` | Um item (insumo) dentro de uma cotação, com nome, unidade e quantidade. |
| `cotacao_fornecedor` | Um fornecedor convidado para responder a cotação. |
| `cotacao_resposta` | Resposta de um fornecedor a uma cotação, recebida via webhook do ObraPlay. |
| `ordem_compra` | Ordem de compra gerada após análise do mapa de cotação, para um fornecedor específico. |

### Integração ObraPlay

A plataforma mantém um espelho local (tabela `mirror_companies`) dos fornecedores cadastrados no ObraPlay. **Todos os fornecedores adicionados a cotações devem ser fornecedores do ObraPlay** (identificados pelo `mirror_company_id`).

Quando uma cotação é criada aqui, ela é **automaticamente criada no ObraPlay** na mesma chamada. Não é necessário chamar a API do ObraPlay diretamente — a plataforma faz isso internamente.

As **respostas dos fornecedores** chegam via webhook automático do ObraPlay para a plataforma. O agente não precisa chamar o ObraPlay para obter respostas; basta consultar o mapa de cotação (seção 3.5).

---

## 3. Fluxo Completo — Cotação

### 3.1 Buscar ou criar uma Obra

Toda cotação precisa de uma obra para obter o endereço de entrega.

**Listar obras da empresa:**
```
GET /api/obras?company_id={company_id}
Authorization: Bearer TOKEN
```

**Resposta:**
```json
[
  {
    "id": "uuid-da-obra",
    "name": "Edifício Residencial Alpha",
    "status": "Em andamento",
    "delivery_street": "Rua das Flores",
    "delivery_number": "123",
    "delivery_neighbourhood": "Centro",
    "delivery_city": "São Paulo",
    "delivery_state": "SP",
    "delivery_zipcode": "01310-100"
  }
]
```

**Criar uma obra (se necessário):**
```
POST /api/obras
Authorization: Bearer TOKEN
```

**Body:**
```json
{
  "company_id": "uuid-da-empresa",
  "name": "Obra Nova",
  "status": "Orçamento",
  "is_own": true,
  "delivery_street": "Av. Paulista",
  "delivery_number": "1000",
  "delivery_neighbourhood": "Bela Vista",
  "delivery_city": "São Paulo",
  "delivery_state": "SP",
  "delivery_zipcode": "01310-100",
  "same_billing_address": true
}
```

> **Campos obrigatórios para cotação:** `delivery_street`, `delivery_number`, `delivery_neighbourhood`. `delivery_city` e `delivery_state` são fortemente recomendados.

**Resposta 201:** objeto da obra criada com `id`.

**Campos disponíveis para criação de obra:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `company_id` | uuid | Sim | ID da empresa |
| `name` | string | Sim | Nome da obra |
| `status` | string | Não | `"Orçamento"`, `"Em andamento"`, `"Concluída"`, `"Pausada"`. Default: `"Orçamento"` |
| `is_own` | boolean | Não | `true` = obra própria, `false` = obra de cliente. Default: `false` |
| `client_id` | uuid | Não | ID do cliente (quando `is_own = false`) |
| `type` | string | Não | Tipo de obra (ex: `"Residencial"`, `"Comercial"`) |
| `area_m2` | number | Não | Área em m² |
| `start_date` | string (YYYY-MM-DD) | Não | Data de início |
| `expected_end_date` | string (YYYY-MM-DD) | Não | Previsão de término |
| `delivery_zipcode` | string | Não | CEP de entrega |
| `delivery_street` | string | Sim* | Rua de entrega |
| `delivery_number` | string | Sim* | Número de entrega |
| `delivery_complement` | string | Não | Complemento |
| `delivery_neighbourhood` | string | Sim* | Bairro de entrega |
| `delivery_city` | string | Recomendado | Cidade de entrega |
| `delivery_state` | string (2 letras) | Recomendado | Estado (ex: `"SP"`) |
| `same_billing_address` | boolean | Não | Se endereço de cobrança = entrega. Default: `true` |
| `notes` | string | Não | Observações |

*Obrigatório para criar cotação a partir desta obra.

---

### 3.2 Buscar Insumos disponíveis

Insumos podem ser do catálogo do sistema ou personalizados da empresa. O agente pode usar `insumo_id` ao criar a cotação (vínculo com o catálogo) ou informar apenas `name` e `unit` inline (sem vínculo).

**Listar insumos:**
```
GET /api/insumos?company_id={company_id}&tab=sistema
Authorization: Bearer TOKEN
```

**Parâmetros:**

| Parâmetro | Valores | Descrição |
|---|---|---|
| `tab` | `sistema` (default) | Retorna insumos do sistema + personalizados da empresa |
| `tab` | `meus` | Retorna apenas insumos personalizados da empresa |

**Resposta:**
```json
[
  {
    "id": "uuid-do-insumo",
    "name": "Cimento CP II - 50kg",
    "unit": "Saca",
    "category": "Materiais",
    "origin": "Sistema"
  },
  {
    "id": "uuid-do-insumo-personalizado",
    "name": "Areia Grossa Lavada",
    "unit": "m³",
    "category": "Agregados",
    "origin": "Personalizado",
    "company_id": "uuid-da-empresa"
  }
]
```

**Criar insumo personalizado (opcional):**
```
POST /api/insumos
Authorization: Bearer TOKEN
```

**Body:**
```json
{
  "company_id": "uuid-da-empresa",
  "name": "Tijolo Cerâmico 9x19x29",
  "unit": "Milheiro",
  "category": "Alvenaria",
  "internal_code": "TIJ-001",
  "description": "Tijolo furado para alvenaria"
}
```

---

### 3.3 Buscar Fornecedores do ObraPlay

Todos os fornecedores adicionados a cotações devem ser do ObraPlay. A busca é feita no espelho local (`mirror_companies`).

**Listar fornecedores:**
```
GET /api/obraplay/suppliers?city=São Paulo&state=SP&search=material&page=1&per_page=20
Authorization: Bearer TOKEN
```

**Parâmetros de filtro:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca por nome ou CNPJ |
| `state` | string | Sigla do estado (ex: `"SP"`) |
| `city` | string | Nome da cidade de entrega |
| `type` | string | `"insumos"`, `"servicos"` ou `"all"` (default) |
| `registration_types` | string | Separados por vírgula: `"certified"`, `"validated"`, `"basic"` |
| `min_rating` | number | Nota mínima (0 a 5) |
| `page` | number | Página (default: 1) |
| `per_page` | number | Itens por página (default: 20) |

**Resposta:**
```json
{
  "suppliers": [
    {
      "id": 57,
      "company_name": "Distribuidora de Materiais ABC",
      "trade_name": "ABC Materiais",
      "cnpj": "12.345.678/0001-90",
      "email": "vendas@abc.com.br",
      "phone": "+5511999999999",
      "whatsapp": "+5511999999999",
      "city_name": "São Paulo",
      "state_abbr": "SP",
      "rating": 4.8,
      "total_reviews": 142,
      "registration_type": "certified",
      "is_certified": true,
      "finalized_answers_count": 98,
      "avg_response_time_minutes": 120,
      "category_names": ["Materiais de Construção", "Cimentos"],
      "members": [
        {
          "id": 1234,
          "name": "João Vendedor",
          "email": "joao@abc.com.br",
          "phone": "+5511988888888",
          "role": "seller"
        }
      ]
    }
  ],
  "total": 47,
  "page": 1,
  "perPage": 20,
  "source": "local"
}
```

> **Campo crítico:** `id` do fornecedor é o `mirror_company_id` a ser usado ao criar cotações.

**Obter listas de estados e cidades disponíveis:**
```
POST /api/obraplay/suppliers
Authorization: Bearer TOKEN
```

```json
{ "action": "get_states" }
```
```json
{ "action": "get_cities", "state": "SP" }
```
```json
{ "action": "get_categories" }
```

---

### 3.4 Criar a Cotação (local + ObraPlay)

Esta é a chamada central. Uma única requisição cria a cotação no banco local **e** a envia ao ObraPlay automaticamente.

> **Importante:** A empresa deve ter o CNPJ cadastrado e o campo `obraplay_company_id` preenchido (ou será feito o lookup automático pelo CNPJ). Sem isso, a cotação é salva como rascunho (`status: "Rascunho"`) com o campo `_op_error` explicando o motivo.

```
POST /api/cotacoes
Authorization: Bearer TOKEN
```

**Body completo:**
```json
{
  "company_id": "uuid-da-empresa",
  "obra_id": "uuid-da-obra",
  "need_date": "2026-06-15",
  "expiry_date": "2026-06-10",
  "general_notes": "Entregar somente no período da manhã.",
  "address_type": "entrega",
  "is_public": false,
  "requester_name": "Carlos Silva",
  "requester_email": "carlos@construtora.com.br",
  "requester_phone": "+5511999990000",
  "shipping_address": {
    "construction_name": "Edifício Alpha",
    "street": "Av. Paulista",
    "number": "1000",
    "neighbourhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP",
    "zipcode": "01310-100",
    "complement": "Bloco A"
  },
  "items": [
    {
      "insumo_id": "uuid-do-insumo",
      "name": "Cimento CP II - 50kg",
      "unit": "Saca",
      "quantity": 100
    },
    {
      "name": "Areia Grossa Lavada",
      "unit": "m³",
      "quantity": 20
    }
  ],
  "suppliers": [
    {
      "mirror_company_id": 57,
      "name": "Distribuidora de Materiais ABC",
      "email": "vendas@abc.com.br",
      "phone": "+5511999999999",
      "city": "São Paulo",
      "is_recommended": true
    },
    {
      "mirror_company_id": 82,
      "name": "Cimentos do Brasil",
      "email": "comercial@cimentosbrasil.com",
      "phone": "+5511988888888",
      "city": "São Paulo",
      "is_recommended": false
    }
  ]
}
```

**Campos do body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `company_id` | uuid | Sim | ID da empresa |
| `obra_id` | uuid | Recomendado | Vincula a obra e herda dados de endereço |
| `need_date` | string (YYYY-MM-DD) | Recomendado | Data limite de necessidade do material |
| `expiry_date` | string (YYYY-MM-DD) | Recomendado | Data de validade da cotação |
| `general_notes` | string | Não | Observações gerais |
| `address_type` | string | Não | `"entrega"` ou `"obra"`. Default: `"entrega"` |
| `is_public` | boolean | Não | Se a cotação é pública no ObraPlay. Default: `false` |
| `requester_name` | string | Recomendado | Nome do solicitante |
| `requester_email` | string | Recomendado | Email do solicitante |
| `requester_phone` | string | Recomendado | Telefone do solicitante |
| `shipping_address` | object | **Sim** | Endereço de entrega. Ver campos abaixo. |
| `items` | array | **Sim** | Lista de itens. Mínimo 1. |
| `suppliers` | array | **Sim** | Lista de fornecedores. Mínimo 1. |

**Campos do `shipping_address`:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `street` | string | **Sim** | Rua / Logradouro |
| `number` | string | **Sim** | Número |
| `neighbourhood` | string | **Sim** | Bairro |
| `city` | string | Recomendado | Cidade |
| `state` | string | Recomendado | Estado (2 letras, ex: `"SP"`) |
| `zipcode` | string | Não | CEP |
| `complement` | string | Não | Complemento |
| `construction_name` | string | Não | Nome da obra no endereço |

**Campos de cada item em `items`:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | **Sim** | Nome do item/insumo |
| `unit` | string | **Sim** | Unidade de medida (ex: `"Saca"`, `"m³"`, `"UN"`) |
| `quantity` | number | **Sim** | Quantidade solicitada |
| `insumo_id` | uuid | Não | ID do insumo do catálogo (quando existe vínculo). Pode ser omitido para itens livres. |

**Campos de cada fornecedor em `suppliers`:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `mirror_company_id` | integer | **Sim** | ID do fornecedor no ObraPlay (campo `id` retornado pela busca de fornecedores) |
| `name` | string | **Sim** | Nome do fornecedor |
| `email` | string | Recomendado | Email para notificação |
| `phone` | string | Recomendado | Telefone/WhatsApp para notificação |
| `city` | string | Não | Cidade do fornecedor |
| `is_recommended` | boolean | Não | Marca fornecedor como preferido. Default: `false` |

**Resposta 201 — Sucesso:**
```json
{
  "id": "uuid-da-cotacao",
  "identifier": "AB3K7PQ",
  "status": "Enviada",
  "company_id": "uuid-da-empresa",
  "obra_id": "uuid-da-obra",
  "need_date": "2026-06-15",
  "expiry_date": "2026-06-10",
  "obraplay_quotation_id": 9468,
  "obraplay_quotation_code": "COT-9468",
  "created_at": "2026-06-01T14:00:00Z"
}
```

**Resposta 201 — Salvo como rascunho (falha ObraPlay):**
```json
{
  "id": "uuid-da-cotacao",
  "identifier": "AB3K7PQ",
  "status": "Rascunho",
  "_op_error": "Endereço de entrega incompleto (faltando: bairro)."
}
```

> Quando `status = "Rascunho"` e `_op_error` está presente, a cotação foi salva localmente mas **não enviada** ao ObraPlay. Corrija o erro apontado e reenvie usando `cotacao_id` no body (seção 3.6).

---

### 3.5 Consultar respostas — Mapa de Cotação

Após enviar a cotação, os fornecedores respondem pelo ObraPlay. As respostas chegam via webhook e são salvas automaticamente. Consulte o mapa para ver preços, disponibilidade e frete.

```
GET /api/cotacoes/{cotacao_id}/mapa
Authorization: Bearer TOKEN
```

**Resposta:**
```json
{
  "cotacao_id": "uuid-da-cotacao",
  "identifier": "AB3K7PQ",
  "obra_name": "Edifício Alpha",
  "status": "Parcialmente respondida",
  "items": [
    {
      "id": "uuid-do-item",
      "name": "Cimento CP II - 50kg",
      "unit": "Saca",
      "quantity": 100
    }
  ],
  "suppliers": [
    {
      "supplier_id": "uuid-do-fornecedor-local",
      "supplier_name": "Distribuidora ABC",
      "supplier_email": "vendas@abc.com.br",
      "supplier_phone": "+5511999999999",
      "mirror_company_id": 57,
      "op_answer_id": 12072,
      "answered": true,
      "is_refused": false,
      "payment_method": "bankslip",
      "installments": "1",
      "arrival_estimate": "2026-06-15T03:00:00Z",
      "answered_items": [
        {
          "cotacao_item_id": "uuid-do-item",
          "name": "Cimento CP II - 50kg",
          "unit": "Saca",
          "quantity": 100,
          "answered": true,
          "available": true,
          "unit_price": 33.50,
          "unit_price_micros": 33500000,
          "quantity_answered": 100,
          "total_price": 3350.00,
          "discount": 0
        }
      ],
      "subtotal": 3350.00,
      "freight": 0,
      "free_shipping": true,
      "total": 3350.00
    },
    {
      "supplier_id": "uuid-do-fornecedor-2",
      "supplier_name": "Cimentos do Brasil",
      "answered": false,
      "is_refused": false,
      "answered_items": []
    }
  ]
}
```

**Campos de status dos fornecedores no mapa:**

| Campo | Significado |
|---|---|
| `answered: false` | Fornecedor ainda não respondeu |
| `answered: true, is_refused: false` | Fornecedor respondeu com preços |
| `answered: true, is_refused: true` | Fornecedor recusou (todos os itens `available: false`) |

**Status possíveis da cotação:**

| Status | Significado |
|---|---|
| `Rascunho` | Criada localmente, não enviada ao ObraPlay |
| `Enviada` | Enviada ao ObraPlay, aguardando respostas |
| `Parcialmente respondida` | Ao menos um fornecedor respondeu |
| `Respondida` | Todos os fornecedores do ObraPlay responderam |
| `Cancelada` | Cancelada local e no ObraPlay |

---

### 3.6 Editar uma Cotação

Editar uma cotação enviada **cancela a cotação anterior no ObraPlay** e cria uma nova automaticamente.

```
PATCH /api/cotacoes/{cotacao_id}
Authorization: Bearer TOKEN
```

**Body (todos os campos são opcionais):**
```json
{
  "need_date": "2026-06-20",
  "expiry_date": "2026-06-15",
  "general_notes": "Observação atualizada.",
  "requester_name": "Carlos Silva",
  "requester_email": "carlos@construtora.com.br",
  "requester_phone": "+5511999990000",
  "is_public": false,
  "items": [
    {
      "name": "Cimento CP II - 50kg",
      "unit": "Saca",
      "quantity": 150
    }
  ],
  "suppliers": [
    {
      "mirror_company_id": 57,
      "name": "Distribuidora de Materiais ABC",
      "email": "vendas@abc.com.br",
      "phone": "+5511999999999"
    }
  ],
  "shipping_address": {
    "street": "Av. Paulista",
    "number": "1000",
    "neighbourhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  }
}
```

> Se `items` ou `suppliers` forem enviados, **substituem completamente** os registros anteriores.

**Resposta 200:** objeto da cotação atualizada. Se falhar no ObraPlay, retorna `_op_warning` com a mensagem de erro (os dados locais são atualizados mesmo assim).

---

### 3.7 Cancelar uma Cotação

```
DELETE /api/cotacoes/{cotacao_id}
Authorization: Bearer TOKEN
```

**Body:**
```json
{
  "cancel_reason": "Projeto suspenso."
}
```

- Se a cotação for `Rascunho`: excluída fisicamente do banco.
- Se for `Enviada` ou outra: cancelada localmente e no ObraPlay. Retorna `_op_warning` se o ObraPlay falhar.

**Resposta 200:**
```json
{
  "id": "uuid-da-cotacao",
  "status": "Cancelada"
}
```

---

## 4. Fluxo Completo — Ordem de Compra

Ordens de compra são geradas após análise do mapa de cotação. Uma OC é criada por fornecedor escolhido.

### 4.1 Criar Ordem de Compra

```
POST /api/ordens-compra
Authorization: Bearer TOKEN
```

**Body:**
```json
{
  "company_id": "uuid-da-empresa",
  "cotacao_id": "uuid-da-cotacao",
  "supplier_name": "Distribuidora de Materiais ABC",
  "supplier_cnpj": "12.345.678/0001-90",
  "supplier_email": "vendas@abc.com.br",
  "supplier_phone": "+5511999999999",
  "obraplay_answer_id": 12072,
  "payment_method": "bankslip",
  "arrival_estimate": "2026-06-15T03:00:00Z",
  "items": [
    {
      "cotacao_item_id": "uuid-do-item",
      "name": "Cimento CP II - 50kg",
      "unit": "Saca",
      "quantity": 100,
      "unit_price": 33.50,
      "total_price": 3350.00
    }
  ],
  "subtotal": 3350.00,
  "freight": 0,
  "total": 3350.00
}
```

**Campos obrigatórios:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `company_id` | uuid | **Sim** | ID da empresa |
| `cotacao_id` | uuid | **Sim** | ID da cotação de origem |
| `supplier_name` | string | **Sim** | Nome do fornecedor |
| `supplier_cnpj` | string | Não | CNPJ do fornecedor |
| `supplier_email` | string | Não | Email do fornecedor |
| `supplier_phone` | string | Não | Telefone do fornecedor |
| `obraplay_answer_id` | integer | Recomendado | ID da resposta no ObraPlay (campo `op_answer_id` do mapa) |
| `payment_method` | string | Não | Forma de pagamento (ex: `"bankslip"`, `"pix"`, `"credit_card"`) |
| `arrival_estimate` | string (ISO 8601) | Não | Previsão de entrega |
| `items` | array | **Sim** | Itens da ordem |
| `subtotal` | number | **Sim** | Subtotal em reais |
| `freight` | number | **Sim** | Frete em reais (0 para grátis) |
| `total` | number | **Sim** | Total em reais (subtotal + freight) |

**Campos de cada item em `items`:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | **Sim** | Nome do item |
| `unit` | string | **Sim** | Unidade de medida |
| `quantity` | number | **Sim** | Quantidade |
| `unit_price` | number | **Sim** | Preço unitário em reais |
| `total_price` | number | **Sim** | Preço total do item em reais |
| `cotacao_item_id` | uuid | Não | ID do item na cotação (para rastreabilidade) |

**Resposta 201:**
```json
{
  "id": "uuid-da-ordem",
  "identifier": "OC-A3K9F2",
  "company_id": "uuid-da-empresa",
  "cotacao_id": "uuid-da-cotacao",
  "supplier_name": "Distribuidora de Materiais ABC",
  "status": "Aguardando fornecedor",
  "subtotal": 3350.00,
  "freight": 0,
  "total": 3350.00,
  "obraplay_answer_id": 12072,
  "created_at": "2026-06-01T15:00:00Z"
}
```

### Como criar uma OC por fornecedor a partir do mapa

Após consultar `GET /api/cotacoes/{id}/mapa`, para cada fornecedor selecionado:

1. Filtre os `answered_items` com `available: true` do fornecedor escolhido
2. Calcule `subtotal = soma de (unit_price * quantity_answered)` para os itens selecionados
3. Use o `freight` do fornecedor
4. Crie uma OC com `POST /api/ordens-compra` contendo os dados do fornecedor e os itens selecionados
5. Repita para cada fornecedor com itens selecionados (uma OC por fornecedor)

---

### 4.2 Listar Ordens de Compra

```
GET /api/ordens-compra?company_id={company_id}
Authorization: Bearer TOKEN
```

**Resposta:**
```json
[
  {
    "id": "uuid-da-ordem",
    "identifier": "OC-A3K9F2",
    "supplier_name": "Distribuidora de Materiais ABC",
    "status": "Aguardando fornecedor",
    "total": 3350.00,
    "cotacao_identifier": "AB3K7PQ",
    "obra_name": "Edifício Alpha",
    "created_at": "2026-06-01T15:00:00Z"
  }
]
```

---

## 5. Referência de Status

### Cotações

| Status | Descrição |
|---|---|
| `Rascunho` | Salva localmente, não enviada ao ObraPlay |
| `Enviada` | Publicada no ObraPlay, aguardando respostas |
| `Parcialmente respondida` | Ao menos 1 fornecedor ObraPlay respondeu |
| `Respondida` | Todos os fornecedores ObraPlay responderam ou recusaram |
| `Cancelada` | Cancelada local e no ObraPlay |

### Ordens de Compra

| Status | Descrição |
|---|---|
| `Aguardando fornecedor` | OC criada, aguardando confirmação do fornecedor |
| `Confirmada` | Fornecedor confirmou o pedido |
| `Entregue` | Material entregue na obra |
| `Cancelada` | OC cancelada |

---

## 6. Tratamento de Erros

Todas as respostas de erro seguem o formato:

```json
{
  "error": "Descrição do erro"
}
```

| HTTP Status | Significado |
|---|---|
| `400` | Dados inválidos ou campos obrigatórios ausentes |
| `401` | Não autenticado ou token expirado |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |

**Erros específicos da integração ObraPlay:**

Quando uma cotação falha ao ser enviada ao ObraPlay (mas é salva localmente como rascunho), a resposta HTTP é `201` com `status: "Rascunho"` e o campo `_op_error`:

```json
{
  "id": "uuid-da-cotacao",
  "status": "Rascunho",
  "_op_error": "Endereço de entrega incompleto (faltando: número, bairro)."
}
```

Causas comuns de `_op_error`:
- `"CNPJ da empresa não cadastrado."` → Cadastrar o CNPJ em Editar Empresa
- `"Endereço de entrega incompleto (faltando: rua/número/bairro)."` → Preencher o `shipping_address` completo
- `"Não foi possível identificar a empresa no ObraPlay."` → Empresa não cadastrada no ObraPlay

---

## 7. Fluxo Completo em Sequência (resumo)

```
1. POST /api/auth/login
   → Obter token e company_id

2. GET /api/obras?company_id={id}
   → Encontrar ou escolher a obra

   (Opcional) POST /api/obras
   → Criar nova obra se necessário

3. GET /api/insumos?company_id={id}
   → Listar insumos disponíveis

4. GET /api/obraplay/suppliers?city=...&state=...&search=...
   → Buscar fornecedores do ObraPlay
   → Guardar o campo "id" de cada fornecedor escolhido (é o mirror_company_id)

5. POST /api/cotacoes
   → Criar cotação com obra, itens, fornecedores e endereço
   → A plataforma envia ao ObraPlay automaticamente
   → Guardar o "id" retornado (cotacao_id)
   → Se status = "Rascunho": corrigir _op_error e reenviar

   [Aguardar fornecedores responderem via ObraPlay — automático]

6. GET /api/cotacoes/{cotacao_id}/mapa
   → Verificar se status = "Parcialmente respondida" ou "Respondida"
   → Analisar preços, disponibilidade e frete por fornecedor
   → Selecionar os melhores itens/fornecedores

7. POST /api/ordens-compra  (uma chamada por fornecedor selecionado)
   → Criar OC com os itens e valores do fornecedor escolhido
   → Usar obraplay_answer_id do mapa para rastreabilidade
```
