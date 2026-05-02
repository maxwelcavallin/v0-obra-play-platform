# Obra Play Constructor — Especificação de Produto
**go.obraplay.com** · Versão 1.0 · MVP Completo · Maio 2026

> Documento de contexto para desenvolvimento. Confidencial — Uso interno Obra Play.

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Identidade Visual e Design System](#2-identidade-visual-e-design-system)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Módulo de Autenticação e Onboarding](#4-módulo-de-autenticação-e-onboarding)
5. [Módulo de Empresas](#5-módulo-de-empresas)
6. [Módulo de Clientes e Obras](#6-módulo-de-clientes-e-obras)
7. [Módulo de Insumos](#7-módulo-de-insumos)
8. [Módulo de Cotação](#8-módulo-de-cotação)
9. [Mapa de Cotação](#9-mapa-de-cotação)
10. [Módulo de Ordens de Compra](#10-módulo-de-ordens-de-compra)
11. [Módulo Financeiro](#11-módulo-financeiro)
12. [Painel Administrativo](#12-painel-administrativo)
13. [Integração com a API Obra Play](#13-integração-com-a-api-obra-play)
14. [Modelo de Dados (Schema)](#14-modelo-de-dados-schema)
15. [Regras de Negócio Críticas](#15-regras-de-negócio-críticas)
16. [Prompts para v0.dev — Série de Entregas](#16-prompts-para-v0dev--série-de-entregas)

---

## 1. Visão Geral do Produto

### 1.1 Propósito

O **Obra Play Constructor** (`go.obraplay.com`) é uma plataforma de gestão para construtores, construtoras, reformadores e qualquer persona da construção civil que precise comprar materiais. É um canal próprio de demanda integrado ao marketplace Obra Play, onde os compradores geram cotações que chegam diretamente aos fornecedores cadastrados.

### 1.2 Contexto Estratégico

Hoje o Obra Play atende fornecedores. Usuários do tipo construtor, prestador, cliente de obra e candidatos a vagas ficam em lista de espera. Esta plataforma canaliza esses usuários para um ambiente produtivo, gerando cotações reais — o principal ativo de liquidez do marketplace.

Fluxo futuro de autenticação: quando um usuário do Obra Play não for fornecedor, em vez de ir para lista de espera, será redirecionado para `go.obraplay.com` com sessão transferida via SSO. No MVP, o sistema tem cadastro e login próprios.

### 1.3 Posicionamento

| Atributo | Definição |
|---|---|
| **Produto** | Plataforma SaaS Web + Mobile (PWA, first mobile) |
| **Domínio** | go.obraplay.com |
| **Persona primária** | Construtores, construtoras, reformadores, gerenciadores de obra |
| **Persona secundária** | Clientes de obras (PF/PJ que contratam a construtora) |
| **Integração core** | API REST Obra Play (cotações, OCs, fornecedores, webhooks) |
| **Monetização futura** | Via Obra Play (taxa 2,5% sobre negócios fechados) |
| **Fase atual** | MVP — construção de liquidez |

### 1.4 Módulos do MVP

Todos os módulos abaixo fazem parte da primeira versão:

- Autenticação e Onboarding obrigatório
- Empresas (multi-workspace)
- Gestão de Usuários com perfis customizáveis por módulo
- Clientes (PF/PJ)
- Obras com status e endereços (entrega + cobrança)
- Biblioteca de Insumos (padrão + personalizada)
- Cotações integradas ao Obra Play
- Mapa de Cotação com IA de recomendação
- Ordens de Compra (simples e parciais)
- Financeiro (fluxo de caixa por obra, contas, categorias, relatórios)
- Painel Admin da plataforma

---

## 2. Identidade Visual e Design System

### 2.1 Referência de Design

A identidade visual segue o portal de documentação de integração do Obra Play (`docs.obraplay.com`):
- Fundo escuro com gradiente `#0D1B3E → #1565C0`
- Elementos em azul elétrico `#1976D2`
- Tipografia branca sobre fundo escuro, escura sobre fundos claros
- Componentes MUI v5 customizados

### 2.2 Tokens de Cor

```
primary:        #1565C0   → Header, botões primários, ícones ativos
primary-dark:   #0D1B3E   → Background AppBar/sidebar, hero sections
primary-light:  #1976D2   → Hover, destaques, links
accent:         #42A5F5   → Badges, tags, highlights
success:        #4CAF50   → Status positivo, melhor preço
warning:        #FF9800   → Status atenção, staging
error:          #F44336   → Status cancelado, erro
surface:        #FFFFFF   → Cards, modais, inputs
background:     #F4F6F8   → Background geral das páginas
text-primary:   #1A1A2E   → Texto principal
text-secondary: #607D8B   → Labels, subtítulos
border:         #E0E0E0   → Bordas de cards e inputs
```

### 2.3 Componentes MUI

Usar **Material UI v5** como base, customizado com o tema acima:

- **AppBar**: fundo `#0D1B3E`, logo branco, ícones brancos
- **Drawer lateral**: fundo `#0D1B3E`, itens brancos, item ativo com fundo `#1565C0`
- **Cards**: fundo branco, `border-radius: 12px`, sombra suave
- **Buttons primários**: fundo `#1565C0`, texto branco, `border-radius: 8px`
- **Chips/badges**: primary=azul, success=verde, warning=laranja, error=vermelho
- **Inputs**: `outlined`, border `#E0E0E0`, focus border `#1565C0`
- **FAB (mobile)**: azul primário, ícone branco, posição `bottom-right`

### 2.4 Layout First Mobile

- **Mobile**: Drawer lateral com swipe + Bottom Navigation Bar com 4 ícones (Início, Cotações, Financeiro, Menu)
- **Desktop**: Sidebar fixa 260px + área de conteúdo fluida
- Responsivo para todas as telas intermediárias

### 2.5 Status Chips — Padrão de Cores

| Status | Cor |
|---|---|
| Em andamento / Respondida / Sucesso | Verde `#4CAF50` |
| Nova / Em processamento / Info | Azul `#1565C0` |
| Pendente / Pausada / Atenção | Laranja `#FF9800` |
| Cancelada / Recusada / Erro | Vermelho `#F44336` |
| Concluída / Arquivada | Cinza `#607D8B` |
| Orçamento / Rascunho | Azul claro `#42A5F5` |

---

## 3. Arquitetura do Sistema

### 3.1 Stack e Responsabilidades

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| **Frontend** | React (Next.js recomendado) + MUI v5 | Interface web e mobile PWA |
| **Backend** | A definir (espelhar schema Obra Play) | API REST própria, regras de negócio |
| **Banco** | PostgreSQL | Persistência de dados |
| **Integração** | API REST Obra Play + Webhooks | Cotações, OCs, fornecedores |
| **Autenticação** | JWT próprio → migrar para Obra Play SSO (v2) | Login e sessões |
| **Notificações** | Link compartilhável (v1) / WhatsApp + Email (v2) | Convites, alertas |
| **IA** | Agente de recomendação de fornecedores | Sugestão inteligente no fluxo de cotação |

### 3.2 Integração com Obra Play

> **Token único por ambiente** (produção / staging) configurado como variável de ambiente no backend. Um usuário `creator` autenticado no Obra Play é o responsável por todos os lançamentos via API. O construtor que usa esta plataforma **NÃO precisa ter conta no Obra Play** — a integração é transparente.

- Backend próprio autentica com token fixo no Obra Play
- Todos os lançamentos de cotação/OC saem como o usuário `creator`
- O campo `foreign_id` mapeia entidades locais com entidades no Obra Play
- Webhooks do Obra Play notificam o backend sobre respostas e status de OC

### 3.3 Multi-tenancy

Cada empresa é um ambiente isolado de dados (clientes, obras, cotações, financeiro). Um usuário pode pertencer a múltiplas empresas com permissões independentes em cada uma.

---

## 4. Módulo de Autenticação e Onboarding

### 4.1 Cadastro e Login

Tela própria no MVP. Migração futura para SSO do Obra Play via OAuth2.

| Tela | Campos | Observação |
|---|---|---|
| **Cadastro** | Nome completo, E-mail, Senha (mín. 8 chars), Confirmar senha, Celular | Validação de e-mail único |
| **Login** | E-mail, Senha, Lembrar-me | Esqueci senha via link por e-mail |
| **Recuperar senha** | E-mail | Link com expiração de 24h |

### 4.2 Onboarding Obrigatório

> **Após o primeiro login, o usuário é redirecionado obrigatoriamente para o fluxo de criação da primeira empresa. Nenhum módulo é acessível antes de concluir o onboarding.** Middleware de redirecionamento para `/onboarding`.

Wizard de **3 passos**:

**Passo 1 — Dados da Empresa**
- CNPJ (obrigatório) — validação de dígitos + máscara `XX.XXX.XXX/XXXX-XX`
- Razão Social — preenchida automaticamente via API de CNPJ após digitar
- Nome Fantasia (obrigatório)

**Passo 2 — Endereço**
- CEP (obrigatório) — auto-fill via ViaCEP (logradouro, bairro, cidade, estado)
- Número e Complemento

**Passo 3 — Contatos e Redes**
- Telefone principal, Telefone secundário
- E-mail comercial, Site, Instagram, WhatsApp

Ao concluir: usuário definido como **ADMIN** da empresa → redirect para Dashboard.

### 4.3 Perfis de Usuário (Permissões Customizáveis)

Permissões configuráveis por módulo e por empresa. O Admin pode criar perfis personalizados.

| Módulo | Permissões disponíveis |
|---|---|
| Clientes | Visualizar, Criar, Editar, Excluir |
| Obras | Visualizar, Criar, Editar, Excluir, Alterar status |
| Cotações | Visualizar, Criar, Enviar, Cancelar |
| Mapa de Cotação | Visualizar, Aprovar compra, Gerar OC |
| Ordens de Compra | Visualizar, Criar, Cancelar |
| Financeiro | Visualizar, Lançar entrada, Lançar saída, Excluir lançamento, Configurar contas/categorias |
| Usuários | Visualizar, Convidar, Editar permissões, Remover |
| Empresa | Visualizar dados, Editar dados |
| Admin | Acesso total — não editável |

### 4.4 Convite de Usuários

- Convite por **link compartilhável** (válido por 7 dias)
- Admin define perfil/permissões antes de gerar o link
- O link pode ser enviado por qualquer canal (WhatsApp, e-mail, etc.)
- Múltiplos links com perfis diferentes podem coexistir
- Link pode ser desativado manualmente
- Convidado faz cadastro ou login e é vinculado automaticamente à empresa

---

## 5. Módulo de Empresas

### 5.1 Visão Geral

- Usuário pode criar ou ser convidado para **múltiplas empresas**
- Seletor de empresa no topo do sidebar/header (dropdown)
- Troca de empresa sem sair do sistema

### 5.2 Dados da Empresa

| Campo | Obrigatório | Observação |
|---|---|---|
| Nome fantasia | Sim | |
| Razão social | Sim | Auto-fill via CNPJ |
| CNPJ | Sim | Validação de dígitos, máscara |
| Inscrição estadual | Não | |
| CEP | Sim | Auto-fill via ViaCEP |
| Logradouro, Número, Complemento, Bairro, Cidade, Estado | Sim | |
| Telefone principal | Sim | |
| Telefone secundário | Não | |
| E-mail | Sim | |
| Site | Não | |
| Instagram | Não | Ex: `@empresa` |
| WhatsApp | Não | |
| Logo | Não | Upload, máx 2MB, JPG/PNG |

### 5.3 Gestão de Usuários da Empresa

- Lista com: avatar (inicial do nome), nome, papel/perfil, status (ativo=verde, inativo=cinza)
- Badge verificado para admins (ícone check azul — igual ao Obra Play)
- Menu de 3 pontos: Editar permissões, Remover da empresa
- Soft delete: registro mantido com flag inativo
- Usuário removido perde acesso à empresa mas mantém conta

---

## 6. Módulo de Clientes e Obras

### 6.1 Clientes

Clientes são as PF ou PJ para quem a construtora presta serviço. Flag `type: PF | PJ` muda os campos exibidos.

**Dados — Pessoa Física (PF)**

| Campo | Obrigatório |
|---|---|
| Nome completo | Sim |
| CPF (máscara + validação) | Sim |
| Data de nascimento | Não |
| E-mail | Sim |
| WhatsApp / Telefone | Sim |
| Instagram | Não |
| CEP + Endereço completo (auto-fill) | Não |
| Observações | Não |

**Dados — Pessoa Jurídica (PJ)**

| Campo | Obrigatório |
|---|---|
| Nome fantasia | Sim |
| CNPJ (auto-fill razão social) | Sim |
| Razão social | Sim |
| Nome do responsável | Sim |
| E-mail | Sim |
| WhatsApp / Telefone | Sim |
| Instagram | Não |
| CEP + Endereço (auto-fill) | Não |
| Observações | Não |

### 6.2 Obras

**Dados da Obra**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome da obra | Texto | Sim | Ex: Residência João Pizzini |
| Cliente vinculado | Select/busca | Condicional | Obrigatório se não for obra própria |
| Obra própria | Toggle/Flag | — | Desvincula campo de cliente |
| Status | Select | Sim | Ver tabela de status abaixo |
| Data de início / Previsão conclusão | Data | Não | |
| Área (m²) | Número | Não | |
| Tipo de obra | Select | Não | Residencial, Comercial, Industrial, Reforma, Outro |
| Conta financeira padrão | Select | Não | Vincula conta para lançamentos da obra |
| Observações | Textarea | Não | |

**Endereços da Obra**

Cada obra possui dois tipos de endereço:

- **Endereço de entrega**: local físico da obra (onde os materiais chegam)
- **Endereço de cobrança**: pode ser diferente (ex: sede da construtora)

> UX: checkbox **"Usar endereço de entrega como endereço de cobrança"** — quando marcado, replica os dados automaticamente. Na geração de OC o sistema usa o endereço de cobrança por padrão.

Possibilidade de múltiplos endereços de entrega por obra (para cotações que abrangem mais de uma localidade), seguindo o modelo da API Obra Play (`shipping_addresses[]`).

**Status de Obras**

| Status | Cor | Descrição |
|---|---|---|
| Em andamento | Verde `#4CAF50` | Obra em execução ativa |
| Orçamento | Azul `#1976D2` | Fase de levantamento de preços |
| Pausada | Laranja `#FF9800` | Obra temporariamente parada |
| Concluída | Cinza `#607D8B` | Obra entregue |
| Cancelada | Vermelho `#F44336` | Obra cancelada |

---

## 7. Módulo de Insumos

### 7.1 Biblioteca de Insumos

O sistema oferece uma **base de insumos padrão** (fornecida pelo Obra Play) disponível para todos os usuários. O usuário pode cadastrar insumos próprios caso o item não exista na base.

### 7.2 Dados do Insumo

| Campo | Obrigatório | Observação |
|---|---|---|
| Nome | Sim | Busca por similaridade antes de salvar |
| Unidade de medida | Sim | Saca, kg, m², m³, Metro, Litro, Unidade, Milheiro, Peça, Rolo, etc. |
| Categoria | Sim | Alvenaria, Cimento, Elétrico, Hidráulico, Pintura, Acabamento, Madeira, Ferragem, etc. |
| Código interno | Não | Identificador próprio do usuário |
| Descrição | Não | Detalhes técnicos |
| Ativo | Sim | Default: ativo — soft delete |

### 7.3 Regra Anti-duplicação

> Ao tentar cadastrar um insumo, o sistema faz **busca por similaridade** (mínimo 70% de match no nome). Se encontrar correspondência, exibe modal: _"Encontramos insumos similares. Deseja usar um deles?"_ — lista os similares com botão "Usar este". Se o usuário confirmar que é diferente, salva o novo insumo.

---

## 8. Módulo de Cotação

### 8.1 Fluxo Geral

```
Passo 1: Selecionar itens
     ↓
Passo 2: Selecionar obra e endereço
     ↓
Passo 3: Selecionar fornecedores (com IA)
     ↓
Enviar → POST /api/quotations/nested/ → Obra Play notifica fornecedores
```

### 8.2 Passo 1 — Itens

- Autocomplete de insumos (biblioteca padrão + insumos do usuário) — 3+ chars para buscar
- Seleção adiciona linha na tabela: Insumo | Quantidade | Unidade (pré-preenchida)
- Botão "Adicionar item personalizado" para insumos não encontrados
- Data de necessidade (obrigatório)
- Data de expiração da cotação (obrigatório)
- Observações gerais

### 8.3 Passo 2 — Obra e Endereço

- Select de obra (busca por nome, exibe cliente e cidade)
- Ao selecionar: preenche automaticamente endereço de entrega
- Toggle "Usar endereço de cobrança" — altera o endereço usado na cotação
- Select "Caixa financeiro": Empresa (nome) ou Obra (nome da obra)
- Dados do solicitante: Nome (pré-preenchido com usuário logado, editável), E-mail, Telefone

### 8.4 Passo 3 — Fornecedores e IA

**Busca e Filtros**
- Carrega automaticamente fornecedores disponíveis na cidade da obra
- Filtros: categoria, nome/razão social, CNPJ, tempo de resposta, avaliação mínima

**IA de Recomendação**
> O agente analisa os nomes dos insumos selecionados, as categorias e a localização da obra. Destaca os fornecedores mais prováveis com badge **"Recomendado pela IA"**. A lógica usa o prompt de agente fornecido pelo time Obra Play.

**Card de Fornecedor**
- Logo/avatar, nome, cidade, categorias (chips), avaliação (estrelas), tempo médio de resposta
- Checkbox de seleção, toggle de notificação WhatsApp/E-mail por fornecedor

### 8.5 Payload para API Obra Play

```json
POST /api/quotations/nested/
Authorization: Token {TOKEN}

{
  "company": 15,
  "requirement_date": "2026-05-10T00:00:00Z",
  "expires_at": "2026-04-25T23:59:00Z",
  "name": "Nome do solicitante",
  "email": "solicitante@empresa.com",
  "phone": "+5541999990000",
  "foreign_id": "ID_LOCAL_DA_COTACAO",
  "is_public": false,
  "is_draft": false,
  "shipping_addresses": [
    {
      "construction_name": "Nome da obra",
      "street": "Logradouro",
      "number": "100",
      "city": "Cidade",
      "state": "PR",
      "zipcode": "80000-000",
      "neighbourhood": "Bairro",
      "items": [
        {
          "item": 301,
          "name": "Cimento CP-II 50kg",
          "quantity": 100,
          "total_quantity_micros": 100000000,
          "measurement_unit": 2,
          "type": "catalog"
        }
      ]
    }
  ],
  "answers": [
    {
      "name": "Nome do Fornecedor",
      "email": "cotacao@fornecedor.com.br",
      "phone": "+5541988880000",
      "notify_by_email": true,
      "notify_by_whatsapp": true,
      "own_supplier": false,
      "supplier_foreign_id": "ID_LOCAL_DO_FORNECEDOR"
    }
  ]
}
```

> **Observação `total_quantity_micros`**: A API armazena quantidades multiplicadas por 1.000.000. Ex: 100 sacos → `100000000`, 2,5 m³ → `2500000`.

### 8.6 Estados da Cotação

| Status | Cor | Descrição |
|---|---|---|
| Nova | Azul | Enviada, aguardando respostas |
| Respondida | Verde | Ao menos 1 fornecedor respondeu |
| Pendente de revisão | Laranja | Prazo próximo do vencimento |
| Convertida | Verde escuro | OC gerada para todos os fornecedores |
| Parcialmente convertida | Ciano | OC gerada para alguns fornecedores |
| Cancelada | Vermelho | Cotação cancelada |
| Expirada | Cinza | Prazo encerrado sem conversão |

---

## 9. Mapa de Cotação

### 9.1 Visão Geral

Tela central de comparação de propostas. Acessada após ao menos 1 resposta recebida. Pode ser **compartilhada publicamente** via link com o cliente da obra.

### 9.2 Duas Visualizações (toggle)

**Modo "Melhor Compra"** (default)
- Tabela linha a linha, item por item
- Colunas: `Item | Unid. | Qtd. | [Fornecedor 1] | [Fornecedor 2] | ... | [Fornecedor N]`
- Cada célula: valor unitário + valor total do item
- Se o fornecedor não ofertou o item: exibe `—` em cinza
- **Destaque em verde** o menor valor de cada linha (entre os que ofertaram)
- Em empate: destaca ambos
- Se apenas 1 fornecedor ofertou: sem destaque (sem comparação)
- Linha de rodapé por fornecedor: Subtotal | Frete | **Total** | Forma pgto | Prazo entrega | Validade

**Modo "Melhor Fornecedor"**
- Cards/colunas com total de cada fornecedor
- **Elegível**: fornecedor que ofertou **TODOS** os itens (sem `—` em nenhuma linha)
- Destaca o elegível com menor total (itens + frete) com badge "Melhor oferta"
- Se nenhum tiver todos os itens: banner de aviso amarelo

### 9.3 Link Público de Compartilhamento

- Botão "Compartilhar mapa" gera link público sem autenticação
- Rota: `/mapa/:token`
- Exibe o mapa em modo **somente leitura** (sem checkboxes, sem botões de ação)
- Header com logo + nome da empresa construtora
- Footer: _"Gerado pelo Obra Play — go.obraplay.com"_
- Link pode ser desativado pelo usuário

### 9.4 Webhooks — Recebimento de Respostas

O sistema escuta `quotation_answer.finalized` do Obra Play. Ao receber, atualiza o status da cotação e notifica o usuário via badge na interface.

---

## 10. Módulo de Ordens de Compra

### 10.1 Tipos de OC

| Tipo | Descrição |
|---|---|
| **OC Simples** | Gerada para um único fornecedor a partir do mapa |
| **OC Parcial** | Múltiplas OCs geradas quando o usuário seleciona mais de um fornecedor (compra fragmentada) |
| **OC Avulsa (Vitrine)** | Compra rápida da vitrine de preços, sem cotação prévia |

### 10.2 Geração de OC a partir do Mapa

1. Usuário seleciona fornecedor(es) no mapa e clica "Gerar Ordem(ns) de Compra"
2. Se **1 fornecedor**: confirma diretamente
3. Se **múltiplos fornecedores**: abre modal de confirmação com:
   - Quantidade de OCs a serem geradas
   - Resumo por fornecedor (nome | itens | subtotal | frete | total)
   - Botões: "Cancelar" e "Confirmar e gerar"
4. OCs criadas via `POST /api/orders/` para cada fornecedor simultaneamente

### 10.3 Dados da OC

| Campo | Origem |
|---|---|
| `quotation_answer` | ID da resposta do fornecedor no Obra Play |
| Forma de pagamento | Definida no mapa / editável antes de gerar |
| Condição de pagamento | Parcelas / À vista |
| Previsão de entrega | Data da resposta do fornecedor |
| Endereço de entrega | Da obra (endereço de cobrança por padrão) |
| Dados do fornecedor | Puxados da resposta do Obra Play |
| Dados de faturamento | CNPJ e razão social da empresa ativa |
| Responsável pela compra | Usuário logado |
| Itens | Itens selecionados da resposta |

### 10.4 Status da OC

| Status Obra Play | Exibição | Cor |
|---|---|---|
| `pending` | Aguardando fornecedor | Laranja |
| `processing` | Em processamento | Azul |
| `finalized` | Entrega confirmada | Verde |
| `canceled` | Cancelada | Vermelho |
| `refused` | Recusada | Vermelho escuro |

### 10.5 Próximos Passos após OC

- Após gerar OC: botão **"Gerar lançamento financeiro"** aparece no card da OC
- Nunca automático — sempre requer ação do usuário
- Também é possível vincular um lançamento existente a uma OC posteriormente
- **V2**: após fornecedor aceitar OC, link de pagamento exibido para o construtor

---

## 11. Módulo Financeiro

### 11.1 Visão Geral

Inspirado no Organizze, adaptado para construtoras: o agrupador principal é a **OBRA**, não a conta bancária. Uma obra pode ter múltiplas contas vinculadas. A conta é apenas um filtro secundário.

### 11.2 Tipos de Lançamento

| Tipo | Cor | Descrição |
|---|---|---|
| Receita (Entrada) | Verde ↑ | Recebimento de cliente, aporte, etc. |
| Despesa (Saída) | Vermelho ↓ | Compra de material, mão de obra, etc. |
| Transferência | Azul ↔ | Entre contas da mesma empresa |

### 11.3 Contas (MVP — genéricas)

Tipos disponíveis: Caixa, Conta Corrente, Cartão de Crédito, Poupança, Outro.

- Configuráveis: criar, editar, excluir (soft delete)
- Uma conta pode ser vinculada a múltiplas obras
- **V2**: integração bancária via Open Finance

### 11.4 Categorias Padrão

| Categoria | Tipo |
|---|---|
| Material de construção | Despesa |
| Mão de obra | Despesa |
| Equipamentos e ferramentas | Despesa |
| Serviços terceirizados | Despesa |
| Taxas e impostos | Despesa |
| Alimentação e transporte | Despesa |
| Receita de obra | Receita |
| Adiantamento de cliente | Receita |
| Outras receitas | Receita |
| Transferência interna | Transferência |

Usuário pode criar, editar e excluir categorias. Soft delete — lançamentos existentes mantidos.

### 11.5 Formulário de Lançamento

| Campo | Tipo | Obrigatório |
|---|---|---|
| Tipo | Radio (Receita/Despesa/Transferência) | Sim |
| Descrição | Texto | Sim |
| Valor | Moeda (R$) | Sim |
| Data de competência | Data | Sim |
| Data de vencimento | Data | Não |
| Data de pagamento | Data | Não |
| Status | Select (A pagar / Pago / Atrasado) | Sim |
| Categoria | Select | Sim |
| Conta | Select | Sim |
| Obra vinculada | Select | Não |
| OC vinculada | Select/busca | Não |
| Número de parcelas | Número (1–60) | Não |
| Observações | Textarea | Não |
| Anexo (NF, comprovante) | Upload PDF/IMG | Não |

### 11.6 Lançamento Automático via OC

Quando o usuário clica "Gerar lançamento" a partir de uma OC, o sistema pré-preenche:

- Tipo: **Despesa**
- Descrição: `Compra OC-[ID] — [Nome do Fornecedor]`
- Valor: total da OC
- Categoria: Material de construção (alterável)
- Conta: conta padrão da obra (alterável)
- Obra: obra da cotação
- OC vinculada: preenchida automaticamente
- Se parcelado: gera N lançamentos com datas calculadas

### 11.7 Relatórios

| Relatório | Descrição |
|---|---|
| **Extrato por obra** | Todos os lançamentos de uma obra com saldo acumulado linha a linha |
| **Fluxo de caixa mensal** | Tabela: Mês \| Entradas \| Saídas \| Resultado \| Acumulado + gráfico |
| **DRE simplificado por obra** | Receitas − Despesas = Resultado, detalhado por categoria |
| **Contas a pagar** | Pendentes ordenados por vencimento, atrasados em vermelho |

Filtros disponíveis em todos os relatórios: período, empresa, obra, conta, categoria, status.

---

## 12. Painel Administrativo

### 12.1 Acesso

Rota `/admin` com perfil especial de plataforma (não confundir com admin de empresa).

### 12.2 Funcionalidades

**Gestão de Usuários**
- Listagem com busca por nome, e-mail, CNPJ
- Ver empresas vinculadas, ativar/desativar conta

**Gestão de Empresas**
- Ver usuários, cotações, lançamentos por empresa
- Editar dados, ativar/desativar

**Métricas de Liquidez** _(dados estratégicos para o Obra Play)_
- Total de cotações por período
- Taxa de resposta de fornecedores (%)
- Taxa de conversão cotação → OC (%)
- Volume financeiro movimentado (R$)
- Top empresas mais ativas

**Biblioteca Global de Insumos**
- Criar, editar, desativar insumos da base padrão

---

## 13. Integração com a API Obra Play

### 13.1 Autenticação

| Ambiente | Base URL | Token |
|---|---|---|
| Produção | `https://app.obraplay.com/api` | Variável de ambiente `OBRAPLAY_TOKEN` |
| Staging | `https://app-staging.obraplay.com/api` | Variável de ambiente `OBRAPLAY_TOKEN_STAGING` |

Header obrigatório em todas as requisições:
```
Authorization: Token {TOKEN}
Content-Type: application/json
```

### 13.2 Endpoints Utilizados

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `/api/quotations/nested/` | Criar cotação completa (itens + endereços + fornecedores) |
| `GET` | `/api/quotations/{id}/answers/` | Buscar respostas dos fornecedores |
| `POST` | `/api/orders/` | Criar ordem de compra |
| `GET` | `/api/orders/{id}/` | Consultar status da OC |
| `GET` | `/api/orders/{id}/uploads/` | Documentos anexados pelo fornecedor (NF, etc.) |
| `POST` | `/api/hooks/` | Registrar webhook para eventos |
| `GET` | `/api/hooks/` | Listar webhooks cadastrados |

### 13.3 Webhooks Consumidos

| Evento | Ação no sistema |
|---|---|
| `quotation_answer.finalized` | Atualiza cotação para "Respondida", disponibiliza mapa |
| `quotation_answer.created` | Notificação de nova resposta parcial recebida |
| `order.processed` | Atualiza OC para "Em processamento" |
| `order.finalized` | Atualiza OC para "Entrega confirmada" |
| `order.refused` | Atualiza OC para "Recusada", notifica usuário |
| `order.canceled` | Atualiza OC para "Cancelada" |

**Configuração do webhook:**
```json
POST /api/hooks/
{
  "url": "https://go.obraplay.com/webhooks/obraplay",
  "event": "quotation_answer.finalized"
}
```

**Verificação de assinatura (Node.js):**
```js
const crypto = require('crypto');

function verifySignature(payloadBody, secret, signatureHeader) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payloadBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expected}`),
    Buffer.from(signatureHeader)
  );
}
```

### 13.4 Mapeamento `foreign_id`

O `foreign_id` é a chave de correlação entre o banco local e o Obra Play:

- Cotação local → `foreign_id` enviado ao criar cotação no Obra Play
- Fornecedor local → `supplier_foreign_id` no array `answers`
- Ao receber webhook: usar `foreign_id` para localizar e atualizar o registro local

### 13.5 Busca de Fornecedores

A API retorna todos os fornecedores e o sistema filtra internamente por cidade e categoria. Implementar **cache com TTL de 1 hora** para evitar excesso de chamadas.

**Documentação completa da API:** https://docs.obraplay.com/docs/Integracao/Guia/

---

## 14. Modelo de Dados (Schema Principal)

> O backend deve espelhar o schema do Obra Play onde fizer sentido (users, companies, etc.). O schema completo do Obra Play será fornecido separadamente.

### `users`
```sql
id               UUID        PK
name             VARCHAR(200)
email            VARCHAR(200) UNIQUE
phone            VARCHAR(20)
password_hash    VARCHAR(255)
is_active        BOOLEAN      DEFAULT true
obraplay_user_id VARCHAR(100) -- Para futura integração SSO
created_at       TIMESTAMP
updated_at       TIMESTAMP
deleted_at       TIMESTAMP    -- Soft delete
```

### `companies`
```sql
id               UUID        PK
fantasy_name     VARCHAR(200)
company_name     VARCHAR(200) -- Razão social
cnpj             VARCHAR(18)  UNIQUE
state_registration VARCHAR(50)
zipcode          VARCHAR(9)
street           VARCHAR(200)
number           VARCHAR(20)
complement       VARCHAR(100)
neighbourhood    VARCHAR(100)
city             VARCHAR(100)
state            CHAR(2)      -- UF
phone_primary    VARCHAR(20)
phone_secondary  VARCHAR(20)
email            VARCHAR(200)
website          VARCHAR(200)
instagram        VARCHAR(100)
whatsapp         VARCHAR(20)
logo_url         VARCHAR(500)
is_active        BOOLEAN      DEFAULT true
created_at / updated_at / deleted_at  TIMESTAMP
```

### `company_users` _(membros de empresa)_
```sql
id          UUID    PK
company_id  UUID    FK companies
user_id     UUID    FK users
role_id     UUID    FK roles
is_admin    BOOLEAN
invited_at  TIMESTAMP
joined_at   TIMESTAMP
is_active   BOOLEAN
```

### `roles` _(perfis customizáveis)_
```sql
id          UUID    PK
company_id  UUID    FK companies
name        VARCHAR(100)
permissions JSONB   -- { "clients": ["view","create"], "financial": ["view"] ... }
is_default  BOOLEAN
```

### `clients`
```sql
id               UUID    PK
company_id       UUID    FK companies
type             ENUM('PF','PJ')
name             VARCHAR(200) -- Nome (PF) ou nome fantasia (PJ)
document         VARCHAR(18)  -- CPF ou CNPJ
company_name     VARCHAR(200) -- Razão social (PJ)
responsible_name VARCHAR(200) -- Responsável (PJ)
email            VARCHAR(200)
whatsapp         VARCHAR(20)
instagram        VARCHAR(100)
zipcode / street / city / state  VARCHAR
notes            TEXT
is_active        BOOLEAN
deleted_at       TIMESTAMP
```

### `constructions` _(obras)_
```sql
id                  UUID    PK
company_id          UUID    FK companies
client_id           UUID    FK clients  -- NULL se obra própria
is_own              BOOLEAN
name                VARCHAR(200)
status              ENUM('in_progress','budget','paused','done','canceled')
type                VARCHAR(50)
area_sqm            DECIMAL(10,2)
start_date          DATE
end_date            DATE
default_account_id  UUID    FK financial_accounts
notes               TEXT
deleted_at          TIMESTAMP
```

### `construction_addresses`
```sql
id                UUID    PK
construction_id   UUID    FK constructions
type              ENUM('delivery','billing')
street / number / complement / neighbourhood / city / state / zipcode  VARCHAR
is_default        BOOLEAN
```

### `quotations`
```sql
id                      UUID    PK
company_id              UUID    FK companies
construction_id         UUID    FK constructions
obraplay_quotation_id   VARCHAR(100)
obraplay_identifier     VARCHAR(20)  -- Ex: UHUTQJG
status                  ENUM('new','answered','converted','partial','canceled','expired')
financial_account_id    UUID    FK financial_accounts
requester_name          VARCHAR(200)
requester_email         VARCHAR(200)
requester_phone         VARCHAR(20)
requirement_date        TIMESTAMP
expires_at              TIMESTAMP
notes                   TEXT
public_share_token      VARCHAR(64)  -- Token do link público do mapa
created_at / updated_at TIMESTAMP
```

### `purchase_orders` _(ordens de compra)_
```sql
id                       UUID    PK
company_id               UUID    FK companies
quotation_id             UUID    FK quotations
obraplay_order_id        VARCHAR(100)
obraplay_identifier      VARCHAR(20)  -- Ex: OC-ZMSDNDL
supplier_name            VARCHAR(200)
status                   ENUM('pending','processing','finalized','canceled','refused')
payment_method           VARCHAR(50)
installments             INTEGER
total_amount             DECIMAL(12,2)
delivery_date            DATE
financial_transaction_id UUID    FK financial_transactions
created_at / updated_at  TIMESTAMP
```

### `financial_accounts` _(contas)_
```sql
id          UUID    PK
company_id  UUID    FK companies
name        VARCHAR(100)
type        ENUM('cash','checking','credit_card','savings','other')
color       VARCHAR(7)
balance     DECIMAL(12,2) DEFAULT 0
is_active   BOOLEAN
deleted_at  TIMESTAMP
```

### `financial_categories`
```sql
id          UUID    PK
company_id  UUID    FK companies  -- NULL = categoria global padrão
name        VARCHAR(100)
type        ENUM('income','expense','transfer')
is_default  BOOLEAN
deleted_at  TIMESTAMP
```

### `financial_transactions` _(lançamentos)_
```sql
id                      UUID    PK
company_id              UUID    FK companies
construction_id         UUID    FK constructions  -- pode ser NULL
account_id              UUID    FK financial_accounts
category_id             UUID    FK financial_categories
purchase_order_id       UUID    FK purchase_orders  -- pode ser NULL
type                    ENUM('income','expense','transfer')
description             VARCHAR(300)
amount                  DECIMAL(12,2)
competence_date         DATE
due_date                DATE
payment_date            DATE    -- NULL = não pago
status                  ENUM('pending','paid','overdue')
installment_number      INTEGER
total_installments      INTEGER
parent_transaction_id   UUID    -- Agrupa parcelas
attachment_url          VARCHAR(500)
notes                   TEXT
deleted_at              TIMESTAMP
```

---

## 15. Regras de Negócio Críticas

1. **ONBOARDING OBRIGATÓRIO**: Sem empresa criada, nenhuma rota é acessível. Middleware redireciona para `/onboarding`.

2. **OBRA → CLIENTE**: Toda obra precisa de cliente vinculado **OU** `is_own = true`. Validação no backend.

3. **COTAÇÃO → OBRA**: Toda cotação precisa de obra selecionada. A obra define o endereço de entrega.

4. **INSUMO SIMILAR**: Busca por similaridade obrigatória (≥70% de match) antes de salvar insumo novo. Exibir modal de confirmação.

5. **MAPA — MELHOR FORNECEDOR**: Só é elegível o fornecedor que ofertou **TODOS** os itens (sem `—` em nenhuma linha).

6. **OC PARCIAL — MODAL OBRIGATÓRIO**: Exibir resumo e confirmação antes de gerar múltiplas OCs simultaneamente.

7. **SOFT DELETE UNIVERSAL**: Todas as entidades principais usam `deleted_at`. Registros deletados não aparecem em listagens, mas mantêm histórico e vínculos existentes.

8. **FOREIGN_ID**: Toda cotação e OC gerada no Obra Play deve armazenar localmente o ID retornado para rastreabilidade via webhook.

9. **MULTI-EMPRESA**: Ao trocar de empresa, **todos** os dados exibidos mudam para o contexto da empresa selecionada. Sem mistura de dados entre empresas.

10. **PERMISSÕES**: Backend valida permissão por módulo em cada request. Frontend esconde elementos sem permissão, mas o backend é a fonte de verdade.

11. **LANÇAMENTO FINANCEIRO**: Nunca gerado automaticamente — sempre requer ação explícita do usuário (botão "Gerar lançamento" na OC ou lançamento manual).

12. **TOKEN OBRA PLAY**: Único por ambiente, configurado como variável de ambiente no backend. Nunca exposto no frontend.

---

## 16. Prompts para v0.dev — Série de Entregas

> Estratégia: desenvolvimento em 8 entregas progressivas. Cada entrega parte da anterior e adiciona um módulo. Permite testar e validar incrementalmente.

---

### ENTREGA 1 — Design System + Autenticação + Onboarding

```
Crie uma aplicação web first-mobile em React com MUI v5 chamada "Obra Play" para go.obraplay.com. Esta plataforma é voltada para construtores e gestores de obras que precisam comprar materiais de construção.

DESIGN SYSTEM (obrigatório — aplique em toda a aplicação):
- Paleta: primary #1565C0, primary-dark #0D1B3E, accent #42A5F5, success #4CAF50, warning #FF9800, error #F44336
- Background geral: #F4F6F8, cards: #FFFFFF com border-radius 12px, sombra suave
- AppBar: fundo #0D1B3E, logo "OBRA PLAY" branco, ícones brancos
- Drawer lateral mobile: fundo #0D1B3E, itens brancos, item ativo fundo #1565C0
- Botões primários: fundo #1565C0, branco, border-radius 8px
- Inputs: outlined MUI, focus border #1565C0
- Mobile: bottom navigation bar com 4 ícones (Início, Cotações, Financeiro, Menu)
- Tipografia: Roboto, títulos bold, subtítulos #607D8B
- Chips de status: Respondida=verde, Nova=azul, Cancelada=vermelho, Convertida=verde escuro

TELAS A CRIAR NESTA ENTREGA:

1. TELA DE LOGIN
- Logo "OBRA PLAY" centralizado, subtítulo "Gestão de obras e compras"
- Campos: E-mail, Senha (com olho para mostrar/ocultar)
- Botão "Entrar" (primário, largura total)
- Links: "Esqueci minha senha" e "Criar conta"
- Background: gradiente #0D1B3E → #1565C0 com elementos decorativos sutis

2. TELA DE CADASTRO
- Campos: Nome completo, E-mail, Celular (máscara), Senha, Confirmar senha
- Botão "Criar conta", link "Já tenho conta"
- Validações visuais inline

3. ONBOARDING (wizard 3 passos — NÃO PODE SER PULADO)
- Header fixo com progresso: círculos numerados 1-2-3 conectados por linha
- Passo 1 "Dados da empresa": CNPJ (máscara XX.XXX.XXX/XXXX-XX + botão buscar), Razão Social (auto-preenchida), Nome Fantasia
- Passo 2 "Endereço": CEP (máscara + busca via ViaCEP), Logradouro, Número, Complemento, Bairro, Cidade, Estado (select UF)
- Passo 3 "Contatos": Telefone principal, Telefone secundário, E-mail comercial, Site, Instagram, WhatsApp
- Botões: "Voltar" (outline) e "Continuar" / "Concluir" (primário)
- Ao concluir: toast de sucesso e redirect para dashboard

4. DASHBOARD (tela inicial após login)
- Header AppBar #0D1B3E: seletor de empresa (dropdown), ícone notificação com badge, avatar do usuário
- Cards de métricas: Cotações ativas, OCs pendentes, A pagar este mês, Receita do mês
- Seção "Últimas cotações": lista de cards (identificador, obra, status chip, data)
- Seção "Pendências financeiras": lançamentos próximos do vencimento
- FAB azul (+) no canto inferior direito (mobile)
- Bottom navigation: Início (ativo), Cotações, Financeiro, Menu

Use dados mockados realistas do setor de construção civil brasileiro. Valores em R$ (reais). Datas no formato DD/MM/AAAA.
```

---

### ENTREGA 2 — Empresas, Usuários e Clientes

```
Continuando o projeto Obra Play (go.obraplay.com). Mantenha exatamente o mesmo design system (AppBar #0D1B3E, cards branco border-radius 12px, primary #1565C0, bottom nav mobile).

Adicione os seguintes módulos:

1. MÓDULO EMPRESAS
- Lista de empresas do usuário: cards com logo, nome fantasia, CNPJ, cidade/estado, badge "Admin" ou "Membro", botão "Acessar"
- Botão "Nova empresa" abre modal com formulário (CNPJ auto-fill, CEP auto-fill, contatos, redes)
- Seletor de empresa no header: dropdown com empresa ativa, lista de outras, opção "Nova empresa"

2. GESTÃO DE USUÁRIOS DA EMPRESA
- Lista: avatar (inicial do nome), nome, papel, status (online=verde, inativo=cinza), menu 3 pontos (Editar permissões, Remover)
- Badge verificado para admins (ícone check azul)
- Botão "Convidar usuário": modal com seleção de perfil (Admin, Comprador, Financeiro, Visualizador, Personalizado), botão "Gerar link de convite", campo para copiar o link gerado
- Tela de criação/edição de perfil: nome + grid de permissões por módulo (checkboxes: Visualizar, Criar, Editar, Excluir para cada módulo)

3. MÓDULO CLIENTES
- Lista: nome, tipo (chip PF/PJ), documento, telefone, WhatsApp, última obra
- Busca por nome/documento, FAB para novo cliente
- Formulário:
  * Toggle/radio PF ou PJ no topo (muda campos)
  * PF: Nome completo, CPF (máscara), Data nascimento, E-mail*, WhatsApp*, Instagram, CEP+endereço
  * PJ: Nome fantasia, CNPJ (auto-fill razão social), Razão social, Nome responsável, E-mail*, WhatsApp*, Instagram, CEP+endereço
  * (*) = obrigatório
- Tela de detalhe: dados + lista de obras vinculadas

Dados mockados realistas. Máscaras brasileiras (CPF, CNPJ, CEP, telefone).
```

---

### ENTREGA 3 — Obras e Insumos

```
Continuando o projeto Obra Play. Mesmo design system. Adicione:

1. MÓDULO OBRAS
- Lista: card com nome, cliente vinculado (ou "Obra Própria"), cidade, status chip colorido, área m², datas
- Status: Em andamento=verde, Orçamento=azul, Pausada=laranja, Concluída=cinza, Cancelada=vermelho
- Filtro por status (chips horizontais roláveis), busca por nome ou cliente
- FAB para nova obra
- Formulário de obra:
  * Nome da obra (obrigatório)
  * Toggle "Obra própria" — quando ativo, esconde campo de cliente
  * Select de cliente (busca enquanto digita, mostra tipo PF/PJ)
  * Status, Tipo de obra, Área m², datas início e conclusão
  * Conta financeira padrão (select)
  * SEÇÃO ENDEREÇOS:
    - Endereço de entrega: CEP auto-fill, logradouro, número, complemento, bairro, cidade, estado
    - Checkbox "Usar mesmo endereço como cobrança" — quando marcado, replica dados e desabilita campos de cobrança
    - Se desmarcado: campos de endereço de cobrança separados
  * Observações
- Tela de detalhe da obra: dados + tabs (Cotações, OCs, Financeiro)

2. MÓDULO INSUMOS
- Lista: nome, categoria (chip), unidade, origem (Sistema/Personalizado)
- Tabs: "Biblioteca padrão" e "Meus insumos"
- Formulário de novo insumo:
  * Nome — ao sair do campo: busca por similaridade e se encontrar exibe card de aviso "Encontramos itens parecidos" com lista e botões "Usar este" ou "Criar mesmo assim"
  * Unidade de medida (select: Saca, kg, m², m³, Metro, Litro, Unidade, Milheiro, Peça, Rolo)
  * Categoria (select: Alvenaria, Cimento, Elétrico, Hidráulico, Pintura, Acabamento, Madeira, Ferragem)
  * Código interno (opcional), Descrição (opcional)

Dados mockados com insumos reais de construção civil brasileira.
```

---

### ENTREGA 4 — Cotação (Criação em 3 passos)

```
Continuando o projeto Obra Play. Mesmo design system. Adicione o fluxo de criação de cotação:

1. LISTA DE COTAÇÕES
- Tabs: Todas | Novas | Respondidas | Pendente revisão | Convertidas | Canceladas
- Card de cotação: identificador (ex: UHUTQJG), obra, qtd itens, qtd endereços, datas (solicitada, prazo, necessidade, resposta), status chip, vendedor, botão "Visualizar resumo"
- FAB para nova cotação

2. CRIAÇÃO DE COTAÇÃO — WIZARD 3 PASSOS
Header fixo com stepper: Itens → Obra → Fornecedores

PASSO 1 - ITENS:
- Autocomplete de insumos (nome + unidade + categoria ao digitar 3+ chars)
- Ao selecionar: linha na tabela (Insumo, Quantidade, Unidade — editáveis)
- Botão "Adicionar item personalizado" (mini-form: nome, unidade, quantidade)
- Tabela com botão remover por linha
- Data de necessidade e Data de expiração (datepickers, obrigatórios)
- Observações gerais

PASSO 2 - OBRA E ENDEREÇO:
- Select de obra (mostra cliente e cidade)
- Ao selecionar: preenche automaticamente endereço de entrega
- Card com endereço selecionado
- Toggle "Usar endereço de cobrança"
- Select "Caixa financeiro": Empresa ou Obra selecionada
- Dados do solicitante: Nome (pré-preenchido, editável), E-mail, Telefone

PASSO 3 - FORNECEDORES:
- Título: "Fornecedores disponíveis em [Cidade da obra]"
- Card de destaque: "✨ Recomendados pela IA" com 3-5 fornecedores sugeridos e badge "Recomendado"
- Lista completa: logo/avatar, nome, cidade, categorias (chips), avaliação (estrelas), tempo médio resposta
- Checkbox de seleção + filtros (nome, categoria, tempo resposta, avaliação mínima)
- Rodapé: "X fornecedores selecionados" + botão "Enviar cotação"
- Ao clicar: loading → toast "Cotação enviada!" → redirect para lista

Dados mockados com fornecedores reais de construção civil (cimento, tijolos, elétrica, hidráulica).
```

---

### ENTREGA 5 — Mapa de Cotação e Ordens de Compra

```
Continuando o projeto Obra Play. Mesmo design system. Adicione:

1. MAPA DE COTAÇÃO
- Acessado pelo botão "Visualizar resumo" em cotação com status "Respondida"
- Header: nome da obra, identificador da cotação, botão "Compartilhar mapa", toggle "Melhor Compra / Melhor Fornecedor"

MODO "MELHOR COMPRA" (default):
- Tabela comparativa com scroll horizontal no mobile
- Colunas: Item | Unid. | Qtd. | [Fornecedor 1] | [Fornecedor 2] | [Fornecedor N]
- Cada célula: valor unitário (R$ X,XX) + valor total em negrito
- Se não ofertou: exibe "—" em cinza
- Destaque em verde (fundo #E8F5E9, texto #2E7D32, bold) o menor valor de cada linha
- Rodapé por fornecedor: Subtotal, Frete, TOTAL em negrito, Forma pgto, Prazo entrega
- Checkboxes nas colunas para seleção

MODO "MELHOR FORNECEDOR":
- Cards lado a lado (lista no mobile)
- Badge "Melhor oferta" e borda verde no fornecedor com menor total QUE POSSUI TODOS OS ITENS
- Se nenhum tiver todos os itens: banner amarelo de aviso
- Exibe total de cada fornecedor em destaque

GERAÇÃO DE OC:
- Usuário seleciona fornecedor(es) → "Gerar ordem(ns) de compra"
- Se múltiplos: MODAL OBRIGATÓRIO com resumo (qtd OCs, card por fornecedor com nome/itens/total)
- Botões: "Cancelar" e "Confirmar e gerar"

2. MÓDULO ORDENS DE COMPRA
- Lista: identificador (OC-XXXXX), fornecedor, cotação relacionada, obra, total R$, data, status chip
- Tela de detalhe (igual ao print Obra Play):
  * Header com status chip e identificador
  * Itens (nome, quantidade, unidade, valor unitário, valor total)
  * Valores (subtotal, frete, total em azul)
  * Fornecedor (nome, CNPJ, telefone, e-mail)
  * Dados do comprador (empresa, responsável, endereço)
  * Seção de anexos
  * Botão "Gerar lançamento financeiro" (exibido após OC enviada)

Mock: OC OC-ZMSDNDL, obra "Nova obra Joao Pizzini", 2 itens (Tijolo cerâmico 8 furos 1 Milheiro R$1.000, Cimento asfáltico 50 Quilos R$5.000), frete R$50, total R$6.050, status Processada.
```

---

### ENTREGA 6 — Módulo Financeiro Completo

```
Continuando o projeto Obra Play. Mesmo design system. Adicione o módulo financeiro:

1. DASHBOARD FINANCEIRO
- Cards: Saldo total, A receber, A pagar, Resultado do mês
- Gráfico de barras: entradas vs saídas por mês (últimos 6 meses) — use Recharts
- Lista dos próximos 5 vencimentos: descrição, obra, valor, data, status

2. LANÇAMENTOS (tela principal)
- Filtros: período (datepicker range), tipo, obra, categoria, conta, status — com badge de filtros ativos
- Lista estilo extrato: data | descrição | categoria (chip) | obra | conta | valor (verde=receita, vermelho=despesa) | status chip
- Saldo do período no rodapé
- FAB expandido com 3 opções: "+ Receita" (verde), "+ Despesa" (vermelho), "+ Transferência" (azul)

3. FORMULÁRIO DE LANÇAMENTO
- Tabs: Receita | Despesa | Transferência
- Campos: Descrição*, Valor* R$, Data competência*, Data vencimento, Data pagamento, Status*, Categoria*, Conta*, Obra, OC vinculada
- Parcelamento: toggle "Parcelar" → select 2-60 parcelas → preview das datas
- Observações, Anexo (upload)

4. CONFIGURAÇÕES FINANCEIRAS
- Contas: lista (nome, tipo, saldo) + form criar/editar (nome, tipo, cor)
- Categorias: lista por tipo + form criar/editar

5. RELATÓRIOS
- Extrato por obra: select obra + filtros + lista com saldo acumulado
- Fluxo de caixa: tabela mensal (Mês | Entradas | Saídas | Resultado | Acumulado) + gráfico de linha
- Contas a pagar: pendentes por vencimento, atrasados em vermelho

Dados mockados com valores realistas de obra (R$50k-R$500k).
```

---

### ENTREGA 7 — Painel Admin e Vitrine de Preços

```
Continuando o projeto Obra Play. Mesmo design system. Adicione:

1. PAINEL ADMINISTRATIVO (rota /admin)
- Layout diferenciado: sidebar #0D1B3E, header com badge "ADMIN"
- Menu: Dashboard, Usuários, Empresas, Cotações, OCs, Insumos

Dashboard admin:
- Métricas de liquidez: Total cotações, Taxa de resposta %, Taxa conversão cotação→OC %, Volume R$
- Gráfico de cotações por dia/semana
- Top 5 empresas mais ativas

Gestão de usuários: tabela com nome, e-mail, empresas, data cadastro, status, ações (Ativar/Desativar)
Gestão de empresas: tabela com nome, CNPJ, cidade, usuários, cotações, status, ações
Gestão de insumos padrão: lista da biblioteca global + form criar/editar/desativar

2. VITRINE DE PREÇOS (compra rápida)
- Grid de produtos: foto placeholder, nome, fornecedor, preço unitário, unidade
- Badge NOVO no menu
- Filtros: categoria, cidade, busca por nome
- Ao clicar no produto: drawer com detalhe + botão "Comprar agora"
- Fluxo de compra rápida (4 passos em modal):
  1. Selecionar obra
  2. Confirmar quantidade
  3. Confirmar dados (endereço, forma de pagamento)
  4. Modal "Gerar Ordem de Compra" → sucesso com link para OC gerada
```

---

### ENTREGA 8 — Refinamentos, Notificações e Polish Final

```
Continuando o projeto Obra Play. Entrega final de refinamento:

1. SISTEMA DE NOTIFICAÇÕES
- Sino no AppBar com badge de contagem
- Drawer de notificações: ícone por tipo, descrição, obra, tempo relativo ("há 5 min"), lido/não lido
- Tipos: Nova resposta (verde), OC processada (azul), OC recusada (vermelho), Vencimento próximo (laranja)
- Marcar como lida, limpar todas

2. LINK PÚBLICO DO MAPA (rota pública /mapa/:token — sem autenticação)
- Header: logo Obra Play + nome da empresa construtora
- Banner: "Proposta de fornecedores para [Nome da Obra]"
- Mapa completo em modo somente leitura (sem checkboxes, sem botões de ação)
- Footer: "Gerado pelo Obra Play — go.obraplay.com"

3. ESTADOS VAZIOS (obrigatório em todas as listas)
- Ilustração/ícone + texto explicativo + botão de ação
- Ex: "Nenhuma cotação ainda. Crie sua primeira cotação para receber propostas."

4. LOADING STATES
- Skeleton loaders em todas as listas (não spinners simples)
- Botões com estado loading (spinner inline + desabilitado)

5. FORMULÁRIOS — POLISH FINAL
- Validações inline em português
- Máscaras: CEP (00000-000), CNPJ (00.000.000/0000-00), CPF (000.000.000-00), Telefone ((00) 00000-0000), Moeda (R$ X.XXX,XX)
- Auto-fill CEP via ViaCEP
- Auto-fill CNPJ via API de CNPJ

6. EXTRAS
- Página 404 e página de erro genérico
- Configurações de conta do usuário (nome, e-mail, senha, foto de perfil)
- Tour de onboarding com tooltips guiados na primeira visita ao dashboard
```

---

## Referências Técnicas

- **API Obra Play — Guia de Integração**: https://docs.obraplay.com/docs/Integracao/Guia/
- **API Obra Play — Autenticação**: https://docs.obraplay.com/docs/Integracao/Autenticacao/
- **API Obra Play — Rotas**: https://docs.obraplay.com/docs/Integracao/Rotas/
- **API Obra Play — Webhooks**: https://docs.obraplay.com/docs/Integracao/Webhooks/
- **API Obra Play — Troubleshooting**: https://docs.obraplay.com/docs/Integracao/Troubleshooting/
- **Swagger Staging**: https://api-staging.obraplay.com/apidocs
- **App Produção**: https://app.obraplay.com
- **App Staging**: https://app-staging.obraplay.com

---

_Obra Play Constructor — go.obraplay.com · Especificação v1.0 · Confidencial · Maio 2026_