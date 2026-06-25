"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, ArrowRight, ArrowLeft } from "lucide-react"

const TOUR_KEY = "op_onboarding_done_v1"

interface TourStep {
  target: string          // data-tour="..." selector
  title: string
  description: string
  placement?: "top" | "bottom" | "left" | "right"
}

const STEPS: TourStep[] = [
  {
    target: "tour-obras",
    title: "Suas Obras",
    description: "Gerencie todas as obras ativas da sua empresa em um só lugar.",
    placement: "bottom",
  },
  {
    target: "tour-cotacoes",
    title: "Cotacoes",
    description: "Crie cotacoes e receba propostas de fornecedores automaticamente.",
    placement: "bottom",
  },
  {
    target: "tour-financeiro",
    title: "Financeiro",
    description: "Controle lancamentos, contas e gere relatorios do fluxo de caixa.",
    placement: "bottom",
  },
  {
    target: "tour-notificacoes",
    title: "Notificacoes",
    description: "Fique por dentro de respostas de cotacoes e atualizacoes em tempo real.",
    placement: "bottom",
  },
]

interface TooltipPos {
  top: number
  left: number
  arrowSide: "top" | "bottom" | "left" | "right"
}

function computePos(el: HTMLElement, placement: TourStep["placement"] = "bottom"): TooltipPos {
  const rect = el.getBoundingClientRect()
  const TOOLTIP_W = 280
  const TOOLTIP_H = 120
  const GAP = 12

  let top = 0, left = 0
  let arrowSide: TooltipPos["arrowSide"] = "top"

  if (placement === "bottom") {
    top = rect.bottom + GAP
    left = rect.left + rect.width / 2 - TOOLTIP_W / 2
    arrowSide = "top"
  } else if (placement === "top") {
    top = rect.top - TOOLTIP_H - GAP
    left = rect.left + rect.width / 2 - TOOLTIP_W / 2
    arrowSide = "bottom"
  } else if (placement === "right") {
    top = rect.top + rect.height / 2 - TOOLTIP_H / 2
    left = rect.right + GAP
    arrowSide = "left"
  } else {
    top = rect.top + rect.height / 2 - TOOLTIP_H / 2
    left = rect.left - TOOLTIP_W - GAP
    arrowSide = "right"
  }

  // clamp within viewport
  left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_W - 8))
  top = Math.max(8, Math.min(top, window.innerHeight - TOOLTIP_H - 8))

  return { top, left, arrowSide }
}

export function OnboardingTour() {
  const [active, setActive]   = useState(false)
  const [step, setStep]       = useState(0)
  const [pos, setPos]         = useState<TooltipPos | null>(null)
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      // small delay so the dashboard renders its targets first
      const t = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const updatePos = useCallback((stepIdx: number) => {
    const s = STEPS[stepIdx]
    const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`)
    if (!el) return
    setTargetEl(el)
    setPos(computePos(el, s.placement))
  }, [])

  useEffect(() => {
    if (!active) return
    updatePos(step)
    const onResize = () => updatePos(step)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [active, step, updatePos])

  function finish() {
    localStorage.setItem(TOUR_KEY, "1")
    setActive(false)
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  function prev() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!active || !pos) return null

  const current = STEPS[step]
  const highlightRect = targetEl?.getBoundingClientRect()

  return (
    <>
      {/* Dark overlay with cutout */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: highlightRect
            ? `radial-gradient(ellipse ${highlightRect.width + 24}px ${highlightRect.height + 24}px at ${
                highlightRect.left + highlightRect.width / 2
              }px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, rgba(0,0,0,0.55) 100%)`
            : "rgba(0,0,0,0.55)",
        }}
      />

      {/* Highlight ring around target */}
      {highlightRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl ring-2 ring-[#42A5F5] ring-offset-0"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            transition: "all 0.25s ease",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[10000] w-[280px] bg-white rounded-2xl shadow-2xl p-4 pointer-events-auto"
        style={{ top: pos.top, left: pos.left, transition: "all 0.25s ease" }}
      >
        {/* Arrow */}
        {pos.arrowSide === "top" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden">
            <div className="w-3 h-3 bg-white rotate-45 translate-y-1 mx-auto shadow" />
          </div>
        )}
        {pos.arrowSide === "bottom" && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden rotate-180">
            <div className="w-3 h-3 bg-white rotate-45 translate-y-1 mx-auto shadow" />
          </div>
        )}

        <div className="flex items-start justify-between mb-1">
          <span className="text-xs font-semibold text-[#1565C0] uppercase tracking-wide">
            {step + 1} / {STEPS.length}
          </span>
          <button onClick={finish} className="text-[#9E9E9E] hover:text-[#424242] p-0.5">
            <X size={14} />
          </button>
        </div>

        <h3 className="font-bold text-[#212121] text-sm mb-1">{current.title}</h3>
        <p className="text-xs text-[#757575] leading-relaxed mb-4">{current.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 text-xs text-[#9E9E9E] disabled:opacity-30 hover:text-[#424242] transition-colors"
          >
            <ArrowLeft size={13} /> Anterior
          </button>

          {/* dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === step ? "w-4 h-1.5 bg-[#1565C0]" : "w-1.5 h-1.5 bg-[#E0E0E0]"
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-1 text-xs font-semibold text-[#1565C0] hover:text-[#0D47A1] transition-colors"
          >
            {step === STEPS.length - 1 ? "Concluir" : "Proximo"} <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </>
  )
}
