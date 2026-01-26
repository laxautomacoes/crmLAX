export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string | null
          feature_context: string | null
          id: string
          model: string | null
          profile_id: string | null
          tenant_id: string | null
          total_tokens: number | null
        }
        Insert: {
          created_at?: string | null
          feature_context?: string | null
          id?: string
          model?: string | null
          profile_id?: string | null
          tenant_id?: string | null
          total_tokens?: number | null
        }
        Update: {
          created_at?: string | null
          feature_context?: string | null
          id?: string
          model?: string | null
          profile_id?: string | null
          tenant_id?: string | null
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string | null
          details: Json | null
          documents: Json | null
          id: string
          images: Json | null
          price: number | null
          status: string | null
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["asset_type"] | null
          videos: Json | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          documents?: Json | null
          id?: string
          images?: Json | null
          price?: number | null
          status?: string | null
          tenant_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["asset_type"] | null
          videos?: Json | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          documents?: Json | null
          id?: string
          images?: Json | null
          price?: number | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["asset_type"] | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          asset_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["calendar_event_type"] | null
          id: string
          lead_id: string | null
          metadata: Json | null
          profile_id: string
          reminder_sent: boolean | null
          start_time: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"] | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          profile_id: string
          reminder_sent?: boolean | null
          start_time: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"] | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          profile_id?: string
          reminder_sent?: boolean | null
          start_time?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          marital_status: string | null
          name: string
          phone: string | null
          primary_interest: string | null
          tags: Json | null
          tenant_id: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          marital_status?: string | null
          name: string
          phone?: string | null
          primary_interest?: string | null
          tags?: Json | null
          tenant_id?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          marital_status?: string | null
          name?: string
          phone?: string | null
          primary_interest?: string | null
          tags?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          type: Database["public"]["Enums"]["interaction_type"] | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          type?: Database["public"]["Enums"]["interaction_type"] | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          type?: Database["public"]["Enums"]["interaction_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          permissions: Json | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"] | null
          tenant_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          tenant_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          tenant_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stages: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          source: string | null
          stage_id: string | null
          status: string | null
          tenant_id: string | null
          utm_data: Json | null
          value: number | null
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          tenant_id?: string | null
          utm_data?: Json | null
          value?: number | null
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          tenant_id?: string | null
          utm_data?: Json | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          tenant_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          tenant_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["profile_role"] | null
          tenant_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          tenant_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          tenant_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          api_key: string | null
          branding: Json | null
          created_at: string | null
          custom_domain: string | null
          id: string
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          slug: string
        }
        Insert: {
          api_key?: string | null
          branding?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          name: string
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          slug: string
        }
        Update: {
          api_key?: string | null
          branding?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          slug?: string
        }
        Relationships: []
      }
      updates: {
        Row: {
          description: string | null
          id: string
          published_at: string | null
          status: string | null
          title: string
          type: Database["public"]["Enums"]["update_type"] | null
          version: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          published_at?: string | null
          status?: string | null
          title: string
          type?: Database["public"]["Enums"]["update_type"] | null
          version?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          published_at?: string | null
          status?: string | null
          title?: string
          type?: Database["public"]["Enums"]["update_type"] | null
          version?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: never; Returns: string }
      slugify: { Args: { "": string }; Returns: string }
    }
    Enums: {
      asset_type:
        | "car"
        | "house"
        | "apartment"
        | "land"
        | "commercial"
        | "penthouse"
        | "studio"
      calendar_event_type: "duty" | "visit" | "note" | "other"
      interaction_type: "whatsapp" | "system" | "note"
      plan_type: "freemium" | "starter" | "pro"
      profile_role: "superadmin" | "admin" | "user"
      update_type: "feature" | "fix" | "roadmap"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asset_type: [
        "car",
        "house",
        "apartment",
        "land",
        "commercial",
        "penthouse",
        "studio",
      ],
      calendar_event_type: ["duty", "visit", "note", "other"],
      interaction_type: ["whatsapp", "system", "note"],
      plan_type: ["freemium", "starter", "pro"],
      profile_role: ["superadmin", "admin", "user"],
      update_type: ["feature", "fix", "roadmap"],
    },
  },
} as const
