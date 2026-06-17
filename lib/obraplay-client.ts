const BASE_URL = process.env.OBRAPLAY_API_URL ?? ""
const TOKEN    = process.env.OBRAPLAY_API_TOKEN ?? ""

const RETRYABLE_STATUSES = [502, 503, 504]
const RETRYABLE_CODES    = ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"]
const MAX_RETRIES        = 3

async function request<T>(path: string, options: RequestInit = {}, attempt = 1): Promise<T> {
  const url = `${BASE_URL}${path}`
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization:   `Token ${TOKEN}`,
        "Content-Type":  "application/json",
        Accept:          "application/json",
        "Accept-Language": "pt-br",
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) {
      if (RETRYABLE_STATUSES.includes(res.status) && attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 500)
        return request<T>(path, options, attempt + 1)
      }
      let body = ""
      try { body = await res.text() } catch {}
      throw new Error(`ObraPlay API ${res.status} ${path}: ${body}`)
    }
    return res.json() as Promise<T>
  } catch (err: any) {
    const code: string = err?.cause?.code ?? err?.code ?? ""
    if (RETRYABLE_CODES.some(c => code.includes(c)) && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 500)
      return request<T>(path, options, attempt + 1)
    }
    throw err
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OPCompany {
  id:                       number
  name?:                    string
  short_name?:              string
  full_name?:               string
  slug:                     string
  cnpj?:                    string
  verified_cnpj:            boolean
  email?:                   string
  phone?:                   string
  whatsapp?:                string
  address?:                 string
  address_number?:          string
  neighborhood?:            string
  city?:                    string
  state?:                   string
  zip_code?:                string
  logo?:                    string
  rating?:                  number
  total_reviews?:           number
  avg_response_time_minutes?: number
  operation_types?:         string[]
  categories?:              (number | { id: number; name: string })[]
  category_names?:          string[]
  shipping_locations?:      (number | { id: number; name: string })[]
  shipping_location_names?: string[]
  has_confirmed_address:    boolean
  has_confirmed_shipping:   boolean
  has_confirmed_configuration: boolean
  has_active_institutional_page?: boolean
  catalog_items_count?:     number
  data_incomplete?:         boolean
  updated_at?:              string
  memberships?:             OPMember[]
}

export interface OPMember {
  id:           number
  user?: {
    id:             number
    username?:      string
    display_name?:  string
    name?:          string
    email?:         string
    phone?:         string
    avatar?:        string
  }
  company_id?:  string | number
  email?:       string
  phone?:       string
  is_validated?:  boolean
  is_refused?:    boolean
  is_admin?:      boolean
  is_superadmin?: boolean
  is_default?:    boolean
  is_qsa?:        boolean
  left_at?:       string | null
  joined_at?:     string | null
  role?:          string
  is_active?:     boolean
}

export interface OPMetrics {
  average_finalized_answers_duration?: string
  finalized_answers_count?:            number
  avg_response_time_minutes?:          number
}

export interface OPListResponse<T> {
  results:  T[]
  count:    number
  next?:    string | null
  previous?: string | null
}

// ─── Quotation types ─────────────────────────────────────────────────────────

export interface OPQuotationItem {
  name:                   string
  quantity:               number
  total_quantity_micros:  number
  measurement_unit:       string   // string da unidade (ex: "UN", "m²", "kg")
  type:                   "I" | "C" // "I" = item custom, "C" = catalog
  item?:                  number   // ID do item do catálogo (somente type=C)
  observations?:          string
}

export interface OPQuotationShippingAddress {
  foreign_id?:         string
  construction_name?:  string
  street?:             string
  number?:             string
  neighbourhood?:      string
  city?:               string
  state?:              string
  zipcode?:            string
  complement?:         string
  items:               OPQuotationItem[]
}

export interface OPQuotationAnswer {
  name:                  string
  email?:                string
  phone?:                string
  notify_by_email?:      boolean
  notify_by_whatsapp?:   boolean
  own_supplier?:         boolean
  supplier_foreign_id?:  string
  company?:              number   // ID ObraPlay do fornecedor (mirror_company_id)
  observations?:         string
  foreign_id?:           string
}

export interface OPQuotationNestedPayload {
  company:              number        // ID ObraPlay da empresa construtora
  requirement_date?:    string        // ISO 8601
  expires_at?:          string        // ISO 8601
  name?:                string        // nome do solicitante
  email?:               string
  phone?:               string
  foreign_id?:          string        // ID interno (identifier)
  observations?:        string
  is_public?:           boolean
  is_draft?:            boolean
  shipping_addresses:   OPQuotationShippingAddress[]
  answers?:             OPQuotationAnswer[]
}

export interface OPQuotationCreated {
  id:          number
  code?:       string
  foreign_id?: string
  status?:     string
  [key: string]: any
}

// ─── Order (Ordem de Compra) types ─────────────────────────────────────────────
// Endpoint /api/orders/nested/ — cria UMA OC por fornecedor, com os itens selecionados.
// Cada item referencia o pk da resposta do item (quotation_answered_item) e cada
// endereço referencia o pk da resposta de frete (quotation_answered_shipping_address).

export interface OPOrderNestedItem {
  quotation_answered_item:  number   // pk da resposta do item no ObraPlay (op_answered_item_id)
  name:                     string   // nome do item — obrigatório
  measurement_unit:         string | null  // unidade de medida — obrigatória
  type:                     "I" | "C"  // "I" = insumo/livre, "C" = catálogo — obrigatório
  unit_price_micros?:       number
  total_quantity_micros?:   number
  total_discount_micros?:   number
}

