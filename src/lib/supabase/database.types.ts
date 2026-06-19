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
      ai_prompts: {
        Row: {
          ai_provider: string | null
          created_at: string
          id: string
          name: string
          system_prompt: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ai_provider?: string | null
          created_at?: string
          id?: string
          name: string
          system_prompt: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_provider?: string | null
          created_at?: string
          id?: string
          name?: string
          system_prompt?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bulk_campaign_recipients: {
        Row: {
          campaign_id: string
          error_message: string | null
          id: string
          lead_id: string | null
          recipient_name: string
          recipient_phone: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_name: string
          recipient_phone: string
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient_name?: string
          recipient_phone?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_campaign_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          filters_applied: Json | null
          id: string
          media_name: string | null
          media_type: string | null
          media_url: string | null
          message: string | null
          profile_id: string
          source_type: string | null
          status: string
          tenant_id: string
          title: string | null
          total_errors: number
          total_recipients: number
          total_success: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          filters_applied?: Json | null
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          profile_id: string
          source_type?: string | null
          status?: string
          tenant_id: string
          title?: string | null
          total_errors?: number
          total_recipients?: number
          total_success?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          filters_applied?: Json | null
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          profile_id?: string
          source_type?: string | null
          status?: string
          tenant_id?: string
          title?: string | null
          total_errors?: number
          total_recipients?: number
          total_success?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaigns_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_templates: {
        Row: {
          created_at: string | null
          id: string
          media_name: string | null
          media_type: string | null
          media_url: string | null
          message: string | null
          name: string
          profile_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          name: string
          profile_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          name?: string
          profile_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_templates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["calendar_event_type"] | null
          id: string
          lead_id: string | null
          metadata: Json | null
          profile_id: string
          property_id: string | null
          reminder_sent: boolean | null
          start_time: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"] | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          profile_id: string
          property_id?: string | null
          reminder_sent?: boolean | null
          start_time: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"] | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          profile_id?: string
          property_id?: string | null
          reminder_sent?: boolean | null
          start_time?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_asset_id_fkey"
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
          avatar_url: string | null
          birth_date: string | null
          contact_type: string[] | null
          cpf: string | null
          created_at: string | null
          documents: Json | null
          email: string | null
          id: string
          images: Json | null
          is_archived: boolean | null
          is_owner_only: boolean
          marital_status: string | null
          name: string
          notes: string | null
          phone: string | null
          property_regime: string | null
          spouse_birth_date: string | null
          spouse_cpf: string | null
          spouse_email: string | null
          spouse_name: string | null
          spouse_phone: string | null
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
          avatar_url?: string | null
          birth_date?: string | null
          contact_type?: string[] | null
          cpf?: string | null
          created_at?: string | null
          documents?: Json | null
          email?: string | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          is_owner_only?: boolean
          marital_status?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          property_regime?: string | null
          spouse_birth_date?: string | null
          spouse_cpf?: string | null
          spouse_email?: string | null
          spouse_name?: string | null
          spouse_phone?: string | null
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
          avatar_url?: string | null
          birth_date?: string | null
          contact_type?: string[] | null
          cpf?: string | null
          created_at?: string | null
          documents?: Json | null
          email?: string | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          is_owner_only?: boolean
          marital_status?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          property_regime?: string | null
          spouse_birth_date?: string | null
          spouse_cpf?: string | null
          spouse_email?: string | null
          spouse_name?: string | null
          spouse_phone?: string | null
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
      email_campaign_logs: {
        Row: {
          campaign_id: string
          error_message: string | null
          id: string
          lead_id: string | null
          opened_at: string | null
          recipient_email: string
          resend_email_id: string | null
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          campaign_id: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          opened_at?: string | null
          recipient_email: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          campaign_id?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          opened_at?: string | null
          recipient_email?: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          completed_at: string | null
          content_html: string | null
          content_text: string | null
          created_at: string | null
          created_by: string | null
          id: string
          sender_email: string | null
          sender_name: string | null
          status: string
          subject: string
          tenant_id: string
          title: string
          total_bounced: number | null
          total_clicked: number | null
          total_complained: number | null
          total_opened: number | null
          total_recipients: number | null
          total_sent: number | null
        }
        Insert: {
          completed_at?: string | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          subject: string
          tenant_id: string
          title: string
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
        }
        Update: {
          completed_at?: string | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          subject?: string
          tenant_id?: string
          title?: string
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          resend_domain_id: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          resend_domain_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          resend_domain_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          tenant_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          body_html?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          tenant_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribes: {
        Row: {
          created_at: string | null
          email: string
          id: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          order_index: number | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          order_index?: number | null
          tenant_id: string
          tipo: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          order_index?: number | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_enrollments: {
        Row: {
          cancelled_reason: string | null
          completed_at: string | null
          current_step_index: number
          enrolled_at: string | null
          enrolled_by: string | null
          id: string
          lead_id: string
          next_action_at: string
          sequence_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          cancelled_reason?: string | null
          completed_at?: string | null
          current_step_index?: number
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
          lead_id: string
          next_action_at: string
          sequence_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          cancelled_reason?: string | null
          completed_at?: string | null
          current_step_index?: number
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
          lead_id?: string
          next_action_at?: string
          sequence_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "followup_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_logs: {
        Row: {
          enrollment_id: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          step_id: string
          tenant_id: string
        }
        Insert: {
          enrollment_id: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          step_id: string
          tenant_id: string
        }
        Update: {
          enrollment_id?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          step_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "followup_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_logs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "followup_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_sequences: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          exit_on_reply: boolean
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          exit_on_reply?: boolean
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          exit_on_reply?: boolean
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_steps: {
        Row: {
          created_at: string | null
          delay_unit: string
          delay_value: number
          id: string
          media_type: string | null
          media_url: string | null
          message_template: string
          order_index: number
          sequence_id: string
        }
        Insert: {
          created_at?: string | null
          delay_unit?: string
          delay_value?: number
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_template: string
          order_index?: number
          sequence_id: string
        }
        Update: {
          created_at?: string | null
          delay_unit?: string
          delay_value?: number
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_template?: string
          order_index?: number
          sequence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "followup_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string | null
          credentials: Json | null
          id: string
          profile_id: string | null
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
          profile_id?: string | null
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
          profile_id?: string | null
          provider?: string
          settings?: Json | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      lead_documents: {
        Row: {
          created_by: string | null
          docusign_envelope_id: string | null
          file_path: string
          id: string
          lead_id: string | null
          name: string
          status: string | null
          tenant_id: string | null
          type: string
          uploaded_at: string
        }
        Insert: {
          created_by?: string | null
          docusign_envelope_id?: string | null
          file_path: string
          id?: string
          lead_id?: string | null
          name: string
          status?: string | null
          tenant_id?: string | null
          type: string
          uploaded_at?: string
        }
        Update: {
          created_by?: string | null
          docusign_envelope_id?: string | null
          file_path?: string
          id?: string
          lead_id?: string | null
          name?: string
          status?: string | null
          tenant_id?: string | null
          type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_properties: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          property_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          property_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          property_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_properties_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          color: string | null
          created_at: string | null
          id: string
          name: string
          order_index: number
          tenant_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          order_index?: number
          tenant_id?: string | null
        }
        Update: {
          color?: string | null
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
          assigned_to: string | null
          campaign: string | null
          contact_id: string | null
          created_at: string | null
          date: string | null
          documents: Json | null
          final_commission_rate: number | null
          finance_installments_count: number | null
          id: string
          images: Json | null
          is_archived: boolean | null
          last_interaction_at: string | null
          lead_source: string | null
          notes: string | null
          property_id: string | null
          property_interest: string | null
          sale_value: number | null
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
          assigned_to?: string | null
          campaign?: string | null
          contact_id?: string | null
          created_at?: string | null
          date?: string | null
          documents?: Json | null
          final_commission_rate?: number | null
          finance_installments_count?: number | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          last_interaction_at?: string | null
          lead_source?: string | null
          notes?: string | null
          property_id?: string | null
          property_interest?: string | null
          sale_value?: number | null
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
          assigned_to?: string | null
          campaign?: string | null
          contact_id?: string | null
          created_at?: string | null
          date?: string | null
          documents?: Json | null
          final_commission_rate?: number | null
          finance_installments_count?: number | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          last_interaction_at?: string | null
          lead_source?: string | null
          notes?: string | null
          property_id?: string | null
          property_interest?: string | null
          sale_value?: number | null
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
            foreignKeyName: "leads_asset_id_fkey"
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
          attachments: Json | null
          content: string
          created_at: string
          date: string
          id: string
          lead_id: string | null
          profile_id: string
          property_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          date?: string
          id?: string
          lead_id?: string | null
          profile_id: string
          property_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          date?: string
          id?: string
          lead_id?: string | null
          profile_id?: string
          property_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_asset_id_fkey"
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
      origens_trafego: {
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
            foreignKeyName: "origens_trafego_tenant_id_fkey"
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
          max_assets: number | null
          max_bulk_messages_per_month: number | null
          max_followup_sequences: number | null
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
          max_assets?: number | null
          max_bulk_messages_per_month?: number | null
          max_followup_sequences?: number | null
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
          max_assets?: number | null
          max_bulk_messages_per_month?: number | null
          max_followup_sequences?: number | null
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
      properties: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          details: Json | null
          documents: Json | null
          id: string
          images: Json | null
          is_archived: boolean | null
          is_published: boolean | null
          owner_contact_id: string | null
          price: number | null
          slug: string | null
          status: string | null
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["asset_type"] | null
          videos: Json | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          details?: Json | null
          documents?: Json | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          is_published?: boolean | null
          owner_contact_id?: string | null
          price?: number | null
          slug?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["asset_type"] | null
          videos?: Json | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          details?: Json | null
          documents?: Json | null
          id?: string
          images?: Json | null
          is_archived?: boolean | null
          is_published?: boolean | null
          owner_contact_id?: string | null
          price?: number | null
          slug?: string | null
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
          {
            foreignKeyName: "properties_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string
          created_by: string | null
          file_path: string
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_path: string
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_path?: string
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          buyer_data: Json | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          payment_terms: Json | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          buyer_data?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          payment_terms?: Json | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          buyer_data?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          payment_terms?: Json | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_stages: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      site_page_views: {
        Row: {
          broker_id: string | null
          created_at: string
          device_type: string | null
          id: string
          page_path: string
          page_title: string | null
          property_id: string | null
          referrer: string | null
          tenant_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          property_id?: string | null
          referrer?: string | null
          tenant_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          property_id?: string | null
          referrer?: string | null
          tenant_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_page_views_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_page_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_page_views_tenant_id_fkey"
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
          abacatepay_customer_id: string | null
          abacatepay_subscription_id: string | null
          api_key: string | null
          branding: Json | null
          created_at: string | null
          custom_amenities: Json | null
          custom_domain: string | null
          custom_domain_crm_verified: boolean | null
          custom_domain_updated_at: string | null
          custom_domain_verified: boolean | null
          email_domain_resend_id: string | null
          email_domain_status: string | null
          email_domain_verified: boolean | null
          email_settings: Json | null
          id: string
          is_system: boolean | null
          name: string
          payment_gateway: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          slug: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
        }
        Insert: {
          abacatepay_customer_id?: string | null
          abacatepay_subscription_id?: string | null
          api_key?: string | null
          branding?: Json | null
          created_at?: string | null
          custom_amenities?: Json | null
          custom_domain?: string | null
          custom_domain_crm_verified?: boolean | null
          custom_domain_updated_at?: string | null
          custom_domain_verified?: boolean | null
          email_domain_resend_id?: string | null
          email_domain_status?: string | null
          email_domain_verified?: boolean | null
          email_settings?: Json | null
          id?: string
          is_system?: boolean | null
          name: string
          payment_gateway?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          slug: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Update: {
          abacatepay_customer_id?: string | null
          abacatepay_subscription_id?: string | null
          api_key?: string | null
          branding?: Json | null
          created_at?: string | null
          custom_amenities?: Json | null
          custom_domain?: string | null
          custom_domain_crm_verified?: boolean | null
          custom_domain_updated_at?: string | null
          custom_domain_verified?: boolean | null
          email_domain_resend_id?: string | null
          email_domain_status?: string | null
          email_domain_verified?: boolean | null
          email_settings?: Json | null
          id?: string
          is_system?: boolean | null
          name?: string
          payment_gateway?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          slug?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      transacoes_financeiras: {
        Row: {
          categoria: string | null
          created_at: string | null
          data_transacao: string
          descricao: string | null
          external_id: string | null
          fonte: string | null
          id: string
          lead_id: string | null
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
          lead_id?: string | null
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
          lead_id?: string | null
          metadata?: Json | null
          profile_id?: string | null
          status?: string | null
          tenant_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_financeiras_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_financeiras_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_financeiras_tenant_id_fkey"
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
          stage_id: string | null
          status: string | null
          title: string
          type: Database["public"]["Enums"]["update_type"] | null
          version: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          published_at?: string | null
          stage_id?: string | null
          status?: string | null
          title: string
          type?: Database["public"]["Enums"]["update_type"] | null
          version?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          published_at?: string | null
          stage_id?: string | null
          status?: string | null
          title?: string
          type?: Database["public"]["Enums"]["update_type"] | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "updates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "roadmap_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          connected_phone: string | null
          created_at: string | null
          id: string
          instance_name: string
          qrcode: string | null
          status: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          connected_phone?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          qrcode?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          connected_phone?: string | null
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
      plan_type: "freemium" | "starter" | "pro" | "business" | "enterprise"
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
      plan_type: ["freemium", "starter", "pro", "business", "enterprise"],
      profile_role: ["superadmin", "admin", "user"],
      update_type: ["feature", "fix", "roadmap"],
    },
  },
} as const
