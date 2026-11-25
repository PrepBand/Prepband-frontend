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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      answer_keys: {
        Row: {
          accepted_aliases: Json | null
          correct_answers: Json
          created_at: string
          id: string
          question_id: string
          rationale: string | null
        }
        Insert: {
          accepted_aliases?: Json | null
          correct_answers: Json
          created_at?: string
          id?: string
          question_id: string
          rationale?: string | null
        }
        Update: {
          accepted_aliases?: Json | null
          correct_answers?: Json
          created_at?: string
          id?: string
          question_id?: string
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          assessment_status: string
          created_at: string
          estimated_band: number | null
          expires_at: string | null
          id: string
          max_score: number | null
          mode: string
          raw_score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          test_version_id: string
          updated_at: string
        }
        Insert: {
          assessment_status?: string
          created_at?: string
          estimated_band?: number | null
          expires_at?: string | null
          id?: string
          max_score?: number | null
          mode?: string
          raw_score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          test_version_id: string
          updated_at?: string
        }
        Update: {
          assessment_status?: string
          created_at?: string
          estimated_band?: number | null
          expires_at?: string | null
          id?: string
          max_score?: number | null
          mode?: string
          raw_score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          test_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_test_version_id_fkey"
            columns: ["test_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          code: string
          created_at: string
          id: string
          issued_at: string
          mock_attempt_id: string
          public_verification: boolean
          revoked_at: string | null
          revoked_reason: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          issued_at?: string
          mock_attempt_id: string
          public_verification?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          issued_at?: string
          mock_attempt_id?: string
          public_verification?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_mock_attempt_id_fkey"
            columns: ["mock_attempt_id"]
            isOneToOne: true
            referencedRelation: "mock_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          attribution: string | null
          content_type: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          license: string | null
          public_url: string | null
          section_id: string | null
          size_bytes: number | null
          storage_key: string
          storage_provider: string
          transcript: string | null
          type: string
        }
        Insert: {
          attribution?: string | null
          content_type?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          license?: string | null
          public_url?: string | null
          section_id?: string | null
          size_bytes?: number | null
          storage_key: string
          storage_provider?: string
          transcript?: string | null
          type: string
        }
        Update: {
          attribution?: string | null
          content_type?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          license?: string | null
          public_url?: string | null
          section_id?: string | null
          size_bytes?: number | null
          storage_key?: string
          storage_provider?: string
          transcript?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          listening_attempt_id: string | null
          listening_version_id: string
          reading_attempt_id: string | null
          reading_version_id: string
          speaking_attempt_id: string | null
          speaking_version_id: string
          started_at: string
          status: string
          student_id: string
          track: string
          updated_at: string
          writing_attempt_id: string | null
          writing_version_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          listening_attempt_id?: string | null
          listening_version_id: string
          reading_attempt_id?: string | null
          reading_version_id: string
          speaking_attempt_id?: string | null
          speaking_version_id: string
          started_at?: string
          status?: string
          student_id: string
          track: string
          updated_at?: string
          writing_attempt_id?: string | null
          writing_version_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          listening_attempt_id?: string | null
          listening_version_id?: string
          reading_attempt_id?: string | null
          reading_version_id?: string
          speaking_attempt_id?: string | null
          speaking_version_id?: string
          started_at?: string
          status?: string
          student_id?: string
          track?: string
          updated_at?: string
          writing_attempt_id?: string | null
          writing_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_attempts_listening_attempt_id_fkey"
            columns: ["listening_attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_listening_version_id_fkey"
            columns: ["listening_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_reading_attempt_id_fkey"
            columns: ["reading_attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_reading_version_id_fkey"
            columns: ["reading_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_speaking_attempt_id_fkey"
            columns: ["speaking_attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_speaking_version_id_fkey"
            columns: ["speaking_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_writing_attempt_id_fkey"
            columns: ["writing_attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_attempts_writing_version_id_fkey"
            columns: ["writing_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          attribution: string | null
          body: string
          created_at: string
          id: string
          license: string | null
          section_id: string
          source: string | null
          title: string | null
        }
        Insert: {
          attribution?: string | null
          body: string
          created_at?: string
          id?: string
          license?: string | null
          section_id: string
          source?: string | null
          title?: string | null
        }
        Update: {
          attribution?: string | null
          body?: string
          created_at?: string
          id?: string
          license?: string | null
          section_id?: string
          source?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passages_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_about: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string
          country: string
          created_at: string
          first_name: string
          gender: string
          last_name: string
          phone_country_code: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city: string
          country: string
          created_at?: string
          first_name: string
          gender: string
          last_name: string
          phone_country_code?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string
          country?: string
          created_at?: string
          first_name?: string
          gender?: string
          last_name?: string
          phone_country_code?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_study_goals: {
        Row: {
          created_at: string
          exam_date: string | null
          ielts_type: string
          preparation_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          ielts_type: string
          preparation_level: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          ielts_type?: string
          preparation_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_target_scores: {
        Row: {
          created_at: string
          listening: number | null
          overall: number | null
          reading: number | null
          speaking: number | null
          updated_at: string
          user_id: string
          writing: number | null
        }
        Insert: {
          created_at?: string
          listening?: number | null
          overall?: number | null
          reading?: number | null
          speaking?: number | null
          updated_at?: string
          user_id: string
          writing?: number | null
        }
        Update: {
          created_at?: string
          listening?: number | null
          overall?: number | null
          reading?: number | null
          speaking?: number | null
          updated_at?: string
          user_id?: string
          writing?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_initials: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          email_confirmed_at: string | null
          exam_date: string | null
          id: string
          onboarding_completed: boolean
          target_band: number | null
          timezone: string | null
          track: string | null
          updated_at: string
        }
        Insert: {
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          email_confirmed_at?: string | null
          exam_date?: string | null
          id: string
          onboarding_completed?: boolean
          target_band?: number | null
          timezone?: string | null
          track?: string | null
          updated_at?: string
        }
        Update: {
          avatar_initials?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          email_confirmed_at?: string | null
          exam_date?: string | null
          id?: string
          onboarding_completed?: boolean
          target_band?: number | null
          timezone?: string | null
          track?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          marks: number
          options: Json | null
          prompt: string
          section_id: string
          type: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          marks?: number
          options?: Json | null
          prompt: string
          section_id: string
          type: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          marks?: number
          options?: Json | null
          prompt?: string
          section_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          attempt_id: string
          id: string
          question_id: string
          response: Json
          saved_at: string
          version: number
        }
        Insert: {
          attempt_id: string
          id?: string
          question_id: string
          response: Json
          saved_at?: string
          version?: number
        }
        Update: {
          attempt_id?: string
          id?: string
          question_id?: string
          response?: Json
          saved_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          module: string
          order_index: number
          test_version_id: string
          timing_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          module: string
          order_index: number
          test_version_id: string
          timing_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          module?: string
          order_index?: number
          test_version_id?: string
          timing_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_test_version_id_fkey"
            columns: ["test_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      self_reviews: {
        Row: {
          attempt_id: string
          checklist: Json
          notes: string | null
          ratings: Json
          updated_at: string
        }
        Insert: {
          attempt_id: string
          checklist?: Json
          notes?: string | null
          ratings?: Json
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          checklist?: Json
          notes?: string | null
          ratings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_reviews_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_prompts: {
        Row: {
          bullets: Json | null
          created_at: string
          display_order: number
          id: string
          part: number
          prep_seconds: number | null
          prompt: string
          section_id: string
          speak_seconds: number | null
        }
        Insert: {
          bullets?: Json | null
          created_at?: string
          display_order: number
          id?: string
          part: number
          prep_seconds?: number | null
          prompt: string
          section_id: string
          speak_seconds?: number | null
        }
        Update: {
          bullets?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          part?: number
          prep_seconds?: number | null
          prompt?: string
          section_id?: string
          speak_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speaking_prompts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_responses: {
        Row: {
          attempt_id: string
          completed: boolean
          duration_seconds: number | null
          id: string
          response_mode: string
          saved_at: string
          speaking_prompt_id: string
          text_response: string | null
          version: number
        }
        Insert: {
          attempt_id: string
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          response_mode: string
          saved_at?: string
          speaking_prompt_id: string
          text_response?: string | null
          version?: number
        }
        Update: {
          attempt_id?: string
          completed?: boolean
          duration_seconds?: number | null
          id?: string
          response_mode?: string
          saved_at?: string
          speaking_prompt_id?: string
          text_response?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "speaking_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaking_responses_speaking_prompt_id_fkey"
            columns: ["speaking_prompt_id"]
            isOneToOne: false
            referencedRelation: "speaking_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      test_versions: {
        Row: {
          created_at: string
          id: string
          published_at: string | null
          status: string
          test_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          published_at?: string | null
          status?: string
          test_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          published_at?: string | null
          status?: string
          test_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_versions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          kind: string
          module: string
          status: string
          title: string
          track: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: string
          module: string
          status?: string
          title: string
          track: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: string
          module?: string
          status?: string
          title?: string
          track?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_prompts: {
        Row: {
          created_at: string
          display_order: number
          examiner_notes: string | null
          id: string
          instructions: string | null
          letter_format: boolean
          min_words: number
          prompt: string
          recommended_minutes: number | null
          section_id: string
          task_number: number
          visual: Json | null
        }
        Insert: {
          created_at?: string
          display_order: number
          examiner_notes?: string | null
          id?: string
          instructions?: string | null
          letter_format?: boolean
          min_words?: number
          prompt: string
          recommended_minutes?: number | null
          section_id: string
          task_number: number
          visual?: Json | null
        }
        Update: {
          created_at?: string
          display_order?: number
          examiner_notes?: string | null
          id?: string
          instructions?: string | null
          letter_format?: boolean
          min_words?: number
          prompt?: string
          recommended_minutes?: number | null
          section_id?: string
          task_number?: number
          visual?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "writing_prompts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_responses: {
        Row: {
          attempt_id: string
          body: string
          diagnostics: Json | null
          id: string
          saved_at: string
          version: number
          word_count: number
          writing_prompt_id: string
        }
        Insert: {
          attempt_id: string
          body?: string
          diagnostics?: Json | null
          id?: string
          saved_at?: string
          version?: number
          word_count?: number
          writing_prompt_id: string
        }
        Update: {
          attempt_id?: string
          body?: string
          diagnostics?: Json | null
          id?: string
          saved_at?: string
          version?: number
          word_count?: number
          writing_prompt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_responses_writing_prompt_id_fkey"
            columns: ["writing_prompt_id"]
            isOneToOne: false
            referencedRelation: "writing_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_email_registered: { Args: { p_email: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
