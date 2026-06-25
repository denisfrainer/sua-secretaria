'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface MockLogoUploadProps {
  currentUrl?: string;
  onUploadComplete: (base64: string) => void;
}

export function MockLogoUpload({ currentUrl, onUploadComplete }: MockLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      onUploadComplete(base64);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div 
        onClick={triggerFileInput}
        className="group relative w-32 h-32 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-inner"
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Logo Preview" className="w-full h-full object-cover" />
            <button 
              onClick={clearLogo}
              className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-500 transition-colors">
            <ImageIcon size={32} />
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="text-white" size={24} />
        </div>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo do Estúdio</p>
        <p className="text-[9px] font-medium text-slate-400">JPG, PNG ou WebP</p>
      </div>
    </div>
  );
}
