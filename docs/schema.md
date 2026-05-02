# Obra Play Constructor — Schema do Banco de Dados

> Documentação de referência para desenvolvimento. Atualizar sempre que o schema mudar.

## Tabelas Principais

### `users`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| name | VARCHAR(200) | Nome completo |
| email | VARCHAR(200) UNIQUE | E-mail (login) |
| phone | VARCHAR(20) | Celular |
| password_hash | VARCHAR(255) | Hash bcrypt |
| is_active | BOOLEAN DEFAULT true | Status da conta |
| obraplay_user_id | VARCHAR(100) | Para futura integração SSO |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | Soft delete |

### `companies`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| fantasy_name | VARCHAR(200) | Nome fantasia (obrigatório) |
| company_name | VARCHAR(200) | Razão social (auto-fill CNPJ) |
| cnpj | VARCHAR(18) UNIQUE | Formato: XX.XXX.XXX/XXXX-XX |
| state_registration | VARCHAR(50) | Inscrição estadual |
| zipcode | VARCHAR(9) | CEP (formato: XXXXX-XXX) |
| street | VARCHAR(200) | Logradouro |
| number | VARCHAR(20) | Número |
| complement | VARCHAR(100) | Complemento |
| neighbourhood | VARCHAR(100) | Bairro |
| city | VARCHAR(100) | Cidade |
| state | CHAR(2) | UF |
| phone_primary | VARCHAR(20) | Telefone principal |
| phone_secondary | VARCHAR(20) | Telefone secundário |
| email | VARCHAR(200) | E-mail comercial |
| website | VARCHAR(200) | Site |
| instagram | VARCHAR(100) | Instagram (ex: @empresa) |
| whatsapp | VARCHAR(20) | WhatsApp |
| logo_url | VARCHAR(500) | URL do logo (max 2MB, JPG/PNG) |
| is_active | BOOLEAN DEFAULT true | |
| created_at / updated_at / deleted_at | TIMESTAMP | |

### `company_users` (membros de empresa)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| user_id | UUID FK users | |
| role_id | UUID FK roles | Perfil de permissão |
| is_admin | BOOLEAN | Admin tem acesso total |
| invited_at | TIMESTAMP | |
| joined_at | TIMESTAMP | |
| is_active | BOOLEAN | Soft remove |

### `roles` (perfis customizáveis)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| name | VARCHAR(100) | Nome do perfil |
| permissions | JSONB | `{ "clients": ["view","create"], "financial": ["view"] ... }` |
| is_default | BOOLEAN | Perfil padrão |

**Módulos com permissões**: clients, constructions, quotations, quotation_map, purchase_orders, financial, users, company

**Permissões disponíveis por módulo**: view, create, edit, delete, change_status, approve, generate_oc, send, cancel, launch_income, launch_expense, delete_transaction, configure_accounts

### `clients`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| type | ENUM('PF','PJ') | Pessoa física ou jurídica |
| name | VARCHAR(200) | Nome (PF) ou nome fantasia (PJ) |
| document | VARCHAR(18) | CPF ou CNPJ |
| company_name | VARCHAR(200) | Razão social (PJ) |
| responsible_name | VARCHAR(200) | Responsável (PJ) |
| email | VARCHAR(200) | |
| whatsapp | VARCHAR(20) | |
| instagram | VARCHAR(100) | |
| zipcode / street / city / state | VARCHAR | Endereço |
| notes | TEXT | |
| is_active | BOOLEAN | |
| deleted_at | TIMESTAMP | Soft delete |

### `constructions` (obras)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| client_id | UUID FK clients (nullable) | NULL se obra própria |
| is_own | BOOLEAN | Flag obra própria |
| name | VARCHAR(200) | Nome da obra |
| status | ENUM('in_progress','budget','paused','done','canceled') | Status |
| type | VARCHAR(50) | Residencial, Comercial, Industrial, Reforma, Outro |
| area_sqm | DECIMAL(10,2) | Área em m² |
| start_date | DATE | |
| end_date | DATE | Previsão de conclusão |
| default_account_id | UUID FK financial_accounts | Conta padrão |
| notes | TEXT | |
| deleted_at | TIMESTAMP | |

