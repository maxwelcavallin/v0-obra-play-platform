// ============================================================
// OBRA PLAY — Mock Data Global
// Empresas, Usuários, Clientes e tipos compartilhados
// ============================================================

// ─── Formatters ──────────────────────────────────────────────
export function fmtCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}
export function fmtCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14)
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}
export function fmtPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "")
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "")
}
export function fmtCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  return d.replace(/(\d{5})(\d{1,3})/, "$1-$2")
}
export function fmtDate(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  return d
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2")
}

// ─── Empresa ─────────────────────────────────────────────────
export type CompanyRole = "Admin" | "Membro"

export interface CompanyMock {
  id: string
  fantasyName: string
  companyName: string
  cnpj: string
  stateRegistration: string
  city: string
  state: string
  logoUrl?: string
  role: CompanyRole
  // Endereço
  cep: string
  address: string
  number: string
  complement: string
  neighborhood: string
  // Contato
  whatsapp: string
  email: string
  instagram: string
  website: string
}

export const MOCK_COMPANIES: CompanyMock[] = [
  {
    id: "cmp-001",
    fantasyName: "Construtora Mendes",
    companyName: "Construtora Mendes Ltda",
    cnpj: "12.345.678/0001-90",
    stateRegistration: "123.456.789.123",
    city: "Curitiba",
    state: "PR",
    role: "Admin",
    cep: "80010-010",
    address: "Rua XV de Novembro",
    number: "1200",
    complement: "Sala 501",
    neighborhood: "Centro",
    whatsapp: "(41) 99999-0001",
    email: "contato@mendes.com.br",
    instagram: "@construtoramendes",
    website: "www.mendes.com.br",
  },
  {
    id: "cmp-002",
    fantasyName: "Obra Fácil Engenharia",
    companyName: "Obra Fácil Engenharia ME",
    cnpj: "98.765.432/0001-11",
    stateRegistration: "987.654.321.000",
    city: "São Paulo",
    state: "SP",
    role: "Membro",
    cep: "01310-100",
    address: "Av. Paulista",
    number: "900",
    complement: "",
    neighborhood: "Bela Vista",
    whatsapp: "(11) 98888-1234",
    email: "eng@obrafacil.com",
    instagram: "@obrafacil",
    website: "",
  },
]

// ─── Usuário da empresa ───────────────────────────────────────
export type UserRole = "Admin" | "Comprador" | "Financeiro" | "Visualizador" | "Personalizado"
export type UserStatus = "online" | "inativo"

export interface CompanyUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  isVerified: boolean
  avatar?: string
  companyId: string
}

export const MOCK_COMPANY_USERS: CompanyUser[] = [
  { id: "u1", name: "Carlos Mendes",    email: "carlos@construtora.com",  role: "Admin",       status: "online",  isVerified: true,  companyId: "cmp-001" },
  { id: "u2", name: "Fernanda Lima",    email: "fernanda@construtora.com", role: "Financeiro",  status: "online",  isVerified: false, companyId: "cmp-001" },
  { id: "u3", name: "Rodrigo Alves",    email: "rodrigo@construtora.com",  role: "Comprador",   status: "inativo", isVerified: false, companyId: "cmp-001" },
  { id: "u4", name: "Beatriz Souza",    email: "beatriz@construtora.com",  role: "Visualizador",status: "inativo", isVerified: false, companyId: "cmp-001" },
  { id: "u5", name: "Lucas Ferreira",   email: "lucas@construtora.com",    role: "Personalizado",status: "online", isVerified: false, companyId: "cmp-001" },
]

// ─── Perfis de permissão ──────────────────────────────────────
export type PermAction = "Visualizar" | "Criar" | "Editar" | "Excluir"
export const PERM_MODULES = ["Clientes", "Obras", "Cotações", "Mapa", "OC", "Financeiro", "Usuários"] as const
export type PermModule = typeof PERM_MODULES[number]

export interface PermissionProfile {
  id: string
  name: string
  companyId: string
  permissions: Record<PermModule, Record<PermAction, boolean>>
}

