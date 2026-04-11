export type PlanTier = 'FREE' | 'TRIAL' | 'STARTER' | 'PRO' | 'ELITE';

export type Database = {
  public: {
    Tables: {
      business_config: {
        Row: {
          id: number;
          instance_name: string;
          context_json: any;
          plan_tier: PlanTier;
          enable_smart_scarcity: boolean;
          trial_ends_at: string | null;
          updated_at: string;
          // Add other fields as discovered/needed
        };
        Insert: {
          id?: number;
          instance_name: string;
          context_json: any;
          plan_tier?: PlanTier;
          enable_smart_scarcity?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: number;
          instance_name?: string;
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
        };
      };
      // ... more tables
    };
  };
};
