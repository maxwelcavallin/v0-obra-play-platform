"use client"

import useSWR from "swr"
import { Bot, Key, Copy, CheckCircle, Clock, Activity } from "lucide-react"
import { fmtDate } from "@/components/admin/readonly-badge"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ConstructorAgentePage() {
  const [copied, setCopied] = useState(false)
  const { data, isLoading } = useSWR("/api/admin/constructor/agente", fetcher)
  const agente = data?.agente

  function copyPrefixo() {
    if (agente?.key_prefix) {
      navigator.clipboard.writeText(agente.key_prefix)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-[860px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 flex items-center justify-center">
          <Bot size={20} className="text-[#1565C0]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Config Agente IA</h1>
          <p className="text-sm text-gray-400">Usuário de integração para o agente n8n/IA</p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">Carregando...</div>
      ) : !agente ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <Bot size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Agente IA não configurado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* Info do usuário agente */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Usuário do Agente</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Nome</p>
                <p className="text-sm font-medium text-gray-900">{agente.name}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">E-mail</p>
                <p className="text-sm font-medium text-gray-900">{agente.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">ID do usuário</p>
                <p className="font-mono text-xs text-gray-500 break-all">{agente.user_id}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${agente.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${agente.is_active ? "bg-green-500" : "bg-red-500"}`} />
                  {agente.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">API Keys</p>
            {agente.api_keys?.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma API key cadastrada.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {agente.api_keys?.map((k: Record<string, unknown>) => (
                  <div key={String(k.id)} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <Key size={14} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{String(k.name)}</p>
                        {k.revoked_at ? (
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold">Revogada</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-xs text-gray-500">{String(k.key_prefix)}••••••••</span>
                        <button onClick={copyPrefixo} className="text-[#1565C0] hover:underline text-xs flex items-center gap-1">
                          {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
                          {copied ? "Copiado" : "Copiar prefixo"}
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
                        <Clock size={11} />
                        <span>Criada {fmtDate(String(k.created_at))}</span>
                      </div>
                      {k.last_used_at ? (
                        <div className="flex items-center gap-1 text-xs text-gray-400 justify-end mt-0.5">
                          <Activity size={11} />
                          <span>Último uso {fmtDate(String(k.last_used_at))}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documentação rápida */}
          <div className="bg-[#F8FAFF] rounded-xl border border-[#1565C0]/10 p-5">
            <p className="text-xs font-semibold text-[#1565C0] uppercase tracking-wide mb-3">Como usar</p>
            <p className="text-sm text-gray-600 mb-3">
              Envie o header <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs font-mono">x-api-key: op_live_...</code> em todas as requisições do agente.
            </p>
            <p className="text-sm text-gray-600">
              Inclua sempre o <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs font-mono">company_id</code> no body da requisição para identificar a empresa do construtor que está sendo atendida.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
