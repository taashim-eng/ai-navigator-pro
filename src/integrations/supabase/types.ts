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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      recommendations: {
        Row: {
          created_at: string
          id: string
          rank: number
          reasoning: string | null
          score: number
          session_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rank: number
          reasoning?: string | null
          score: number
          session_id: string
          tool_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rank?: number
          reasoning?: string | null
          score?: number
          session_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_events: {
        Row: {
          answer_value: Json
          created_at: string
          id: string
          node_id: string
          question_id: string
          session_id: string
        }
        Insert: {
          answer_value: Json
          created_at?: string
          id?: string
          node_id: string
          question_id: string
          session_id: string
        }
        Update: {
          answer_value?: Json
          created_at?: string
          id?: string
          node_id?: string
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          anticipated_benefits: string[] | null
          completed_at: string | null
          created_at: string
          department: string | null
          email: string | null
          id: string
          intent_text: string | null
          job_function: string | null
          main_use_case: string | null
          manager_email: string | null
          snow_task_number: string | null
          snow_task_state: string | null
          snow_user_sys_id: string | null
          started_at: string
          user_id: string | null
        }
        Insert: {
          anticipated_benefits?: string[] | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          intent_text?: string | null
          job_function?: string | null
          main_use_case?: string | null
          manager_email?: string | null
          snow_task_number?: string | null
          snow_task_state?: string | null
          snow_user_sys_id?: string | null
          started_at?: string
          user_id?: string | null
        }
        Update: {
          anticipated_benefits?: string[] | null
          completed_at?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          intent_text?: string | null
          job_function?: string | null
          main_use_case?: string | null
          manager_email?: string | null
          snow_task_number?: string | null
          snow_task_state?: string | null
          snow_user_sys_id?: string | null
          started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      snow_tasks: {
        Row: {
          assigned_to_email: string | null
          assignment_group: string
          created_at: string
          description: string | null
          id: string
          payload: Json
          session_id: string
          short_description: string
          state: string
          sys_id: string
          task_number: string
        }
        Insert: {
          assigned_to_email?: string | null
          assignment_group?: string
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          session_id: string
          short_description: string
          state?: string
          sys_id: string
          task_number: string
        }
        Update: {
          assigned_to_email?: string | null
          assignment_group?: string
          created_at?: string
          description?: string | null
          id?: string
          payload?: Json
          session_id?: string
          short_description?: string
          state?: string
          sys_id?: string
          task_number?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          approved: boolean
          capabilities: string[]
          category: string
          compliance_notes: string | null
          cost_estimate: string | null
          created_at: string
          description: string | null
          id: string
          integrations: string[]
          licensing: string | null
          name: string
          personas: string[]
          risk_rating: string
          use_cases: string[]
        }
        Insert: {
          approved?: boolean
          capabilities?: string[]
          category: string
          compliance_notes?: string | null
          cost_estimate?: string | null
          created_at?: string
          description?: string | null
          id: string
          integrations?: string[]
          licensing?: string | null
          name: string
          personas?: string[]
          risk_rating?: string
          use_cases?: string[]
        }
        Update: {
          approved?: boolean
          capabilities?: string[]
          category?: string
          compliance_notes?: string | null
          cost_estimate?: string | null
          created_at?: string
          description?: string | null
          id?: string
          integrations?: string[]
          licensing?: string | null
          name?: string
          personas?: string[]
          risk_rating?: string
          use_cases?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
