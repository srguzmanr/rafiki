// src/components/shared/Layout.jsx
// Shared layout with responsive navbar for authenticated pages.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

function NavLink({ onClick, children, active }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium transition-colors hover:text-white/90 ${
        active ? 'text-white' : 'text-white/70'
      }`}
    >
      {children}
    </button>
  )
}

export function Layout({ children, title, navItems = [], actions }) {
  const { user, role, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const roleLabel = {
    admin: 'Admin',
    organizador: 'Organizador',
    vendedor: 'Vendedor',
    participante: 'Participante',
  }[role] || role

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#1F4E29] text-white px-4 py-2">
        <div className="flex items-center gap-3 w-full">
          {/* Mobile hamburger */}
          {navItems.length > 0 && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-[#1F4E29] text-white border-r-0">
                <SheetHeader>
                  <SheetTitle className="text-white">
                    <img src="/RafikiLogos03.png" alt="Rafiki" className="h-8" />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-6">
                  {navItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => { item.onClick(); setMobileOpen(false) }}
                      className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        item.active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Logo */}
          <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7 shrink-0" />

          {/* Title */}
          {title && (
            <span className="font-bold text-sm truncate hidden sm:inline">
              {title}
            </span>
          )}

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-4 ml-4">
            {navItems.map((item) => (
              <NavLink key={item.label} onClick={item.onClick} active={item.active}>
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions slot */}
          {actions}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">
                  {user?.full_name?.split(' ')[0] || roleLabel}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="text-sm font-medium">{user?.full_name || 'Usuario'}</div>
                <div className="text-xs text-muted-foreground">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Content */}
      {children}
    </div>
  )
}

// Lighter navbar for public pages (no auth, white background)
export function PublicLayout({ children, backLink }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white border-b px-4 py-3 flex items-center gap-3">
        {backLink}
        <img src="/RafikiLogos03.png" alt="Rafiki" className="h-7 mx-auto" />
        <div className="w-20" />
      </nav>
      {children}
    </div>
  )
}
