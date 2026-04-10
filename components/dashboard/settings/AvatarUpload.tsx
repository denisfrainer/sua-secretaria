'use client';

import React, { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
}

export function AvatarUpload({ userId, currentUrl, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      console.log('[STORAGE_UPLOAD_START] Attempting to upload avatar for user:', userId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        console.error('[STORAGE_UPLOAD_ERROR] Supabase returned an error:', {
          message: uploadError.message,
          name: uploadError.name,
          details: uploadError
        });
        throw uploadError;
      }

      console.log('[STORAGE_UPLOAD_SUCCESS] File uploaded successfully:', data?.path);

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('[STORAGE_UPLOAD_URL_GENERATED] Public URL:', publicUrl);
      
      onUploadComplete(publicUrl);
    } catch (err: any) {
      console.error('[PROFILE_AVATAR_EXCEPTION] Execution halted during upload:', err);
      alert('Erro ao fazer upload da imagem. Verifique as permissões do bucket "avatars".');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        onClick={triggerFileInput}
        className="group relative w-32 h-32 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-inner"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-500 transition-colors">
            <User size={32} />
          </div>
        )}

        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${uploading ? 'opacity-100 bg-black/20' : ''}`}>
          {uploading ? (
            <Loader2 className="animate-spin text-white" size={24} />
          ) : (
            <Camera className="text-white" size={24} />
          )}
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
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Foto de Perfil</p>
        <p className="text-[9px] font-medium text-slate-400">JPG, PNG ou WebP</p>
      </div>
    </div>
  );
}
