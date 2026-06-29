'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// TS Interfaces
export interface VitrineProfile {
  user_id: string;
  name: string;
  bio: string | null;
  whatsapp: string;
  cover_photo_url: string | null;
  slug: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VitrineService {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  duration: number; // in minutes
  created_at?: string;
  updated_at?: string;
}

export interface VitrinePortfolioItem {
  id: string;
  user_id: string;
  image_url: string;
  category: string;
  created_at?: string;
}

// ----------------------------------------------------
// 👤 PROFILE ACTIONS
// ----------------------------------------------------

export async function getProfile(userId: string): Promise<VitrineProfile | null> {
  const supabase = await createClient();
  
  // Fetch from vitrine_profiles
  const { data: vitrineData, error: vitrineError } = await supabase
    .from('vitrine_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (vitrineError) {
    console.error('❌ [DB_READ_ERROR] getProfile (vitrine_profiles):', vitrineError.message);
    return null;
  }

  // Fetch avatar_url from profiles
  const { data: baseData, error: baseError } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (baseError) {
    console.error('❌ [DB_READ_ERROR] getProfile (profiles):', baseError.message);
  }

  if (!vitrineData) return null;

  return {
    ...vitrineData,
    avatar_url: baseData?.avatar_url || null
  };
}

export async function upsertProfile(payload: Omit<VitrineProfile, 'user_id'>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user attempting to modify profile.');

  console.log('[DB_MUTATION] upsertProfile:', { userId: user.id, ...payload });

  const record: Omit<VitrineProfile, 'avatar_url'> = {
    user_id: user.id,
    name: payload.name,
    bio: payload.bio,
    whatsapp: payload.whatsapp,
    cover_photo_url: payload.cover_photo_url,
    slug: payload.slug,
    updated_at: new Date().toISOString()
  };

  // Update vitrine_profiles
  const { error: vitrineError } = await supabase
    .from('vitrine_profiles')
    .upsert(record);

  if (vitrineError) {
    console.error('❌ [DB_MUTATION_ERROR] upsertProfile (vitrine_profiles):', vitrineError.message);
    throw new Error('Falha ao salvar configurações do perfil vitrine.');
  }

  // Update base profile with avatar_url and display_name
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      avatar_url: payload.avatar_url,
      display_name: payload.name
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('❌ [DB_MUTATION_ERROR] upsertProfile (profiles):', profileError.message);
    // Non-blocking error: we will still return success if the main storefront profile saved.
  }

  revalidatePath('/');
  revalidatePath(`/${user.id}`);
  return { success: true };
}

// ----------------------------------------------------
// 💅 SERVICES ACTIONS
// ----------------------------------------------------

export async function getServices(userId: string): Promise<VitrineService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vitrine_services')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [DB_READ_ERROR] getServices:', error.message);
    return [];
  }
  return data || [];
}

export async function createService(payload: Omit<VitrineService, 'id' | 'user_id'>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  console.log('[DB_MUTATION] createService:', { userId: user.id, ...payload });

  const { error } = await supabase
    .from('vitrine_services')
    .insert({
      user_id: user.id,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      duration: payload.duration
    });

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] createService:', error.message);
    throw new Error('Falha ao criar serviço.');
  }

  revalidatePath('/');
  revalidatePath(`/${user.id}`);
  return { success: true };
}

export async function updateService(serviceId: string, payload: Omit<VitrineService, 'id' | 'user_id'>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  console.log('[DB_MUTATION] updateService:', { serviceId, userId: user.id, ...payload });

  const { error } = await supabase
    .from('vitrine_services')
    .update({
      title: payload.title,
      description: payload.description,
      price: payload.price,
      duration: payload.duration,
      updated_at: new Date().toISOString()
    })
    .eq('id', serviceId)
    .eq('user_id', user.id);

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] updateService:', error.message);
    throw new Error('Falha ao atualizar serviço.');
  }

  revalidatePath('/');
  revalidatePath(`/${user.id}`);
  return { success: true };
}

export async function deleteService(serviceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  console.log('[DB_MUTATION] deleteService:', { serviceId, userId: user.id });

  const { error } = await supabase
    .from('vitrine_services')
    .delete()
    .eq('id', serviceId)
    .eq('user_id', user.id);

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] deleteService:', error.message);
    throw new Error('Falha ao excluir serviço.');
  }

  revalidatePath('/');
  revalidatePath(`/${user.id}`);
  return { success: true };
}

// ----------------------------------------------------
// 📷 PORTFOLIO ACTIONS
// ----------------------------------------------------

export async function getPortfolio(userId: string): Promise<VitrinePortfolioItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vitrine_portfolio')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [DB_READ_ERROR] getPortfolio:', error.message);
    return [];
  }
  return data || [];
}

export async function addPortfolioItem(payload: Omit<VitrinePortfolioItem, 'id' | 'user_id'>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  console.log('[DB_MUTATION] addPortfolioItem:', { userId: user.id, ...payload });

  const { error } = await supabase
    .from('vitrine_portfolio')
    .insert({
      user_id: user.id,
      image_url: payload.image_url,
      category: payload.category
    });

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] addPortfolioItem:', error.message);
    throw new Error('Falha ao adicionar imagem ao portfolio.');
  }

  revalidatePath('/');
  revalidatePath(`/${user.id}`);
  return { success: true };
}

export async function deletePortfolioItem(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated user.');

  console.log('[DB_MUTATION] deletePortfolioItem:', { itemId, userId: user.id });

  const { error } = await supabase
    .from('vitrine_portfolio')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] deletePortfolioItem:', error.message);
    throw new Error('Falha ao excluir item do portfolio.');
  }

  revalidatePath('/');
  revalidatePath(`/${user.id}`);
  return { success: true };
}
