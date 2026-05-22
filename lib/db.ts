import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

// Inicialização lazy para não quebrar o build quando DATABASE_URL não está disponível
let _sql: NeonQueryFunction<false, false> | null = null

export function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não configurada")
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// Proxy que delega para getDb() em tempo de execução
export const sql: NeonQueryFunction<false, false> = new Proxy(
  {} as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return (getDb() as any)(...args)
    },
    get(_target, prop) {
      return (getDb() as any)[prop]
    },
  }
)
