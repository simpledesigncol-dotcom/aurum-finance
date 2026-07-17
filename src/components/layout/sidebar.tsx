'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Wallet, Building2, TrendingUp,
  ShoppingBag, Receipt, Package, Users,
  ArrowDownLeft, ArrowUpRight, Scale,
  Box, FileText, ShieldCheck, BarChart3, Settings,
  ChevronLeft, ChevronRight,
  Menu, X, Handshake
} from 'lucide-react'
import { SIDEBAR_ITEMS } from '@/lib/constants'
import GlobalSearch from '@/components/global-search'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Wallet, Building2, TrendingUp,
  ShoppingBag, Receipt, Package, Users,
  ArrowDownLeft, ArrowUpRight, Scale,
  Box, FileText, ShieldCheck, BarChart3, Settings, Handshake,
}

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-[11px]">A</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-foreground font-semibold text-[13px] tracking-tight leading-tight">Aurum Finance</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Control Center</span>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <GlobalSearch />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
        {SIDEBAR_ITEMS.map((item, i) => {
          if ('section' in item && item.section) {
            return (
              <div key={i} className={cn("pt-4 pb-1.5 px-2", collapsed && "pt-3")}>
                {!collapsed && (
                  <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em]">
                    {item.section}
                  </span>
                )}
              </div>
            )
          }

          if ('href' in item && item.href) {
            const Icon = iconMap[item.icon || '']
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                title={collapsed ? item.label : undefined}
              >
                {Icon && <Icon size={16} strokeWidth={1.8} className={cn(isActive && "text-blue")} />}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          }
          return null
        })}
      </nav>

      {/* Bottom user */}
      <div className="px-3 py-3 border-t border-border">
        <div className={cn(
          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg",
          "hover:bg-muted/60 transition-colors cursor-default"
        )}>
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] text-muted-foreground font-medium">
            U
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] text-foreground font-medium truncate">Usuario</span>
              <span className="text-[10px] text-muted-foreground truncate">admin@aurum.com</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg bg-card/90 backdrop-blur border border-border text-muted-foreground shadow-sm"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-56 bg-card transform transition-transform duration-200 md:hidden border-r border-border shadow-lg",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-card border-r border-border transition-all duration-200 shrink-0",
        collapsed ? "w-[58px]" : "w-56"
      )}>
        {navContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-2.5 top-16 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 shadow-sm"
        >
          {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
        </button>
      </aside>
    </>
  )
}
