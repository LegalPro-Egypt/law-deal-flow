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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anonymous_qa_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string
          first_message_preview: string | null
          id: string
          language: string
          last_activity: string | null
          session_id: string
          status: string
          total_messages: number | null
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          first_message_preview?: string | null
          id?: string
          language?: string
          last_activity?: string | null
          session_id: string
          status?: string
          total_messages?: number | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          first_message_preview?: string | null
          id?: string
          language?: string
          last_activity?: string | null
          session_id?: string
          status?: string
          total_messages?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_qa_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_analysis: {
        Row: {
          analysis_data: Json
          analysis_type: string
          case_id: string
          created_at: string
          generated_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          analysis_data: Json
          analysis_type?: string
          case_id: string
          created_at?: string
          generated_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_data?: Json
          analysis_type?: string
          case_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_categories: {
        Row: {
          applicable_laws: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          name_de: string | null
          parent_id: string | null
          required_documents: string[] | null
          typical_timeline: string | null
          urgency_indicators: string[] | null
        }
        Insert: {
          applicable_laws?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          name_de?: string | null
          parent_id?: string | null
          required_documents?: string[] | null
          typical_timeline?: string | null
          urgency_indicators?: string[] | null
        }
        Update: {
          applicable_laws?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          name_de?: string | null
          parent_id?: string | null
          required_documents?: string[] | null
          typical_timeline?: string | null
          urgency_indicators?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "case_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "case_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      case_messages: {
        Row: {
          case_id: string
          content: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          role: string
          updated_at: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          role: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          ai_summary: string | null
          applicable_laws: string[] | null
          assigned_admin_id: string | null
          assigned_lawyer_id: string | null
          case_complexity_score: number | null
          case_number: string
          category: string
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          client_responses_summary: Json | null
          consultation_fee: number | null
          created_at: string
          description: string | null
          draft_data: Json | null
          extracted_entities: Json | null
          id: string
          jurisdiction: string
          language: string
          legal_analysis: Json | null
          remaining_fee: number | null
          status: string
          step: number | null
          subcategory: string | null
          title: string
          total_fee: number | null
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          applicable_laws?: string[] | null
          assigned_admin_id?: string | null
          assigned_lawyer_id?: string | null
          case_complexity_score?: number | null
          case_number?: string
          category: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_responses_summary?: Json | null
          consultation_fee?: number | null
          created_at?: string
          description?: string | null
          draft_data?: Json | null
          extracted_entities?: Json | null
          id?: string
          jurisdiction?: string
          language?: string
          legal_analysis?: Json | null
          remaining_fee?: number | null
          status?: string
          step?: number | null
          subcategory?: string | null
          title: string
          total_fee?: number | null
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          applicable_laws?: string[] | null
          assigned_admin_id?: string | null
          assigned_lawyer_id?: string | null
          case_complexity_score?: number | null
          case_number?: string
          category?: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_responses_summary?: Json | null
          consultation_fee?: number | null
          created_at?: string
          description?: string | null
          draft_data?: Json | null
          extracted_entities?: Json | null
          id?: string
          jurisdiction?: string
          language?: string
          legal_analysis?: Json | null
          remaining_fee?: number | null
          status?: string
          step?: number | null
          subcategory?: string | null
          title?: string
          total_fee?: number | null
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          language: string
          lawyer_id: string | null
          metadata: Json | null
          mode: string
          session_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          language?: string
          lawyer_id?: string | null
          metadata?: Json | null
          mode?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          language?: string
          lawyer_id?: string | null
          metadata?: Json | null
          mode?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string
          conversation_id: string | null
          created_at: string
          document_category: string | null
          extracted_data: Json | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_required: boolean | null
          ocr_text: string | null
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          conversation_id?: string | null
          created_at?: string
          document_category?: string | null
          extracted_data?: Json | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          is_required?: boolean | null
          ocr_text?: string | null
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          conversation_id?: string | null
          created_at?: string
          document_category?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_required?: boolean | null
          ocr_text?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lawyer_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          law_firm: string | null
          message: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specializations: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          law_firm?: string | null
          message?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specializations?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          law_firm?: string | null
          message?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specializations?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_knowledge: {
        Row: {
          article_number: string | null
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          keywords: string[] | null
          language: string
          law_reference: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          article_number?: string | null
          category: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          language?: string
          law_reference?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          article_number?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          language?: string
          law_reference?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bar_admissions: string[] | null
          bio: string | null
          birth_date: string | null
          consultation_methods: string[] | null
          created_at: string
          credentials_documents: string[] | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          jurisdictions: string[] | null
          languages: string[] | null
          last_name: string | null
          law_firm: string | null
          lawyer_card_back_url: string | null
          lawyer_card_front_url: string | null
          lawyer_card_url: string | null
          license_number: string | null
          notable_achievements: string | null
          office_address: string | null
          office_phone: string | null
          payment_structures: string[] | null
          phone: string | null
          preferred_language: string | null
          pricing_structure: Json | null
          private_phone: string | null
          professional_memberships: string[] | null
          profile_picture_url: string | null
          role: string
          specializations: string[] | null
          team_breakdown: Json | null
          team_size: number | null
          updated_at: string
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_experience: number | null
        }
        Insert: {
          bar_admissions?: string[] | null
          bio?: string | null
          birth_date?: string | null
          consultation_methods?: string[] | null
          created_at?: string
          credentials_documents?: string[] | null
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          jurisdictions?: string[] | null
          languages?: string[] | null
          last_name?: string | null
          law_firm?: string | null
          lawyer_card_back_url?: string | null
          lawyer_card_front_url?: string | null
          lawyer_card_url?: string | null
          license_number?: string | null
          notable_achievements?: string | null
          office_address?: string | null
          office_phone?: string | null
          payment_structures?: string[] | null
          phone?: string | null
          preferred_language?: string | null
          pricing_structure?: Json | null
          private_phone?: string | null
          professional_memberships?: string[] | null
          profile_picture_url?: string | null
          role?: string
          specializations?: string[] | null
          team_breakdown?: Json | null
          team_size?: number | null
          updated_at?: string
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_experience?: number | null
        }
        Update: {
          bar_admissions?: string[] | null
          bio?: string | null
          birth_date?: string | null
          consultation_methods?: string[] | null
          created_at?: string
          credentials_documents?: string[] | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          jurisdictions?: string[] | null
          languages?: string[] | null
          last_name?: string | null
          law_firm?: string | null
          lawyer_card_back_url?: string | null
          lawyer_card_front_url?: string | null
          lawyer_card_url?: string | null
          license_number?: string | null
          notable_achievements?: string | null
          office_address?: string | null
          office_phone?: string | null
          payment_structures?: string[] | null
          phone?: string | null
          preferred_language?: string | null
          pricing_structure?: Json | null
          private_phone?: string | null
          professional_memberships?: string[] | null
          profile_picture_url?: string | null
          role?: string
          specializations?: string[] | null
          team_breakdown?: Json | null
          team_size?: number | null
          updated_at?: string
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_admin_duplicate_cases: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_duplicate_draft_cases: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_anonymous_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_admin_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_original_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
      migrate_anonymous_conversation: {
        Args: { conversation_session_id: string; new_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      verification_status: "pending_basic" | "pending_complete" | "verified"
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
      verification_status: ["pending_basic", "pending_complete", "verified"],
    },
  },
} as const
