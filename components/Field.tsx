'use client';

import type { HTMLInputTypeAttribute } from 'react';

export function Field({
  label,
  placeholder,
  value,
  onChange,
  span,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  span?: number;
  type?: HTMLInputTypeAttribute;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: span ? `span ${span}` : 'auto' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dim)' }}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="focus-ring"
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          fontSize: 15.5,
          outline: 'none',
        }}
      />
    </label>
  );
}
