import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { put } from "@vercel/blob"

export const dynamic = "force-dynamic"

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "text/xml", "application/xml"]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// GET /api/financeiro/transacoes/[id]/anexos
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params

    const rows = await sql`
      SELECT * FROM transaction_attachments
      WHERE transaction_id = ${id} AND deleted_at IS NULL
      ORDER BY created_at ASC
    `
    console.log("[anexos GET] transacao:", id, "rows:", rows.length)
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[anexos GET] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/financeiro/transacoes/[id]/anexos — multipart/form-data
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params

    const formData = await req.formData()
    const file     = formData.get("file") as File | null
    const name     = (formData.get("name") as string) || file?.name || "Sem nome"
    const fileType = (formData.get("file_type") as string) || "outro"
    const companyId = formData.get("company_id") as string

    if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 })
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.includes("xml")) {
      return NextResponse.json({ error: "Tipo de arquivo não suportado. Use PDF, JPG, PNG ou XML." }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 10MB." }, { status: 400 })
    }

    console.log("[anexos POST] transacao:", id, "file:", file.name, "size:", file.size, "type:", file.type)

    const ext = file.name.split(".").pop() ?? "bin"
    const blobPath = `financeiro/anexos/${id}/${Date.now()}.${ext}`
    const blob = await put(blobPath, file, { access: "public" })

    const [row] = await sql`
      INSERT INTO transaction_attachments (transaction_id, company_id, name, file_type, mime_type, size_bytes, url)
      VALUES (${id}, ${companyId}, ${name}, ${fileType}, ${file.type}, ${file.size}, ${blob.url})
      RETURNING *
    `
    console.log("[anexos POST] criado:", row.id, "url:", blob.url)
    return NextResponse.json(row, { status: 201 })
  } catch (err: any) {
    console.error("[anexos POST] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
