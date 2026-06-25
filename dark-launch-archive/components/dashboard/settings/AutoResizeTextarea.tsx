'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface AutoResizeTextareaProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function AutoResizeTextarea({
  label,
  value,
  onChange,
  placeholder,
  className,
  rows = 1
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [value, adjustHeight]);

  return (
    <div className="w-full flex flex-col gap-2 font-source">
      {label && (
        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          adjustHeight();
        }}
        placeholder={placeholder}
        className={className}
        rows={rows}
        style={{ overflow: 'hidden', resize: 'none' }}
      />
    </div>
  );
}