export interface OPOrderNestedShippingAddress {
  quotation_answered_shipping_address: number   // pk da resposta de frete (op_answered_address_id)
  items:                               OPOrderNestedItem[]
}

export interface OPOrderNestedBillingData {
  cnpj?:          string | null
  company_name?:  string | null
  name?:          string | null   // nome do responsável pelo faturamento — obrigatório no ObraPlay
  email?:         string | null
  street?:        string | null
  number?:        string | null
  neighbourhood?: string | null
  city?:          string | null
  state?:         string | null
  zipcode?:       string | null
}

export interface OPOrderNestedPayload {
  quotation_answer:    number   // pk da answer (op_answer_id do fornecedor)
  foreign_id?:         string   // identifier local da OC
  // Empresa compradora
  company:             number   // obraplay_company_id — obrigatório
  name:                string   // nome do solicitante — obrigatório
  email?:              string | null
  phone?:              string | null
  // Fornecedor
  supplier_company?:   number | null  // mirror_company_id do fornecedor
  supplier_name:       string   // nome do fornecedor — obrigatório
  supplier_email?:     string | null
  supplier_phone?:     string | null
  // Condições comerciais
  payment_method?:     string | null
  arrival_estimate?:   string | null
  observations?:       string
  // Faturamento
  billing_data?:       OPOrderNestedBillingData
  shipping_addresses:  OPOrderNestedShippingAddress[]
}

export interface OPOrderCreated {
  id:          number
  code?:       string
  foreign_id?: string
  status?:     string
  [key: string]: any
}

// ─── Companies ───────────────────────────────────────────────────────────────

export const obraplay = {
  companies: {
    async list(params: {
      is_supplier?: boolean
      has_confirmed_configuration?: boolean
      state?: string
      city?: string
      search?: string
      page?: number
      per_page?: number
    }): Promise<OPListResponse<OPCompany>> {
      const qs = new URLSearchParams()
      if (params.is_supplier !== undefined) qs.set("is_supplier", String(params.is_supplier))
      if (params.has_confirmed_configuration !== undefined) qs.set("has_confirmed_configuration", String(params.has_confirmed_configuration))
      if (params.state)  qs.set("state", params.state)
      if (params.city)   qs.set("city",  params.city)
      if (params.search) qs.set("search", params.search)
      qs.set("page",     String(params.page     ?? 1))
      qs.set("per_page", String(params.per_page ?? 50))
      return request<OPListResponse<OPCompany>>(`/api/companies/?${qs}`)
    },

    async get(id: number): Promise<OPCompany> {
      return request<OPCompany>(`/api/companies/${id}/`)
    },

    async metrics(id: number): Promise<OPMetrics> {
      return request<OPMetrics>(`/api/companies/${id}/metrics/`)
    },

    async memberships(id: number): Promise<OPListResponse<OPMember>> {
      return request<OPListResponse<OPMember>>(`/api/companies/${id}/memberships/`)
    },

    async lookup(cnpj: string): Promise<{ id: number; cnpj: string; short_name: string; full_name: string; display_name: string; state_registration: string }> {
      return request(`/api/companies/lookup/`, {
        method: "POST",
        body: JSON.stringify({ cnpj }),
      })
    },
  },

  quotations: {
    async createNested(payload: OPQuotationNestedPayload): Promise<OPQuotationCreated> {
      return request<OPQuotationCreated>("/api/quotations/nested/", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },

    async cancel(opQuotationId: number, cancelReason: string): Promise<any> {
      return request<any>(`/api/quotations/${opQuotationId}/cancel/`, {
        method: "POST",
        body: JSON.stringify({ cancel_reason: cancelReason }),
      })
    },

    async renegotiate(opAnswerId: number, payload: Record<string, any>): Promise<any> {
      return request<any>(`/api/quotation_answers/${opAnswerId}/renegotiate/`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },

    async getAnswers(opQuotationId: number): Promise<any[]> {
      const res = await request<any>(`/api/quotation_answers/?quotation=${opQuotationId}&page_size=100`)
      return res?.results ?? res ?? []
    },

    async finalizeAnswer(opAnswerId: number, payload: Record<string, any>): Promise<any> {
      return request<any>(`/api/quotation_answers/${opAnswerId}/finalize/`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
  },

  orders: {
    // Cria uma Ordem de Compra no ObraPlay derivada de uma resposta de cotação (answer),
    // contendo apenas os itens selecionados. Uma OC por fornecedor.
    async createNested(payload: OPOrderNestedPayload): Promise<OPOrderCreated> {
      return request<OPOrderCreated>(`/api/orders/nested/`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },

    async get(id: number): Promise<any> {
      return request<any>(`/api/orders/${id}/`)
    },

    async list(params: { company?: number; page?: number }): Promise<any> {
      const qs = new URLSearchParams()
      if (params.company) qs.set("company", String(params.company))
      qs.set("page", String(params.page ?? 1))
      return request<any>(`/api/orders/?${qs}`)
    },

    async cancel(opOrderId: number, cancelReason: string): Promise<any> {
      return request<any>(`/api/orders/${opOrderId}/cancel/`, {
        method: "POST",
        body: JSON.stringify({ cancel_reason: cancelReason }),
      })
    },
  },
}
