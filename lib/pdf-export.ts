import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ─── Cores ────────────────────────────────────────────────────
const AZUL   = [21, 101, 192] as [number, number, number]
const CINZA  = [97, 97, 97]   as [number, number, number]
const CINZAF = [245, 245, 245] as [number, number, number]
const VERM   = [211, 47, 47]  as [number, number, number]
const VERDE  = [46, 125, 50]  as [number, number, number]
const BRANCO = [255, 255, 255] as [number, number, number]
const TEXTO  = [33, 33, 33]   as [number, number, number]

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  const [y, m, day] = d.split("T")[0].split("-")
  return `${day}/${m}/${y}`
}

function addHeader(doc: jsPDF, title: string, companyName: string) {
  const w = doc.internal.pageSize.getWidth()

  // Faixa azul
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, w, 22, "F")

  // Título
  doc.setTextColor(...BRANCO)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(title, 14, 14)

  // Empresa + data
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  const now = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" })
  doc.text(`${companyName}  ·  Gerado em ${now}`, w - 14, 14, { align: "right" })

  doc.setTextColor(...TEXTO)
}

function addFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const pages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...CINZA)
    doc.text(`Página ${i} de ${pages}  ·  ObraPlay`, w / 2, h - 6, { align: "center" })
  }
}

// ─── Cartão de resumo ─────────────────────────────────────────
function addSummaryCard(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string; color?: [number, number, number] }[]
) {
  const w = doc.internal.pageSize.getWidth()
  const cols = items.length
  const colW = (w - 28) / cols
  const cardH = 16

  doc.setFillColor(...CINZAF)
  doc.roundedRect(14, y, w - 28, cardH, 2, 2, "F")

  items.forEach((item, i) => {
    const x = 14 + i * colW + colW / 2
    doc.setFontSize(7)
    doc.setTextColor(...CINZA)
    doc.setFont("helvetica", "normal")
    doc.text(item.label, x, y + 6, { align: "center" })

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...(item.color ?? TEXTO))
    doc.text(item.value, x, y + 13, { align: "center" })
  })

  return y + cardH + 4
}

// ─── 1. Fluxo de Caixa ────────────────────────────────────────
interface FluxoRow {
  month: string
  receitas: number; despesas: number
  a_receber: number; a_pagar: number
  saldo: number
}

const MONTH_SHORT: Record<string, string> = {
  "01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun",
  "07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez",
}

export function exportFluxoPDF(rows: FluxoRow[], companyName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  addHeader(doc, "Fluxo de Caixa", companyName)

  const totalRec = rows.reduce((s, r) => s + Number(r.receitas), 0)
  const totalDesp = rows.reduce((s, r) => s + Number(r.despesas), 0)
  const saldoFinal = rows.length > 0 ? Number(rows[rows.length - 1].saldo) : 0

  let y = addSummaryCard(doc, 26, [
    { label: "Receitas pagas",  value: fmtBRL(totalRec),  color: AZUL  },
    { label: "Despesas pagas",  value: fmtBRL(totalDesp), color: VERM  },
    { label: "Saldo final",     value: fmtBRL(saldoFinal), color: saldoFinal >= 0 ? VERDE : VERM },
  ])

  autoTable(doc, {
    startY: y,
    head: [["Mês", "Receitas (pagas)", "Despesas (pagas)", "A receber", "A pagar", "Saldo acumulado"]],
    body: rows.map(r => [
      `${MONTH_SHORT[r.month.split("-")[1]] ?? r.month}/${r.month.split("-")[0]}`,
      fmtBRL(Number(r.receitas)),
      fmtBRL(Number(r.despesas)),
      fmtBRL(Number(r.a_receber)),
      fmtBRL(Number(r.a_pagar)),
      fmtBRL(Number(r.saldo)),
    ]),
    styles: { fontSize: 8, cellPadding: 3, textColor: TEXTO },
    headStyles: { fillColor: AZUL, textColor: BRANCO, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: CINZAF },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { textColor: AZUL,  halign: "right" },
      2: { textColor: VERM,  halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { fontStyle: "bold", halign: "right" },
    },
    margin: { left: 14, right: 14 },
  })

  addFooter(doc)
  doc.save(`fluxo-de-caixa-${new Date().toISOString().split("T")[0]}.pdf`)
}

// ─── 2. Contas a Pagar ────────────────────────────────────────
interface ContasPagarRow {
  id: string; description: string; amount: number
  due_date: string | null; category_name: string | null; account_name: string | null
}

