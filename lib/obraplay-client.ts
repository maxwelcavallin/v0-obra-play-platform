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
      throw new Error(`ObraPlay API ${res.status}: ${path}`)
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
  measurement_unit:       number   // ID da unidade de medida
  type:                   "custom" | "catalog"
  item?:                  number   // ID do item do catálogo (somente type=catalog)
}

export interface OPQuotationShippingAddress {
  construction_name?:  string
  street?:             string
  number?:             string
  neighbourhood?:      string
  city?:               string
  state?:              string
  zipcode?:            string
  items:               OPQuotationItem[]
}

export interface OPQuotationAnswer {
  name:                 string
  email?:               string
  phone?:               string
  notify_by_email?:     boolean
  notify_by_whatsapp?:  boolean
  own_supplier?:        boolean
  supplier_foreign_id?: string
}

export interface OPQuotationNestedPayload {
  company:              number        // ID ObraPlay da empresa construtora
  requirement_date?:    string        // ISO 8601
  expires_at?:          string        // ISO 8601
  name?:                string        // nome do solicitante
  email?:               string
  phone?:               string
  foreign_id?:          string        // ID interno (identifier)
  is_public?:           boolean
  is_draft?:            boolean
  shipping_addresses:   OPQuotationShippingAddress[]
  answers?:             OPQuotationAnswer[]
}

export interface OPQuotationCreated {
  id:          number
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
  },

  quotations: {
    async createNested(payload: OPQuotationNestedPayload): Promise<OPQuotationCreated> {
      return request<OPQuotationCreated>("/api/quotations/nested/", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
  },
}
