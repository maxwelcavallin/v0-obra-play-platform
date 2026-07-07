"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Banner {
  id: string
  image_url: string
  link_url: string
  title: string | null
}

const INTERVAL_MS = 4500

/**
 * Dimensões recomendadas para banners:
 * - Mobile (principal): 1080 x 360 px  (proporção 3:1)
 * - Desktop (fallback): 1440 x 480 px  (proporção 3:1)
 * Formato: JPG ou PNG, máx 2 MB
 */
export function HomeBanner() {
  const { data } = useSWR<Banner[]>("/api/banners", fetcher, {
    revalidateOnFocus: false,
  })

  const banners = data ?? []

  const [active, setActive]       = useState(0)
  const [paused, setPaused]       = useState(false)
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX               = useRef<number | null>(null)
  const trackRef                  = useRef<HTMLDivElement>(null)

  const goTo = useCallback((idx: number) => {
    setActive(idx)
  }, [])

  const next = useCallback(() => {
    setActive(prev => (prev + 1) % banners.length)
  }, [banners.length])

  const prev = useCallback(() => {
    setActive(prev => (prev - 1 + banners.length) % banners.length)
  }, [banners.length])

  // Avança automaticamente
  useEffect(() => {
    if (banners.length <= 1 || paused) return
    timerRef.current = setInterval(next, INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [banners.length, paused, next])

  // Touch/swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setPaused(true)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev()
    }
    touchStartX.current = null
    // Retoma após 3s
    setTimeout(() => setPaused(false), 3000)
  }

  // Nada a mostrar enquanto carrega ou sem banners
  if (!data || banners.length === 0) return null

  const isExternal = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://")

  return (
    <div className="mx-2 mt-3">
      {/* Container do slide */}
      <div
        className="relative overflow-hidden rounded-xl shadow-sm"
        style={{ aspectRatio: "3/1" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Banner carrossel"
        role="region"
      >
        {/* Track — todos os slides lado a lado */}
        <div
          ref={trackRef}
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${active * 100}%)`, width: `${banners.length * 100}%` }}
        >
          {banners.map((b, i) => {
            const content = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.image_url}
                alt={b.title ?? `Banner ${i + 1}`}
                className="w-full h-full object-cover select-none"
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
              />
            )

            const wrapStyle = {
              width: `${100 / banners.length}%`,
              flexShrink: 0 as const,
            }

            if (b.link_url) {
              return isExternal(b.link_url) ? (
                <a
                  key={b.id}
                  href={b.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                  style={wrapStyle}
                  tabIndex={active === i ? 0 : -1}
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={b.id}
                  href={b.link_url}
                  className="block h-full"
                  style={wrapStyle}
                  tabIndex={active === i ? 0 : -1}
                >
                  {content}
                </Link>
              )
            }

            return (
              <div key={b.id} className="block h-full" style={wrapStyle}>
                {content}
              </div>
            )
          })}
        </div>

        {/* Dots de paginação */}
        {banners.length > 1 && (
          <div
            className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5"
            aria-hidden="true"
          >
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i); setPaused(true); setTimeout(() => setPaused(false), 3000) }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Ir para banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