### `construction_addresses`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| construction_id | UUID FK constructions | |
| type | ENUM('delivery','billing') | Tipo do endereço |
| street / number / complement / neighbourhood / city / state / zipcode | VARCHAR | |
| is_default | BOOLEAN | Endereço padrão do tipo |

### `supply_items` (insumos)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies (nullable) | NULL = item global padrão Obra Play |
| obraplay_item_id | INTEGER | ID do item no Obra Play (para itens do catálogo) |
| name | VARCHAR(200) | Nome do insumo |
| measurement_unit | INTEGER | Código da unidade (API Obra Play) |
| unit_label | VARCHAR(50) | Saca, kg, m², m³, etc. |
| category | VARCHAR(100) | Alvenaria, Cimento, Elétrico, etc. |
| internal_code | VARCHAR(100) | Código interno do usuário |
| description | TEXT | Detalhes técnicos |
| is_active | BOOLEAN DEFAULT true | |
| deleted_at | TIMESTAMP | |

### `quotations`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| construction_id | UUID FK constructions | |
| obraplay_quotation_id | VARCHAR(100) | ID retornado pela API Obra Play |
| obraplay_identifier | VARCHAR(20) | Ex: UHUTQJG |
| status | ENUM('new','answered','converted','partial','canceled','expired') | |
| financial_account_id | UUID FK financial_accounts | Caixa vinculado |
| requester_name | VARCHAR(200) | |
| requester_email | VARCHAR(200) | |
| requester_phone | VARCHAR(20) | |
| requirement_date | TIMESTAMP | Data de necessidade |
| expires_at | TIMESTAMP | Data de expiração |
| notes | TEXT | |
| public_share_token | VARCHAR(64) | Token do link público do mapa |
| created_at / updated_at | TIMESTAMP | |

### `quotation_items`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| quotation_id | UUID FK quotations | |
| supply_item_id | UUID FK supply_items | |
| obraplay_item_id | INTEGER | ID do catálogo Obra Play |
| name | VARCHAR(200) | Nome do item |
| quantity | DECIMAL(12,3) | Quantidade |
| total_quantity_micros | BIGINT | Quantidade × 1.000.000 (API Obra Play) |
| measurement_unit | INTEGER | Código da unidade (API Obra Play) |
| type | VARCHAR(20) | 'catalog' ou 'custom' |

### `purchase_orders` (ordens de compra)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| quotation_id | UUID FK quotations | |
| obraplay_order_id | VARCHAR(100) | ID retornado pela API Obra Play |
| obraplay_identifier | VARCHAR(20) | Ex: OC-ZMSDNDL |
| supplier_name | VARCHAR(200) | |
| status | ENUM('pending','processing','finalized','canceled','refused') | |
| payment_method | VARCHAR(50) | |
| installments | INTEGER | |
| total_amount | DECIMAL(12,2) | |
| delivery_date | DATE | |
| financial_transaction_id | UUID FK financial_transactions | |
| created_at / updated_at | TIMESTAMP | |

### `financial_accounts` (contas)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| name | VARCHAR(100) | Nome da conta |
| type | ENUM('cash','checking','credit_card','savings','other') | |
| color | VARCHAR(7) | Cor hex |
| balance | DECIMAL(12,2) DEFAULT 0 | Saldo atual |
| is_active | BOOLEAN | |
| deleted_at | TIMESTAMP | |

### `financial_categories`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies (nullable) | NULL = categoria global padrão |
| name | VARCHAR(100) | |
| type | ENUM('income','expense','transfer') | |
| is_default | BOOLEAN | |
| deleted_at | TIMESTAMP | |

