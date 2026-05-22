import { neon } from "@neondatabase/serverless"

function createSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada")
  }
  return neon(process.env.DATABASE_URL)
}

let _instance: any = null

function getInstance() {
  if (!_instance) _instance = createSql()
  return _instance
}

// Tipo explícito que garante retorno any[] para toda a codebase
type SqlFn = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>

// Tagged template proxy — lazy init seguro para build sem DATABASE_URL
export const sql: SqlFn = new Proxy(function () {} as unknown as SqlFn, {
  apply(_t, _this, args) {
    return (getInstance() as any)(...args)
  },
  get(_t, prop) {
    return (getInstance() as any)[prop]
  },
})
