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
      properties: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          details: Json | null
          documents: Json | null
          id: string
          images: Json | null
          is_archived: boolean | null
          is_published: boolean | null
          price: number | null
          status: string | null
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["property_type"] | null
          videos: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          details?: Json | null
          documents?: Json | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          is_published?: boolean | null
          price?: number | null
          status?: string | null
          tenant_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["property_type"] | null
          videos?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          details?: Json | null
          documents?: Json | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          is_published?: boolean | null
          price?: number | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["property_type"] | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          property_id: string | null
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
          property_id?: string | null
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
          property_id?: string | null
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
            foreignKeyName: "calendar_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          documents: Json | null
          email: string | null
          id: string
          images: Json | null
          is_archived: boolean | null
          marital_status: string | null
          name: string
          notes: string | null
          phone: string | null
          primary_interest: string | null
          tags: Json | null
          tenant_id: string | null
          videos: Json | null
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
          documents?: Json | null
          email?: string | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          marital_status?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          primary_interest?: string | null
          tags?: Json | null
          tenant_id?: string | null
          videos?: Json | null
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
          documents?: Json | null
          email?: string | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          marital_status?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          primary_interest?: string | null
          tags?: Json | null
          tenant_id?: string | null
          videos?: Json | null
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
      integrations: {
        Row: {
          created_at: string | null
          credentials: Json | null
          id: string
          provider: string
          settings: Json | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          provider: string
          settings?: Json | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          provider?: string
          settings?: Json | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tenant_id_fkey"
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
      lead_campaigns: {
        Row: {
          created_at: string | null
          id: string
          name: string
          source_name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          source_name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          source_name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_tenant_id_fkey"
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
          property_id: string | null
          assigned_to: string | null
          campaign: string | null
          contact_id: string | null
          created_at: string | null
          date: string | null
          documents: Json | null
          id: string
          images: Json | null
          is_archived: boolean | null
          lead_source: string | null
          notes: string | null
          source: string | null
          stage_id: string | null
          status: string | null
          tenant_id: string | null
          utm_campaign: string | null
          utm_data: Json | null
          utm_medium: string | null
          utm_source: string | null
          valor_estimado: number | null
          value: number | null
          videos: Json | null
          whatsapp_chat: Json | null
        }
        Insert: {
          property_id?: string | null
          assigned_to?: string | null
          campaign?: string | null
          contact_id?: string | null
          created_at?: string | null
          date?: string | null
          documents?: Json | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          lead_source?: string | null
          notes?: string | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          tenant_id?: string | null
          utm_campaign?: string | null
          utm_data?: Json | null
          utm_medium?: string | null
          utm_source?: string | null
          valor_estimado?: number | null
          value?: number | null
          videos?: Json | null
          whatsapp_chat?: Json | null
        }
        Update: {
          property_id?: string | null
          assigned_to?: string | null
          campaign?: string | null
          contact_id?: string | null
          created_at?: string | null
          date?: string | null
          documents?: Json | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          lead_source?: string | null
          notes?: string | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          tenant_id?: string | null
          utm_campaign?: string | null
          utm_data?: Json | null
          utm_medium?: string | null
          utm_source?: string | null
          valor_estimado?: number | null
          value?: number | null
          videos?: Json | null
          whatsapp_chat?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      notes: {
        Row: {
          property_id: string | null
          attachments: Json | null
          content: string
          created_at: string
          date: string
          id: string
          lead_id: string | null
          profile_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          property_id?: string | null
          attachments?: Json | null
          content: string
          created_at?: string
          date?: string
          id?: string
          lead_id?: string | null
          profile_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          property_id?: string | null
          attachments?: Json | null
          content?: string
          created_at?: string
          date?: string
          id?: string
          lead_id?: string | null
          profile_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_tenant_id_fkey"
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
      traffic_sources: {
        Row: {
          campanha_id: string | null
          campanha_nome: string | null
          created_at: string | null
          custo: number | null
          data_fim: string | null
          data_inicio: string
          id: string
          metadata: Json | null
          moeda: string | null
          plataforma: string
          tenant_id: string
        }
        Insert: {
          campanha_id?: string | null
          campanha_nome?: string | null
          created_at?: string | null
          custo?: number | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          metadata?: Json | null
          moeda?: string | null
          plataforma: string
          tenant_id: string
        }
        Update: {
          campanha_id?: string | null
          campanha_nome?: string | null
          created_at?: string | null
          custo?: number | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          metadata?: Json | null
          moeda?: string | null
          plataforma?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          ai_features_list: string[] | null
          ai_model: string | null
          ai_provider: string | null
          ai_requests_per_month: number | null
          description_text: string | null
          display_name: string | null
          display_order: number | null
          features_list: string[] | null
          has_ai: boolean | null
          has_custom_domain: boolean | null
          has_marketing: boolean | null
          has_whatsapp: boolean | null
          is_highlighted: boolean | null
          max_properties: number | null
          max_leads_per_month: number | null
          max_users: number | null
          period_text: string | null
          plan_type: string
          price_text: string | null
        }
        Insert: {
          ai_features_list?: string[] | null
          ai_model?: string | null
          ai_provider?: string | null
          ai_requests_per_month?: number | null
          description_text?: string | null
          display_name?: string | null
          display_order?: number | null
          features_list?: string[] | null
          has_ai?: boolean | null
          has_custom_domain?: boolean | null
          has_marketing?: boolean | null
          has_whatsapp?: boolean | null
          is_highlighted?: boolean | null
          max_properties?: number | null
          max_leads_per_month?: number | null
          max_users?: number | null
          period_text?: string | null
          plan_type: string
          price_text?: string | null
        }
        Update: {
          ai_features_list?: string[] | null
          ai_model?: string | null
          ai_provider?: string | null
          ai_requests_per_month?: number | null
          description_text?: string | null
          display_name?: string | null
          display_order?: number | null
          features_list?: string[] | null
          has_ai?: boolean | null
          has_custom_domain?: boolean | null
          has_marketing?: boolean | null
          has_whatsapp?: boolean | null
          is_highlighted?: boolean | null
          max_properties?: number | null
          max_leads_per_month?: number | null
          max_users?: number | null
          period_text?: string | null
          plan_type?: string
          price_text?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_active_for_service: boolean | null
          last_lead_assigned_at: string | null
          permissions: Json | null
          role: Database["public"]["Enums"]["profile_role"] | null
          tenant_id: string | null
          updated_at: string | null
          whatsapp_api_key: string | null
          whatsapp_instance_name: string | null
          whatsapp_number: string | null
          whatsapp_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active_for_service?: boolean | null
          last_lead_assigned_at?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          tenant_id?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_instance_name?: string | null
          whatsapp_number?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active_for_service?: boolean | null
          last_lead_assigned_at?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["profile_role"] | null
          tenant_id?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_instance_name?: string | null
          whatsapp_number?: string | null
          whatsapp_status?: string | null
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
      system_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          profile_id: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          profile_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          profile_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_tenant_id_fkey"
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
          custom_domain_crm_verified: boolean | null
          custom_domain_updated_at: string | null
          custom_domain_verified: boolean | null
          id: string
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
        }
        Insert: {
          api_key?: string | null
          branding?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_crm_verified?: boolean | null
          custom_domain_updated_at?: string | null
          custom_domain_verified?: boolean | null
          id?: string
          name: string
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Update: {
          api_key?: string | null
          branding?: Json | null
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_crm_verified?: boolean | null
          custom_domain_updated_at?: string | null
          custom_domain_verified?: boolean | null
          id?: string
          name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          categoria: string | null
          created_at: string | null
          data_transacao: string
          descricao: string | null
          external_id: string | null
          fonte: string | null
          id: string
          metadata: Json | null
          profile_id: string | null
          status: string | null
          tenant_id: string
          tipo: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          data_transacao?: string
          descricao?: string | null
          external_id?: string | null
          fonte?: string | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          status?: string | null
          tenant_id: string
          tipo: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          data_transacao?: string
          descricao?: string | null
          external_id?: string | null
          fonte?: string | null
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          status?: string | null
          tenant_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      whatsapp_instances: {
        Row: {
          created_at: string | null
          id: string
          instance_name: string
          qrcode: string | null
          status: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_name: string
          qrcode?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_name?: string
          qrcode?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_plan_feature: {
        Args: { p_feature: string; p_tenant_id: string }
        Returns: boolean
      }
      get_ai_usage_this_month: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      get_user_tenant_id: { Args: never; Returns: string }
      slugify: { Args: { "": string }; Returns: string }
    }
    Enums: {
      property_type:
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
      property_type: [
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
