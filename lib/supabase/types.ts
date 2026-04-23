export type PlanTier = 'FREE' | 'TRIAL' | 'STARTER' | 'PRO' | 'ELITE';

export type Database = {
  public: {
    Tables: {
      business_config: {
        Row: {
          id: number;
          instance_name: string;
          business_name: string | null;
          business_niche: string | null;
          custom_rules: string | null;
          owner_id: string;
          context_json: any;
          plan_tier: PlanTier;
          enable_smart_scarcity: boolean;
          duration_minutes: number | null;
          updated_at: string;
          // Add other fields as discovered/needed
        };
        Insert: {
          id?: number;
          instance_name?: string;
          business_name?: string | null;
          business_niche?: string | null;
          primary_service?: string | null;
          price?: number | null;
          duration_minutes?: number | null;
          custom_rules?: string | null;
          owner_id: string;
          context_json?: any;
          plan_tier?: PlanTier;
          enable_smart_scarcity?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: number;
          instance_name?: string;
          business_name?: string | null;
          business_niche?: string | null;
          primary_service?: string | null;
          price?: number | null;
          duration_minutes?: number | null;
          custom_rules?: string | null;
          owner_id?: string;
          context_json?: any;
          plan_tier?: PlanTier;
          enable_smart_scarcity?: boolean;
          updated_at?: string;
        };
      };
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
          conversation_state: 'ONBOARDING' | 'SIMULATION' | 'PAYWALL' | 'ACTIVE' | 'LEAD_ACTIVE' | 'LEAD_HANDOFF';
          profile_type: 'OWNER' | 'LEAD';
          worker_status: 'idle' | 'eliza_processing' | 'waiting_reply' | 'error';
          simulation_count: number;
          google_refresh_token: string | null;
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
          conversation_state?: 'ONBOARDING' | 'SIMULATION' | 'PAYWALL' | 'ACTIVE';
          worker_status?: 'idle' | 'eliza_processing' | 'waiting_reply' | 'error';
          simulation_count?: number;
          google_refresh_token?: string | null;
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
          conversation_state?: 'ONBOARDING' | 'SIMULATION' | 'PAYWALL' | 'ACTIVE';
          worker_status?: 'idle' | 'eliza_processing' | 'waiting_reply' | 'error';
          simulation_count?: number;
          google_refresh_token?: string | null;
        };
      };
      chat_sessions: {
        Row: {
          id: number;
          profile_id: string;
          lead_phone: string;
          paused_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          profile_id: string;
          lead_phone: string;
          paused_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          profile_id?: string;
          lead_phone?: string;
          paused_until?: string | null;
          created_at?: string;
        };
      };
      // ... more tables
    };
  };
};
