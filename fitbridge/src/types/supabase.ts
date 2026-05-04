// Auto-generated placeholder for Supabase Database types.
// Run `npx supabase gen types typescript --project-id <id>` to regenerate with real types.
// Until then, use `any` to avoid blocking compilation.

export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
      };
    };
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
};