export function exportContasPagarPDF(rows: ContasPagarRow[], companyName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  addHeader(doc, "Contas a Pagar", companyName)

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const total      = rows.reduce((s, r) => s + Number(r.amount), 0)
  const vencidas   = rows.filter(r => r.due_date && new Date(r.due_date + "T00:00:00") < hoje)
  const totalVenc  = vencidas.reduce((s, r) => s + Number(r.amount), 0)
  const aVencer    = rows.filter(r => !r.due_date || new Date(r.due_date + "T00:00:00") >= hoje)
  const totalAVenc = aVencer.reduce((s, r) => s + Number(r.amount), 0)

  let y = addSummaryCard(doc, 26, [
    { label: "Total pendente",  value: fmtBRL(total),      color: TEXTO },
    { label: "Vencidas",        value: fmtBRL(totalVenc),  color: VERM  },
    { label: "A vencer",        value: fmtBRL(totalAVenc), color: AZUL  },
  ])

  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Categoria", "Conta", "Vencimento", "Status", "Valor"]],
    body: rows.map(r => {
      const isVencida = r.due_date && new Date(r.due_date + "T00:00:00") < hoje
      return [
        r.description,
        r.category_name ?? "—",
        r.account_name  ?? "—",
        fmtDate(r.due_date),
        isVencida ? "Vencida" : "A vencer",
        fmtBRL(Number(r.amount)),
      ]
    }),
    styles: { fontSize: 8, cellPadding: 3, textColor: TEXTO },
    headStyles: { fillColor: AZUL, textColor: BRANCO, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: CINZAF },
    columnStyles: {
      4: { fontStyle: "bold" },
      5: { textColor: VERM, halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data: any) => {
      // Coluna "Status" — colorir "Vencida" em vermelho
      if (data.section === "body" && data.column.index === 4) {
        const isVencida = data.cell.text[0] === "Vencida"
        if (isVencida) {
          doc.setTextColor(...VERM)
          doc.setFont("helvetica", "bold")
          doc.text("Vencida", data.cell.x + data.cell.padding("left"), data.cell.y + data.cell.height / 2 + 1)
          doc.setTextColor(...TEXTO)
          doc.setFont("helvetica", "normal")
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  addFooter(doc)
  doc.save(`contas-a-pagar-${new Date().toISOString().split("T")[0]}.pdf`)
}

// ─── 3. Extrato por Obra ──────────────────────────────────────
interface ExtratoRow {
  id: string; description: string; amount: number; type: string
  status: string; due_date: string | null; category_name: string | null; account_name: string | null
}
interface ExtratoTotals { total_receitas: number; total_despesas: number }

export function exportExtratoPDF(
  obraName: string,
  rows: ExtratoRow[],
  totals: ExtratoTotals,
  companyName: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  addHeader(doc, `Extrato de Obra — ${obraName}`, companyName)

  const resultado = Number(totals.total_receitas) - Number(totals.total_despesas)

  let y = addSummaryCard(doc, 26, [
    { label: "Total receitas",  value: fmtBRL(Number(totals.total_receitas)), color: AZUL  },
    { label: "Total despesas",  value: fmtBRL(Number(totals.total_despesas)), color: VERM  },
    { label: "Resultado",       value: fmtBRL(resultado), color: resultado >= 0 ? VERDE : VERM },
  ])

  const sortedRows = [...rows].sort((a, b) => {
    const da = a.due_date ? new Date(a.due_date).getTime() : 0
    const db = b.due_date ? new Date(b.due_date).getTime() : 0
    return da - db
  })

  autoTable(doc, {
    startY: y,
    head: [["Data", "Descrição", "Categoria", "Conta", "Tipo", "Status", "Valor"]],
    body: sortedRows.map(r => [
      fmtDate(r.due_date),
      r.description,
      r.category_name ?? "—",
      r.account_name  ?? "—",
      r.type === "receita" ? "Receita" : "Despesa",
      r.status === "pago" ? "Pago" : r.status === "pendente" ? "Pendente" : "Cancelado",
      `${r.type === "receita" ? "+" : "-"}${fmtBRL(Number(r.amount))}`,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: TEXTO },
    headStyles: { fillColor: AZUL, textColor: BRANCO, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: CINZAF },
    columnStyles: {
      4: { fontStyle: "bold" },
      6: { halign: "right", fontStyle: "bold" },
    },
    didDrawCell: (data: any) => {
      if (data.section === "body") {
        // Tipo
        if (data.column.index === 4) {
          const isRec = data.cell.text[0] === "Receita"
          doc.setTextColor(...(isRec ? AZUL : VERM))
          doc.setFont("helvetica", "bold")
          doc.text(data.cell.text[0], data.cell.x + data.cell.padding("left"), data.cell.y + data.cell.height / 2 + 1)
          doc.setTextColor(...TEXTO)
          doc.setFont("helvetica", "normal")
        }
        // Valor
        if (data.column.index === 6) {
          const isRec = data.cell.text[0]?.startsWith("+")
          doc.setTextColor(...(isRec ? AZUL : VERM))
          doc.setFont("helvetica", "bold")
          const cellRight = data.cell.x + data.cell.width - data.cell.padding("right")
          doc.text(data.cell.text[0], cellRight, data.cell.y + data.cell.height / 2 + 1, { align: "right" })
          doc.setTextColor(...TEXTO)
          doc.setFont("helvetica", "normal")
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  addFooter(doc)
  doc.save(`extrato-obra-${obraName.toLowerCase().replace(/\s+/g,"-")}-${new Date().toISOString().split("T")[0]}.pdf`)
}
