"use client"

import { useParams } from "next/navigation"
import { ObraForm } from "@/components/obras/obra-form"

export default function EditarObraPage() {
  const { id } = useParams<{ id: string }>()
  return <ObraForm mode="edit" obraId={id} />
}