### `financial_transactions` (lançamentos)
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| company_id | UUID FK companies | |
| construction_id | UUID FK constructions (nullable) | |
| account_id | UUID FK financial_accounts | |
| category_id | UUID FK financial_categories | |
| purchase_order_id | UUID FK purchase_orders (nullable) | Lançamento originado de OC |
| type | ENUM('income','expense','transfer') | |
| description | VARCHAR(300) | |
| amount | DECIMAL(12,2) | |
| competence_date | DATE | |
| due_date | DATE | |
| payment_date | DATE (nullable) | NULL = não pago |
| status | ENUM('pending','paid','overdue') | |
| installment_number | INTEGER | Número da parcela |
| total_installments | INTEGER | Total de parcelas |
| parent_transaction_id | UUID (nullable) | Agrupa parcelas |
| attachment_url | VARCHAR(500) | NF, comprovante |
| notes | TEXT | |
| deleted_at | TIMESTAMP | |

---

## Integrações Externas

### API Obra Play
- **Produção**: `https://app.obraplay.com/api`
- **Staging**: `https://app-staging.obraplay.com/api`
- **Auth**: `Authorization: Token {OBRAPLAY_TOKEN}` (variável de ambiente)
- **Documentação**: https://docs.obraplay.com/docs/Integracao/Guia/

**Endpoints utilizados**:
| Método | Endpoint | Uso |
|---|---|---|
| POST | /api/quotations/nested/ | Criar cotação completa |
| GET | /api/quotations/{id}/answers/ | Buscar respostas dos fornecedores |
| POST | /api/orders/ | Criar ordem de compra |
| GET | /api/orders/{id}/ | Consultar status da OC |
| GET | /api/orders/{id}/uploads/ | Documentos da OC |
| POST | /api/hooks/ | Registrar webhook |
| GET | /api/hooks/ | Listar webhooks |

**Webhooks consumidos**:
| Evento | Ação |
|---|---|
| quotation_answer.finalized | Atualiza cotação para "Respondida" |
| quotation_answer.created | Nova resposta parcial |
| order.processed | OC → "Em processamento" |
| order.finalized | OC → "Entrega confirmada" |
| order.refused | OC → "Recusada" |
| order.canceled | OC → "Cancelada" |

**Campo `foreign_id`**: Toda cotação e OC deve armazenar o ID local como `foreign_id` ao criar no Obra Play.

**`total_quantity_micros`**: Quantidades multiplicadas por 1.000.000. Ex: 100 sacos → 100000000.

### ViaCEP
- URL: `https://viacep.com.br/ws/{cep}/json/`
- Retorna: logradouro, bairro, localidade (cidade), uf

---

## Regras de Negócio Críticas

1. **ONBOARDING OBRIGATÓRIO**: Sem empresa criada, nenhuma rota é acessível.
2. **OBRA → CLIENTE**: Toda obra precisa de cliente vinculado OU `is_own = true`.
3. **COTAÇÃO → OBRA**: Toda cotação precisa de obra selecionada.
4. **INSUMO SIMILAR**: Busca por similaridade (≥70% match) antes de salvar insumo novo.
5. **MAPA — MELHOR FORNECEDOR**: Só é elegível o fornecedor que ofertou TODOS os itens.
6. **OC PARCIAL**: Exibir resumo e confirmação antes de gerar múltiplas OCs.
7. **SOFT DELETE**: Todas as entidades usam `deleted_at`.
8. **FOREIGN_ID**: Toda cotação/OC deve armazenar o ID retornado pelo Obra Play.
9. **MULTI-EMPRESA**: Ao trocar empresa, todos os dados mudam para o contexto selecionado.
10. **PERMISSÕES**: Backend valida permissão por módulo em cada request.
11. **LANÇAMENTO FINANCEIRO**: Nunca gerado automaticamente — sempre ação explícita do usuário.
12. **TOKEN OBRA PLAY**: Único por ambiente — nunca exposto no frontend.
