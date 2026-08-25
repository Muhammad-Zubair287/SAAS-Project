'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface RowActionItem {
  key: string;
  label: string;
  href?: string;
  onSelect?: () => void;
  tone?: 'default' | 'danger';
}

interface RowActionsMenuProps {
  label: string;
  items: RowActionItem[];
}

export function RowActionsMenu({ label, items }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl';
    const width = 220;
    const left = rtl ? rect.left : Math.max(8, rect.right - width);
    setCoords({ top: rect.bottom + 4, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointer);
    }, 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="rounded px-2 py-1 text-caption font-medium text-text-secondary hover:bg-surface-canvas hover:text-text-primary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className="fixed z-50 min-w-[13rem] rounded-md border border-border-default bg-surface-primary py-1 shadow-elevation-2"
            style={{ top: coords.top, left: coords.left }}
          >
            {items.map((item) => {
              const className = `block w-full px-3 py-2 text-start text-body-sm ${
                item.tone === 'danger' ? 'text-semantic-danger' : 'text-text-primary'
              } hover:bg-surface-canvas`;
              if (item.href) {
                return (
                  <a
                    key={item.key}
                    role="menuitem"
                    href={item.href}
                    className={className}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={className}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
