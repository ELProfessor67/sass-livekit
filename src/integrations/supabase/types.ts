export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Updated types to include call_history and sms_messages tables

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          access_token: string | null
          address: string | null
          agency_margin_percentage: number | null
          call_duration_spikes: number | null
          city: string | null
          company_id: string
          country: string | null
          created_on: string | null
          custom_link_id: string | null
          custom_link_url: string | null
          domain: string | null
          email: string | null
          expires_in: string | null
          high_usage_alerts_limit: number | null
          id: string
          invoice_status: boolean | null
          is_active: boolean | null
          location_count: string | null
          logo_url: string | null
          name: string
          payment_reminders: number | null
          payment_type: string | null
          phone: string | null
          postal_code: string | null
          refresh_token: string | null
          state: string | null
          stripe_brand: string | null
          stripe_card_added: boolean | null
          stripe_customer_id: string | null
          stripe_last4: string | null
          stripe_session_id: string | null
          user_billing_location_id: string | null
          user_margin_percentage: number | null
        }
        Insert: {
          access_token?: string | null
          address?: string | null
          agency_margin_percentage?: number | null
          call_duration_spikes?: number | null
          city?: string | null
          company_id: string
          country?: string | null
          created_on?: string | null
          custom_link_id?: string | null
          custom_link_url?: string | null
          domain?: string | null
          email?: string | null
          expires_in?: string | null
          high_usage_alerts_limit?: number | null
          id?: string
          invoice_status?: boolean | null
          is_active?: boolean | null
          location_count?: string | null
          logo_url?: string | null
          name: string
          payment_reminders?: number | null
          payment_type?: string | null
          phone?: string | null
          postal_code?: string | null
          refresh_token?: string | null
          state?: string | null
          stripe_brand?: string | null
          stripe_card_added?: boolean | null
          stripe_customer_id?: string | null
          stripe_last4?: string | null
          stripe_session_id?: string | null
          user_billing_location_id?: string | null
          user_margin_percentage?: number | null
        }
        Update: {
          access_token?: string | null
          address?: string | null
          agency_margin_percentage?: number | null
          call_duration_spikes?: number | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_on?: string | null
          custom_link_id?: string | null
          custom_link_url?: string | null
          domain?: string | null
          email?: string | null
          expires_in?: string | null
          high_usage_alerts_limit?: number | null
          id?: string
          invoice_status?: boolean | null
          is_active?: boolean | null
          location_count?: string | null
          logo_url?: string | null
          name?: string
          payment_reminders?: number | null
          payment_type?: string | null
          phone?: string | null
          postal_code?: string | null
          refresh_token?: string | null
          state?: string | null
          stripe_brand?: string | null
          stripe_card_added?: boolean | null
          stripe_customer_id?: string | null
          stripe_last4?: string | null
          stripe_session_id?: string | null
          user_billing_location_id?: string | null
          user_margin_percentage?: number | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          agency_id: string | null
          assistant_id: string
          assistant_name: string
          booking_time: string
          call_log_id: string
          company_id: string
          contact_id: string
          created_at: string
          first_name: string | null
          ghl_location_id: string
          id: string
          last_name: string | null
          location_metadata: Json | null
          location_uuid: string | null
          phone_number: string
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          assistant_id: string
          assistant_name: string
          booking_time: string
          call_log_id: string
          company_id: string
          contact_id: string
          created_at: string
          first_name?: string | null
          ghl_location_id: string
          id?: string
          last_name?: string | null
          location_metadata?: Json | null
          location_uuid?: string | null
          phone_number: string
          status: string
          type: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          assistant_id?: string
          assistant_name?: string
          booking_time?: string
          call_log_id?: string
          company_id?: string
          contact_id?: string
          created_at?: string
          first_name?: string | null
          ghl_location_id?: string
          id?: string
          last_name?: string | null
          location_metadata?: Json | null
          location_uuid?: string | null
          phone_number?: string
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_uuid_fkey"
            columns: ["location_uuid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant: {
        Row: {
          agency_id: string | null
          analysis_evaluation_prompt: string | null
          analysis_evaluation_timeout: number | null
          analysis_structured_data_prompt: string | null
          analysis_structured_data_properties: Json | null
          analysis_structured_data_timeout: number | null
          analysis_summary_prompt: string | null
          analysis_summary_timeout: number | null
          structured_data_fields: Json | null
          audio_recording_format:
            | Database["public"]["Enums"]["audio_recording_format"]
            | null
          audio_recording_setting: boolean | null
          backchanneling_enabled: boolean | null
          background_denoising_enabled: boolean | null
          background_sound_setting: string | null
          calendar_id: string | null
          cal_api_key: string | null
          cal_event_type_id: string | null
          cal_event_type_slug: string | null
          cal_timezone: string | null
          first_sms: string | null
          sms_prompt: string | null
          company_id: string | null
          created_at: string | null
          end_call_message: string | null
          end_call_phrases: string | null
          filler_injection_enabled: boolean | null
          first_message: string | null
          first_message_mode: string | null
          ghl_location_id: string | null
          groq_api_key: string | null
          groq_max_tokens: number | null
          groq_model: string | null
          groq_temperature: number | null
          hipaa_compliance: boolean | null
          id: string
          idle_messages: Json | null
          idle_timeout: number | null
          inbound_webhook_url: string | null
          input_min_characters: number | null
          knowledge_base_id: string | null
          language_setting: string | null
          llm_model_setting: string | null
          llm_provider_setting: string | null
          max_call_duration: number | null
          name: string | null
          pci_compliance: boolean | null
          prompt: string | null
          silence_timeout: number | null
          smart_endpointing: boolean | null
          temperature_setting: number | null
          updated_at: string | null
          use_speaker_boost: boolean | null
          user_id: string | null
          video_recording: boolean | null
          voice_backoff_seconds: number | null
          voice_clarity_similarity: number | null
          voice_model_setting: string | null
          voice_name_setting: string | null
          voice_number_of_words: number | null
          voice_on_no_punctuation_seconds: number | null
          voice_on_number_seconds: number | null
          voice_on_punctuation_seconds: number | null
          voice_optimize_streaming_latency: number | null
          voice_provider_setting: string | null
          voice_seconds: number | null
          voice_speed: number | null
          voice_stability: number | null
          voice_style_exaggeration: number | null
          voicemail_detection: boolean | null
          wait_seconds: number | null
        }
        Insert: {
          agency_id?: string | null
          analysis_evaluation_prompt?: string | null
          analysis_evaluation_timeout?: number | null
          analysis_structured_data_prompt?: string | null
          analysis_structured_data_properties?: Json | null
          analysis_structured_data_timeout?: number | null
          analysis_summary_prompt?: string | null
          analysis_summary_timeout?: number | null
          structured_data_fields?: Json | null
          audio_recording_format?:
            | Database["public"]["Enums"]["audio_recording_format"]
            | null
          audio_recording_setting?: boolean | null
          backchanneling_enabled?: boolean | null
          background_denoising_enabled?: boolean | null
          background_sound_setting?: string | null
          calendar_id?: string | null
          cal_api_key?: string | null
          cal_event_type_id?: string | null
          cal_event_type_slug?: string | null
          cal_timezone?: string | null
          first_sms?: string | null
          sms_prompt?: string | null
          company_id?: string | null
          created_at?: string | null
          end_call_message?: string | null
          end_call_phrases?: string | null
          filler_injection_enabled?: boolean | null
          first_message?: string | null
          first_message_mode?: string | null
          ghl_location_id?: string | null
          groq_max_tokens?: number | null
          groq_model?: string | null
          groq_temperature?: number | null
          cerebras_max_tokens?: number | null
          cerebras_model?: string | null
          cerebras_temperature?: number | null
          hipaa_compliance?: boolean | null
          id?: string
          idle_messages?: Json | null
          idle_timeout?: number | null
          inbound_webhook_url?: string | null
          input_min_characters?: number | null
          knowledge_base_id?: string | null
          language_setting?: string | null
          llm_model_setting?: string | null
          llm_provider_setting?: string | null
          max_call_duration?: number | null
          max_idle_messages?: number | null
          max_token_setting?: number | null
          maximum_duration?: number | null
          name?: string | null
          pci_compliance?: boolean | null
          prompt?: string | null
          silence_timeout?: number | null
          smart_endpointing?: boolean | null
          temperature_setting?: number | null
          updated_at?: string | null
          use_speaker_boost?: boolean | null
          user_id?: string | null
          video_recording?: boolean | null
          voice_backoff_seconds?: number | null
          voice_clarity_similarity?: number | null
          voice_model_setting?: string | null
          voice_name_setting?: string | null
          voice_number_of_words?: number | null
          voice_on_no_punctuation_seconds?: number | null
          voice_on_number_seconds?: number | null
          voice_on_punctuation_seconds?: number | null
          voice_optimize_streaming_latency?: number | null
          voice_provider_setting?: string | null
          voice_seconds?: number | null
          voice_speed?: number | null
          voice_stability?: number | null
          voice_style_exaggeration?: number | null
          voicemail_detection?: boolean | null
          wait_seconds?: number | null
        }
        Update: {
          agency_id?: string | null
          analysis_evaluation_prompt?: string | null
          analysis_evaluation_timeout?: number | null
          analysis_structured_data_prompt?: string | null
          analysis_structured_data_properties?: Json | null
          analysis_structured_data_timeout?: number | null
          analysis_summary_prompt?: string | null
          analysis_summary_timeout?: number | null
          structured_data_fields?: Json | null
          audio_recording_format?:
            | Database["public"]["Enums"]["audio_recording_format"]
            | null
          audio_recording_setting?: boolean | null
          backchanneling_enabled?: boolean | null
          background_denoising_enabled?: boolean | null
          background_sound_setting?: string | null
          calendar_id?: string | null
          cal_api_key?: string | null
          cal_event_type_id?: string | null
          cal_event_type_slug?: string | null
          cal_timezone?: string | null
          first_sms?: string | null
          sms_prompt?: string | null
          company_id?: string | null
          created_at?: string | null
          end_call_message?: string | null
          end_call_phrases?: string | null
          filler_injection_enabled?: boolean | null
          first_message?: string | null
          first_message_mode?: string | null
          ghl_location_id?: string | null
          groq_max_tokens?: number | null
          groq_model?: string | null
          groq_temperature?: number | null
          cerebras_max_tokens?: number | null
          cerebras_model?: string | null
          cerebras_temperature?: number | null
          hipaa_compliance?: boolean | null
          id?: string
          idle_messages?: Json | null
          idle_timeout?: number | null
          inbound_webhook_url?: string | null
          input_min_characters?: number | null
          knowledge_base_id?: string | null
          language_setting?: string | null
          llm_model_setting?: string | null
          llm_provider_setting?: string | null
          max_call_duration?: number | null
          max_idle_messages?: number | null
          max_token_setting?: number | null
          maximum_duration?: number | null
          name?: string | null
          pci_compliance?: boolean | null
          prompt?: string | null
          silence_timeout?: number | null
          smart_endpointing?: boolean | null
          temperature_setting?: number | null
          updated_at?: string | null
          use_speaker_boost?: boolean | null
          user_id?: string | null
          video_recording?: boolean | null
          voice_backoff_seconds?: number | null
          voice_clarity_similarity?: number | null
          voice_model_setting?: string | null
          voice_name_setting?: string | null
          voice_number_of_words?: number | null
          voice_on_no_punctuation_seconds?: number | null
          voice_on_number_seconds?: number | null
          voice_on_punctuation_seconds?: number | null
          voice_optimize_streaming_latency?: number | null
          voice_provider_setting?: string | null
          voice_seconds?: number | null
          voice_speed?: number | null
          voice_stability?: number | null
          voice_style_exaggeration?: number | null
          voicemail_detection?: boolean | null
          wait_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assistant_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integration: {
        Row: {
          agency: string | null
          agency_id: string | null
          company_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          ghl_location_id: string | null
          ghl_user_id: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          status: string | null
          updated_at: string | null
          user: string | null
          user_id: string | null
        }
        Insert: {
          agency?: string | null
          agency_id?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          ghl_location_id?: string | null
          ghl_user_id?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          user?: string | null
          user_id?: string | null
        }
        Update: {
          agency?: string | null
          agency_id?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          ghl_location_id?: string | null
          ghl_user_id?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          user?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integration_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calendar_integration_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          address: string | null
          agency_cost: string | null
          agency_id: string | null
          analysis: Json | null
          assistant_id: string | null
          assistant_name: string | null
          call_cost: string | null
          call_outcome: string | null
          call_recording: string | null
          company_id: string | null
          contact_id: string | null
          contact_url: string | null
          created_at: string | null
          duration: string | null
          ended_reason: string | null
          first_name: string | null
          ghl_location_id: string | null
          id: string
          last_name: string | null
          location_uuid: string | null
          phone_number: string | null
          status: string | null
          summary: string | null
          transcript: Json | null
          type: string | null
          user_cost: string | null
          user_id: string | null
          vapi_call_id: string | null
        }
        Insert: {
          address?: string | null
          agency_cost?: string | null
          agency_id?: string | null
          analysis?: Json | null
          assistant_id?: string | null
          assistant_name?: string | null
          call_cost?: string | null
          call_outcome?: string | null
          call_recording?: string | null
          company_id?: string | null
          contact_id?: string | null
          contact_url?: string | null
          created_at?: string | null
          duration?: string | null
          ended_reason?: string | null
          first_name?: string | null
          ghl_location_id?: string | null
          id?: string
          last_name?: string | null
          location_uuid?: string | null
          phone_number?: string | null
          status?: string | null
          summary?: string | null
          transcript?: Json | null
          type?: string | null
          user_cost?: string | null
          user_id?: string | null
          vapi_call_id?: string | null
        }
        Update: {
          address?: string | null
          agency_cost?: string | null
          agency_id?: string | null
          analysis?: Json | null
          assistant_id?: string | null
          assistant_name?: string | null
          call_cost?: string | null
          call_outcome?: string | null
          call_recording?: string | null
          company_id?: string | null
          contact_id?: string | null
          contact_url?: string | null
          created_at?: string | null
          duration?: string | null
          ended_reason?: string | null
          first_name?: string | null
          ghl_location_id?: string | null
          id?: string
          last_name?: string | null
          location_uuid?: string | null
          phone_number?: string | null
          status?: string | null
          summary?: string | null
          transcript?: Json | null
          type?: string | null
          user_cost?: string | null
          user_id?: string | null
          vapi_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_location_uuid_fkey"
            columns: ["location_uuid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_call_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      field_visibility: {
        Row: {
          created_at: string | null
          default_permission: Database["public"]["Enums"]["field_permission"]
          description: string | null
          field_category: string
          field_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_permission?: Database["public"]["Enums"]["field_permission"]
          description?: string | null
          field_category: string
          field_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_permission?: Database["public"]["Enums"]["field_permission"]
          description?: string | null
          field_category?: string
          field_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          agency_id: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          ghl_location_id: string
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          ghl_location_id: string
          id?: string
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          ghl_location_id?: string
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          access_token: string | null
          address: string | null
          agency_id: string | null
          billing: Json | null
          card_detail: Json | null
          company_id: string | null
          contact: Json | null
          created_on: string | null
          crm_integration: Json | null
          custom_link_id: Json[] | null
          custom_link_url: string | null
          expires_in: string | null
          ghl_invoice_id: string | null
          ghl_location_id: string | null
          ghl_snapshot: boolean | null
          id: string
          invoice_status: boolean | null
          is_active: boolean | null
          name: string | null
          payment_type: string | null
          pipeline_id: string | null
          refresh_token: string | null
          stripe_card_added: boolean | null
          stripe_checkout_url: string | null
          stripe_customer_id: string | null
          stripe_session_id: string | null
          timezone: string | null
          twilio_account_sid: string | null
          twilio_auth_is_available: boolean | null
          twilio_auth_token: string | null
          twilio_last_used_at: string | null
          updated_at: string | null
          plan: string | null
          trial_ends_at: string | null
          minutes_limit: number | null
          minutes_used: number | null
        }
        Insert: {
          access_token?: string | null
          address?: string | null
          agency_id?: string | null
          billing?: Json | null
          card_detail?: Json | null
          company_id?: string | null
          contact?: Json | null
          created_on?: string | null
          crm_integration?: Json | null
          custom_link_id?: Json[] | null
          custom_link_url?: string | null
          expires_in?: string | null
          ghl_invoice_id?: string | null
          ghl_location_id?: string | null
          ghl_snapshot?: boolean | null
          id: string
          invoice_status?: boolean | null
          is_active?: boolean | null
          name?: string | null
          payment_type?: string | null
          pipeline_id?: string | null
          refresh_token?: string | null
          stripe_card_added?: boolean | null
          stripe_checkout_url?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          timezone?: string | null
          twilio_account_sid?: string | null
          twilio_auth_is_available?: boolean | null
          twilio_auth_token?: string | null
          twilio_last_used_at?: string | null
          updated_at?: string | null
          plan?: string | null
          trial_ends_at?: string | null
          minutes_limit?: number | null
          minutes_used?: number | null
        }
        Update: {
          access_token?: string | null
          address?: string | null
          agency_id?: string | null
          billing?: Json | null
          card_detail?: Json | null
          company_id?: string | null
          contact?: Json | null
          created_on?: string | null
          crm_integration?: Json | null
          custom_link_id?: Json[] | null
          custom_link_url?: string | null
          expires_in?: string | null
          ghl_invoice_id?: string | null
          ghl_location_id?: string | null
          ghl_snapshot?: boolean | null
          id?: string
          invoice_status?: boolean | null
          is_active?: boolean | null
          name?: string | null
          payment_type?: string | null
          pipeline_id?: string | null
          refresh_token?: string | null
          stripe_card_added?: boolean | null
          stripe_checkout_url?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          timezone?: string | null
          twilio_account_sid?: string | null
          twilio_auth_is_available?: boolean | null
          twilio_auth_token?: string | null
          twilio_last_used_at?: string | null
          updated_at?: string | null
          plan?: string | null
          trial_ends_at?: string | null
          minutes_limit?: number | null
          minutes_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      phone_number: {
        Row: {
          id: string
          phone_sid: string | null
          number: string
          label: string | null
          inbound_assistant_id: string | null
          webhook_status: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone_sid?: string | null
          number: string
          label?: string | null
          inbound_assistant_id?: string | null
          webhook_status?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_sid?: string | null
          number?: string
          label?: string | null
          inbound_assistant_id?: string | null
          webhook_status?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_phone_number_assistant"
            columns: ["inbound_assistant_id"]
            isOneToOne: false
            referencedRelation: "assistant"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          agency_id: string | null
          company_address: string | null
          company_description: string | null
          company_industry: string | null
          company_phone: string | null
          company_size: string | null
          company_website: string | null
          created_at: string
          id: string
          logo_url: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          workspace_name: string
        }
        Insert: {
          agency_id?: string | null
          company_address?: string | null
          company_description?: string | null
          company_industry?: string | null
          company_phone?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          workspace_name?: string
        }
        Update: {
          agency_id?: string | null
          company_address?: string | null
          company_description?: string | null
          company_industry?: string | null
          company_phone?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          workspace_name?: string
        }
        Relationships: []
      }
      call_history: {
        Row: {
          id: string
          call_id: string
          assistant_id: string
          phone_number: string | null
          participant_identity: string | null
          start_time: string
          end_time: string
          call_duration: number
          call_status: string
          transcription: Json | null
          call_outcome: string | null
          outcome_confidence: number | null
          outcome_reasoning: string | null
          outcome_key_points: Json | null
          outcome_sentiment: string | null
          follow_up_required: boolean | null
          follow_up_notes: string | null
          call_summary: string | null
          success_evaluation: string | null
          structured_data: Json | null
          call_sid: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_id: string
          assistant_id: string
          phone_number?: string | null
          participant_identity?: string | null
          start_time: string
          end_time: string
          call_duration: number
          call_status?: string
          transcription?: Json | null
          call_outcome?: string | null
          outcome_confidence?: number | null
          outcome_reasoning?: string | null
          outcome_key_points?: Json | null
          outcome_sentiment?: string | null
          follow_up_required?: boolean | null
          follow_up_notes?: string | null
          call_summary?: string | null
          success_evaluation?: string | null
          structured_data?: Json | null
          call_sid?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          assistant_id?: string
          phone_number?: string | null
          participant_identity?: string | null
          start_time?: string
          end_time?: string
          call_duration?: number
          call_status?: string
          transcription?: Json | null
          call_outcome?: string | null
          outcome_confidence?: number | null
          outcome_reasoning?: string | null
          outcome_key_points?: Json | null
          outcome_sentiment?: string | null
          follow_up_required?: boolean | null
          follow_up_notes?: string | null
          call_summary?: string | null
          success_evaluation?: string | null
          structured_data?: Json | null
          call_sid?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          id: string
          message_sid: string
          conversation_id: string | null
          user_id: string | null
          to_number: string
          from_number: string
          body: string
          direction: string
          status: string
          error_code: string | null
          error_message: string | null
          num_segments: string | null
          price: string | null
          price_unit: string | null
          date_created: string
          date_sent: string | null
          date_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          message_sid: string
          conversation_id?: string | null
          user_id?: string | null
          to_number: string
          from_number: string
          body: string
          direction: string
          status: string
          error_code?: string | null
          error_message?: string | null
          num_segments?: string | null
          price?: string | null
          price_unit?: string | null
          date_created: string
          date_sent?: string | null
          date_updated: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message_sid?: string
          conversation_id?: string | null
          user_id?: string | null
          to_number?: string
          from_number?: string
          body?: string
          direction?: string
          status?: string
          error_code?: string | null
          error_message?: string | null
          num_segments?: string | null
          price?: string | null
          price_unit?: string | null
          date_created?: string
          date_sent?: string | null
          date_updated?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      audio_recording_format: "wav;l16" | "mp3" | "ogg"
      field_permission: "visible" | "hidden" | "readonly"
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
      audio_recording_format: ["wav;l16", "mp3", "ogg"],
      field_permission: ["visible", "hidden", "readonly"],
    },
  },
} as const