function fullPerms(): Record<PermModule, Record<PermAction, boolean>> {
  return Object.fromEntries(
    PERM_MODULES.map((m) => [m, { Visualizar: true, Criar: true, Editar: true, Excluir: true }])
  ) as Record<PermModule, Record<PermAction, boolean>>
}
function viewOnly(): Record<PermModule, Record<PermAction, boolean>> {
  return Object.fromEntries(
    PERM_MODULES.map((m) => [m, { Visualizar: true, Criar: false, Editar: false, Excluir: false }])
  ) as Record<PermModule, Record<PermAction, boolean>>
}

export const MOCK_PROFILES: PermissionProfile[] = [
  { id: "prof-admin",   name: "Admin",       companyId: "cmp-001", permissions: fullPerms() },
  { id: "prof-viewer",  name: "Visualizador",companyId: "cmp-001", permissions: viewOnly() },
]

// ─── Clientes ─────────────────────────────────────────────────
export type ClientType = "PF" | "PJ"

export interface Client {
  id: string
  type: ClientType
  // PF
  fullName?: string
  cpf?: string
  birthDate?: string
  // PJ
  fantasyName?: string
  cnpj?: string
  companyName?: string
  responsibleName?: string
  // Comum
  email: string
  whatsapp: string
  instagram: string
  cep: string
  address: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  notes: string
  lastWork?: string
  companyId: string
}

export const MOCK_CLIENTS: Client[] = [
  {
    id: "cli-001", type: "PF",
    fullName: "Ana Paula Ribeiro", cpf: "123.456.789-00", birthDate: "15/04/1988",
    email: "ana@email.com", whatsapp: "(41) 99901-1111", instagram: "@anapaula",
    cep: "80020-030", address: "Rua das Flores", number: "45", complement: "Apto 3", neighborhood: "Água Verde", city: "Curitiba", state: "PR",
    notes: "Cliente antigo, obras residenciais.", lastWork: "Reforma Residencial — Ago/2024", companyId: "cmp-001",
  },
  {
    id: "cli-002", type: "PJ",
    fantasyName: "Padaria São José", cnpj: "11.222.333/0001-44", companyName: "São José Alimentos Ltda", responsibleName: "José Neto",
    email: "jose@padariasjose.com", whatsapp: "(41) 99802-2222", instagram: "@padariasjose",
    cep: "82110-000", address: "Av. Marechal Floriano", number: "320", complement: "", neighborhood: "Capão Raso", city: "Curitiba", state: "PR",
    notes: "Reforma completa da padaria prevista para Jan/2025.", lastWork: "Instalação Elétrica — Mai/2024", companyId: "cmp-001",
  },
  {
    id: "cli-003", type: "PF",
    fullName: "Marcos Oliveira", cpf: "987.654.321-99", birthDate: "02/11/1975",
    email: "marcos@email.com", whatsapp: "(11) 98003-3333", instagram: "",
    cep: "01310-100", address: "Av. Paulista", number: "1200", complement: "CJ 42", neighborhood: "Bela Vista", city: "São Paulo", state: "SP",
    notes: "", lastWork: "Construção Residencial — Dez/2023", companyId: "cmp-001",
  },
  {
    id: "cli-004", type: "PJ",
    fantasyName: "Clínica Bem Estar", cnpj: "44.555.666/0001-77", companyName: "Bem Estar Saúde S/A", responsibleName: "Dra. Camila Torres",
    email: "camila@bemestarsaude.com", whatsapp: "(41) 97004-4444", instagram: "@bemestarsaude",
    cep: "80060-150", address: "Rua Emiliano Perneta", number: "680", complement: "Sala 12", neighborhood: "Centro", city: "Curitiba", state: "PR",
    notes: "Obra comercial de ampliação.", lastWork: "Ampliação Clínica — Nov/2024", companyId: "cmp-001",
  },
  {
    id: "cli-005", type: "PF",
    fullName: "Tatiane Borges", cpf: "321.654.987-11", birthDate: "28/07/1990",
    email: "tati@email.com", whatsapp: "(41) 99705-5555", instagram: "@tatiborgess",
    cep: "82300-000", address: "Rua Manoel Ribas", number: "890", complement: "", neighborhood: "Mercês", city: "Curitiba", state: "PR",
    notes: "", companyId: "cmp-001",
  },
]
