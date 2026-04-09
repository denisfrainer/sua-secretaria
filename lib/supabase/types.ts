export type PlanTier = 'STARTER' | 'PRO' | 'ELITE';

export type Database = {
  public: {
    Tables: {
      business_config: {
        Row: {
          id: number;
          instance_name: string;
          context_json: any;
          plan_tier: PlanTier;
          updated_at: string;
          // Add other fields as discovered/needed
        };
        Insert: {
          id?: number;
          instance_name: string;
          context_json: any;
          plan_tier?: PlanTier;
          updated_at?: string;
        };
        Update: {
          id?: number;
          instance_name?: string;
          context_json?: any;
          plan_tier?: PlanTier;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          plan_tier: PlanTier;
          // Add other fields
        };
      };
      // ... more tables
    };
  };
};
