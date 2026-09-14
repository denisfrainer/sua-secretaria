export type PlanTier = 'FREE' | 'TRIAL' | 'STARTER' | 'PRO' | 'ELITE';

export type CouponStatus = 'active' | 'redeemed' | 'expired' | 'cancelled';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          whatsapp: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          background_color: string;
          cooldown_hours: number;
          plan_tier: PlanTier;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // references auth.users(id)
          name: string;
          slug: string;
          whatsapp: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          background_color?: string;
          cooldown_hours?: number;
          plan_tier?: PlanTier;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          whatsapp?: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          background_color?: string;
          cooldown_hours?: number;
          plan_tier?: PlanTier;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      premios: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          description: string | null;
          probability_weight: number;
          initial_stock: number;
          current_stock: number;
          color_hex: string;
          text_color_hex: string;
          is_active: boolean;
          is_losing_slice: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          title: string;
          description?: string | null;
          probability_weight?: number;
          initial_stock?: number;
          current_stock?: number;
          color_hex?: string;
          text_color_hex?: string;
          is_active?: boolean;
          is_losing_slice?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          title?: string;
          description?: string | null;
          probability_weight?: number;
          initial_stock?: number;
          current_stock?: number;
          color_hex?: string;
          text_color_hex?: string;
          is_active?: boolean;
          is_losing_slice?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      cupons: {
        Row: {
          id: string;
          tenant_id: string;
          premio_id: string | null;
          code: string;
          consumer_phone: string;
          consumer_name: string | null;
          status: CouponStatus;
          expires_at: string;
          redeemed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          premio_id?: string | null;
          code: string;
          consumer_phone: string;
          consumer_name?: string | null;
          status?: CouponStatus;
          expires_at?: string;
          redeemed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          premio_id?: string | null;
          code?: string;
          consumer_phone?: string;
          consumer_name?: string | null;
          status?: CouponStatus;
          expires_at?: string;
          redeemed_at?: string | null;
          created_at?: string;
        };
      };
      spins_history: {
        Row: {
          id: string;
          tenant_id: string;
          consumer_phone: string;
          premio_id: string | null;
          cupom_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          consumer_phone: string;
          premio_id?: string | null;
          cupom_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          consumer_phone?: string;
          premio_id?: string | null;
          cupom_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      // Legacy compatibility tables (profiles & vitrine_profiles)
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          plan_tier: PlanTier;
          slug: string | null;
          display_name: string | null;
          avatar_url: string | null;
          trial_ends_at: string | null;
          phone: string | null;
          conversation_state: string;
          profile_type: string;
          worker_status: string;
          simulation_count: number;
          google_refresh_token: string | null;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          email?: string;
          full_name?: string;
          plan_tier?: PlanTier;
          slug?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          trial_ends_at?: string | null;
          phone?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          plan_tier?: PlanTier;
          slug?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          trial_ends_at?: string | null;
          phone?: string | null;
        };
      };
      vitrine_profiles: {
        Row: {
          user_id: string;
          name: string;
          bio: string | null;
          whatsapp: string;
          cover_photo_url: string | null;
          slug: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          user_id: string;
          name: string;
          bio?: string | null;
          whatsapp: string;
          cover_photo_url?: string | null;
          slug?: string | null;
        };
        Update: {
          user_id?: string;
          name?: string;
          bio?: string | null;
          whatsapp?: string;
          cover_photo_url?: string | null;
          slug?: string | null;
        };
      };
    };
    Functions: {
      spin_roulette: {
        Args: {
          p_tenant_id: string;
          p_consumer_phone: string;
          p_consumer_name?: string | null;
        };
        Returns: Json;
      };
    };
  };
};

// ============================================================================
// DOMAIN MODEL TYPE ALIASES (Application Layer)
// ============================================================================
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export type Premio = Database['public']['Tables']['premios']['Row'];
export type PremioInsert = Database['public']['Tables']['premios']['Insert'];
export type PremioUpdate = Database['public']['Tables']['premios']['Update'];

export type Cupom = Database['public']['Tables']['cupons']['Row'];
export type CupomInsert = Database['public']['Tables']['cupons']['Insert'];
export type CupomUpdate = Database['public']['Tables']['cupons']['Update'];

export type SpinsHistory = Database['public']['Tables']['spins_history']['Row'];

/**
 * Result payload returned from server-side spin_roulette RPC
 */
export interface SpinResult {
  success: boolean;
  is_winner?: boolean;
  winning_index?: number;
  error_code?: 'COOLDOWN_ACTIVE' | 'TENANT_NOT_FOUND' | 'INTERNAL_ERROR';
  cooldown_until?: string;
  premio?: {
    id?: string;
    title: string;
    description?: string | null;
    color_hex: string;
    text_color_hex?: string;
  } | null;
  cupom?: {
    id: string;
    code: string;
    expires_at: string;
    status: CouponStatus;
  } | null;
  message: string;
}

/**
 * Input payloads for Tenant Dashboard mutations
 */
export interface TenantBrandingInput {
  name: string;
  slug: string;
  whatsapp: string;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  cooldown_hours?: number;
}

export interface PremioInput {
  title: string;
  description?: string | null;
  probability_weight: number;
  initial_stock: number;
  color_hex: string;
  text_color_hex?: string;
  is_active?: boolean;
  is_losing_slice?: boolean;
}
