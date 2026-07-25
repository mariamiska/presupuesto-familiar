'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PlusCircle, Calculator, TrendingDown,
  FileText, Upload, BarChart2
} from 'lucide-react'

const nav = [
  { href: '/',            label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/gastos',      label: 'Gastos',         icon: PlusCircle },
  { href: '/facturas',    label: 'Factura',        icon: Upload },
  { href: '/simular',     label: 'Simular',        icon: Calculator },
  { href: '/deudas',      label: 'Deudas',         icon: TrendingDown },
  { href: '/reportes',    label: 'Reportes',       icon: BarChart2 },
  { href: '/importar',    label: 'Importar',       icon: FileText },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-[#2C3E50] text-white flex-col shadow-xl z-50">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-lg font-bold leading-tight">Presupuesto</h1>
          <p className="text-xs text-white/50 mt-1">Familia Servin · 2026</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/10 text-xs text-white/40 text-center">
          Meta ahorro: 5% del ingreso
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#2C3E50] z-50 flex items-center justify-around border-t border-white/10 safe-area-pb">
        {nav.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 min-w-0 flex-1 transition-all relative
                ${active ? 'text-white' : 'text-white/45'}`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full" />
              )}
              <Icon size={21} strokeWidth={active ? 2.5 : 1.75} />
              <span className={`text-[10px] leading-none truncate ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
