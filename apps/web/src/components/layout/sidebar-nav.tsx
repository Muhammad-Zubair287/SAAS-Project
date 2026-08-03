'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: string | number;
  /** Renders the item as a collapsible group header rather than a link. */
  children?: NavItem[];
  /**
   * `coming-soon` items render as non-navigating, aria-disabled placeholders.
   * Several nav entries point at modules that have no route yet; without this
   * they render as ordinary links and 404.
   */
  status?: 'available' | 'coming-soon';
}

interface SidebarNavProps {
  items: NavItem[];
  /** Accessible name for the landmark — the app renders more than one <nav>. */
  label?: string;
}

const BASE_ITEM_CLS =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-body-md font-medium transition-colors';

function isMatch(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

/** True when this item, or any descendant, matches the current route. */
function containsActive(item: NavItem, pathname: string): boolean {
  if (item.status !== 'coming-soon' && isMatch(pathname, item.href)) return true;
  return (item.children ?? []).some((child) => containsActive(child, pathname));
}

function ComingSoonItem({ item, depth }: { item: NavItem; depth: number }) {
  return (
    <span
      aria-disabled="true"
      className={`${BASE_ITEM_CLS} cursor-default text-text-disabled ${
        depth > 0 ? 'pl-9' : ''
      }`}
    >
      <span className="truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span className="ml-auto flex-shrink-0 rounded-full bg-surface-canvas px-2 py-0.5 text-caption font-semibold text-text-tertiary">
          {item.badge}
        </span>
      )}
    </span>
  );
}

function NavLeaf({
  item,
  depth,
  pathname,
}: {
  item: NavItem;
  depth: number;
  pathname: string;
}) {
  if (item.status === 'coming-soon') {
    return <ComingSoonItem item={item} depth={depth} />;
  }

  const active = isMatch(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`${BASE_ITEM_CLS} ${depth > 0 ? 'pl-9' : ''} ${
        active
          ? 'bg-brand-blue-600 text-white'
          : 'text-text-secondary hover:bg-surface-canvas hover:text-text-primary'
      }`}
    >
      {item.icon && (
        <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span className="truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span className="ml-auto flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-semantic-danger px-1 text-caption font-semibold text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const hasActiveChild = containsActive(item, pathname);
  const [open, setOpen] = useState(hasActiveChild);

  // Re-open when navigation moves into this group (e.g. via a breadcrumb).
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const panelId = `nav-group-${item.key}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`${BASE_ITEM_CLS} ${
          hasActiveChild && !open
            ? 'text-text-primary'
            : 'text-text-secondary hover:bg-surface-canvas hover:text-text-primary'
        }`}
      >
        {item.icon && (
          <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
            {item.icon}
          </span>
        )}
        <span className="truncate">{item.label}</span>
        <svg
          className={`ml-auto h-4 w-4 flex-shrink-0 transition-transform ${
            open ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Kept mounted but hidden so the disclosure state is stable and the
          collapsed content is not re-created on every toggle. */}
      <ul id={panelId} hidden={!open} className="mt-1 flex flex-col gap-1">
        {(item.children ?? []).map((child) => (
          <li key={child.key}>
            <NavLeaf item={child} depth={1} pathname={pathname} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SidebarNav({ items, label }: SidebarNavProps) {
  // Hoisted out of the leaf — this previously ran once per item on every render.
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="px-2 py-4">
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.key}>
            {item.children && item.children.length > 0 ? (
              <NavGroup item={item} pathname={pathname} />
            ) : (
              <NavLeaf item={item} depth={0} pathname={pathname} />
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
