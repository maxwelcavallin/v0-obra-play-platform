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
  id:       number
  user?:    { id: number; name?: string; email?: string; phone?: string }
  role?:    string
  is_active?: boolean
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
}
