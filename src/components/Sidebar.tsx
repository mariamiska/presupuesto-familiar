'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PlusCircle, Calculator, TrendingDown,
  FileText, Upload, BarChart2, Settings
} from 'lucide-react'

const nav = [
  { href: '/',            label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/gastos',      label: 'Gastos',         icon: PlusCircle },
  { href: '/simular',     label: '¿Puedo gastar?', icon: Calculator },
  { href: '/deudas',      label: 'Deudas',         icon: TrendingDown },
  { href: '/facturas',    label: 'Subir factura',  icon: Upload },
  { href: '/reportes',    label: 'Reportes',       icon: BarChart2 },
  { href: '/importar',    label: 'Importar Excel', icon: FileText },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#2C3E50] text-white flex flex-col shadow-xl z-50">
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
  )
}
