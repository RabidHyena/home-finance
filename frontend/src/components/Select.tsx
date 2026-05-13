import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  disabled = false,
  id,
  style,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = options.findIndex(o => o.value === value);
        setOpen(true);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(i => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          close();
          triggerRef.current?.focus();
        }
        break;
      case 'Tab':
        close();
        break;
    }
  };

  useEffect(() => {
    if (!open || focusedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[focusedIndex] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, open]);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); if (!open) { const idx = options.findIndex(o => o.value === value); setFocusedIndex(idx >= 0 ? idx : 0); } } }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 0.75rem 0.6rem 0.875rem',
          border: `1px solid ${open ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          color: selectedOption ? 'var(--color-text)' : 'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
          boxShadow: open ? '0 0 0 3px rgba(6,182,212,0.12)' : 'none',
          textAlign: 'left',
          minHeight: '40px',
        }}
      >
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          color="var(--color-text-muted)"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease-out',
          }}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.04)',
            zIndex: 200,
            maxHeight: '244px',
            overflowY: 'auto',
            padding: '0.25rem',
            animation: 'select-dropdown-in 150ms ease-out',
          }}
          onKeyDown={handleKeyDown}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isFocused = i === focusedIndex;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIndex(i)}
                onClick={() => { onChange(opt.value); close(); triggerRef.current?.focus(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-md)',
                  fontFamily: 'var(--font-body)',
                  color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
                  background: isFocused
                    ? 'var(--color-surface-2)'
                    : isSelected ? 'var(--color-accent-bg)' : 'transparent',
                  fontWeight: isSelected ? 500 : 400,
                  transition: 'background 80ms ease-out',
                  userSelect: 'none',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
                {isSelected && (
                  <Check size={14} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
