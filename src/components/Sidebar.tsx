'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PlusCircle, Calculator, TrendingDown,
  FileText, Upload, BarChart2, Repeat2, CreditCard
} from 'lucide-react'

const nav = [
  { href: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/gastos',      label: 'Gastos',      icon: PlusCircle },
  { href: '/recurrentes', label: 'Recurrentes', icon: Repeat2 },
  { href: '/tarjetas',    label: 'Tarjetas',    icon: CreditCard },
  { href: '/deudas',      label: 'Deudas',      icon: TrendingDown },
  { href: '/simular',     label: 'Simular',     icon: Calculator },
  { href: '/reportes',    label: 'Reportes',    icon: BarChart2 },
  { href: '/facturas',    label: 'Factura',     icon: Upload },
  { href: '/importar',    label: 'Importar',    icon: FileText },
]

// Mobile: los 5 más usados primero (orden distinto al desktop)
const navMobile = [nav[0], nav[1], nav[3], nav[4], nav[6], nav[2], nav[5], nav[7], nav[8]]

export default function Sidebar() {
  const path = usePathname()

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col z-50"
        style={{ background: 'var(--brand)' }}>

        {/* Header */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold leading-none">₲</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold leading-tight truncate">Presupuesto</p>
            <p className="text-white/45 text-xs mt-0.5 truncate">Familia Servin · 2026</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group"
                style={{
                  color:      active ? '#fff' : 'rgba(255,255,255,.55)',
                  background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                }}>
                {/* Accent bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-white" />
                )}
                <Icon size={17} strokeWidth={active ? 2.25 : 1.75}
                  style={{ opacity: active ? 1 : 0.7 }} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,.3)' }}>Meta ahorro: 5% del ingreso</p>
        </div>
      </aside>

      {/* ── Mobile bottom nav ───────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
        style={{ background: 'var(--brand)', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div className="flex overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {navMobile.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-1 px-3 py-2.5 shrink-0 relative transition-colors"
                style={{ color: active ? '#fff' : 'rgba(255,255,255,.45)', minWidth: 60 }}>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-white" />
                )}
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[10px] leading-none font-medium whitespace-nowrap">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
