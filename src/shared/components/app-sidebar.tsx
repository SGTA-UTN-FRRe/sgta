'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Calendar,
  Clock,
  MessageSquare,
  BarChart3,
  Settings,
  LayoutDashboard,
  Menu,
  X,
  User,
} from 'lucide-react';
import { cn } from '@/shared/utils';
import { FaroIcon } from '@/shared/components/faro-icon';

export interface AppSidebarProps {
  variant: 'admin' | 'tutor';
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_PRIMARY_NAV: NavItem[] = [
  { label: 'Tutores', href: '/admin/tutores', icon: Users },
  { label: 'Horarios', href: '/admin/horarios', icon: Calendar },
  { label: 'Horas', href: '/admin/horas', icon: Clock },
  { label: 'Consultas', href: '/admin/consultas', icon: MessageSquare },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
];

const ADMIN_SECONDARY_NAV: NavItem[] = [
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

const TUTOR_NAV: NavItem[] = [
  { label: 'Mi resumen', href: '/tutor', icon: LayoutDashboard },
  { label: 'Mi horario', href: '/tutor/horario', icon: Calendar },
  { label: 'Mis horas', href: '/tutor/horas', icon: Clock },
];

export function AppSidebar({ variant }: AppSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryItems = variant === 'admin' ? ADMIN_PRIMARY_NAV : TUTOR_NAV;
  const secondaryItems = variant === 'admin' ? ADMIN_SECONDARY_NAV : [];
  const homeHref = variant === 'admin' ? '/admin' : '/tutor';

  const isLinkActive = (href: string): boolean => {
    if (href === '/admin' || href === '/tutor') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0B172E] text-[#F8FAFC]">
      {/* Brand Lockup con Faro Oficial UTN FRRe */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#16274E]">
        <Link href={homeHref} className="flex items-center gap-3 overflow-hidden group">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#16274E] border border-[#F59E0B]/30 shrink-0 group-hover:border-[#F59E0B] transition-colors">
            <FaroIcon className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div className="flex flex-col overflow-hidden md:hidden lg:flex">
            <span className="text-sm font-semibold tracking-wide text-white truncate">
              Tutorías
            </span>
            <span className="text-xs text-[#94A3B8] font-mono tracking-wider">
              SGTA UTN FRRe
            </span>
          </div>
        </Link>
        {mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded text-[#94A3B8] hover:text-white md:hidden"
            aria-label="Cerrar navegación"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navegación Primaria */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navegación principal">
        {primaryItems.map((item) => {
          const active = isLinkActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors',
                active
                  ? 'bg-[#16274E] text-white'
                  : 'text-[#94A3B8] hover:bg-[#16274E]/50 hover:text-white'
              )}
            >
              {/* Faro Marker: indicador activo ámbar */}
              {active && (
                <span
                  data-testid="faro-marker"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#F59E0B]"
                  aria-hidden="true"
                />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate md:hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Navegación Secundaria y Pie */}
      <div className="p-3 border-t border-[#16274E] space-y-1">
        {secondaryItems.map((item) => {
          const active = isLinkActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors',
                active
                  ? 'bg-[#16274E] text-white'
                  : 'text-[#94A3B8] hover:bg-[#16274E]/50 hover:text-white'
              )}
            >
              {active && (
                <span
                  data-testid="faro-marker"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#F59E0B]"
                  aria-hidden="true"
                />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate md:hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}

        <div className="flex items-center gap-3 px-3 py-2 text-xs text-[#94A3B8] border-t border-[#16274E]/60 pt-2 mt-2">
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate md:hidden lg:inline capitalize">
            {variant === 'admin' ? 'Administrador' : 'Tutor'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden fixed top-3 left-4 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded bg-[#0B172E] text-white shadow focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
          aria-label="Abrir navegación"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-xl">
            {navContent}
          </div>
        </div>
      )}

      <aside className="hidden md:flex flex-col shrink-0 md:w-[4.5rem] lg:w-[15.5rem] h-screen sticky top-0 transition-all duration-200 z-30">
        {navContent}
      </aside>
    </>
  );
}
