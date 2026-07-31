'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: string | number;
  children?: NavItem[];
}

interface SidebarNavProps {
  items: NavItem[];
  collapsed?: boolean;
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-md font-medium transition-colors ${
        isActive
          ? 'bg-brand-blue-600 text-white'
          : 'text-text-secondary hover:bg-surface-canvas hover:text-text-primary'
      } ${collapsed ? 'justify-center px-2' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      {item.icon && (
        <span className="flex-shrink-0 h-5 w-5">{item.icon}</span>
      )}
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-semantic-danger px-1 text-caption font-semibold text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function SidebarNav({ items, collapsed = false }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {items.map((item) => (
        <NavLink key={item.key} item={item} collapsed={collapsed} />
      ))}
    </nav>
  );
}
