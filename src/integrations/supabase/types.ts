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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          persona: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          persona?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          persona?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      class_timetables: {
        Row: {
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          period: string
          start_time: string
          subject: string
          teacher_id: string
          teacher_name: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          period: string
          start_time: string
          subject: string
          teacher_id: string
          teacher_name?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          period?: string
          start_time?: string
          subject?: string
          teacher_id?: string
          teacher_name?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_timetables_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      content_shares: {
        Row: {
          content_id: string
          content_type: string
          id: string
          shared_at: string
          shared_by: string
          team_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          id?: string
          shared_at?: string
          shared_by: string
          team_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          id?: string
          shared_at?: string
          shared_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_shares_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string
          engagement_score: number
          expression_distribution: Json
          id: string
          max_students: number
          session_date: string
          started_at: string
          students_present: number
          subject: string
          teacher_id: string
          team_id: string
          timeline: Json
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          ended_at: string
          engagement_score?: number
          expression_distribution?: Json
          id?: string
          max_students?: number
          session_date?: string
          started_at: string
          students_present?: number
          subject?: string
          teacher_id: string
          team_id: string
          timeline?: Json
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string
          engagement_score?: number
          expression_distribution?: Json
          id?: string
          max_students?: number
          session_date?: string
          started_at?: string
          students_present?: number
          subject?: string
          teacher_id?: string
          team_id?: string
          timeline?: Json
        }
        Relationships: [
          {
            foreignKeyName: "engagement_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          student_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          student_id: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          student_id?: string
          title?: string
        }
        Relationships: []
      }
      notification_state: {
        Row: {
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          calendar_notes: Json
          created_at: string
          email: string | null
          id: string
          plan: Database["public"]["Enums"]["user_plan"]
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          username: string | null
        }
        Insert: {
          calendar_notes?: Json
          created_at?: string
          email?: string | null
          id: string
          plan?: Database["public"]["Enums"]["user_plan"]
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          calendar_notes?: Json
          created_at?: string
          email?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answer_detail: Json
          completion_rate: number
          correct_count: number
          duration_seconds: number
          guest_name: string | null
          id: string
          quiz_id: string | null
          score: number
          student_id: string | null
          subject: string
          subtopic_breakdown: Json
          taken_at: string
          total_count: number
          written_answers: Json
        }
        Insert: {
          answer_detail?: Json
          completion_rate?: number
          correct_count?: number
          duration_seconds?: number
          guest_name?: string | null
          id?: string
          quiz_id?: string | null
          score?: number
          student_id?: string | null
          subject: string
          subtopic_breakdown?: Json
          taken_at?: string
          total_count?: number
          written_answers?: Json
        }
        Update: {
          answer_detail?: Json
          completion_rate?: number
          correct_count?: number
          duration_seconds?: number
          guest_name?: string | null
          id?: string
          quiz_id?: string | null
          score?: number
          student_id?: string | null
          subject?: string
          subtopic_breakdown?: Json
          taken_at?: string
          total_count?: number
          written_answers?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          class_level: string | null
          created_at: string
          difficulty: string | null
          id: string
          language: string | null
          questions: Json
          subject: string
          teacher_id: string
          title: string
        }
        Insert: {
          class_level?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          language?: string | null
          questions?: Json
          subject: string
          teacher_id: string
          title: string
        }
        Update: {
          class_level?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          language?: string | null
          questions?: Json
          subject?: string
          teacher_id?: string
          title?: string
        }
        Relationships: []
      }
      saved_models: {
        Row: {
          created_at: string
          creator_name: string | null
          id: string
          license_type: string | null
          sketchfab_uid: string
          teacher_id: string
          thumbnail_url: string | null
          title: string
          topic_name: string
        }
        Insert: {
          created_at?: string
          creator_name?: string | null
          id?: string
          license_type?: string | null
          sketchfab_uid: string
          teacher_id: string
          thumbnail_url?: string | null
          title: string
          topic_name: string
        }
        Update: {
          created_at?: string
          creator_name?: string | null
          id?: string
          license_type?: string | null
          sketchfab_uid?: string
          teacher_id?: string
          thumbnail_url?: string | null
          title?: string
          topic_name?: string
        }
        Relationships: []
      }
      school_licenses: {
        Row: {
          active: boolean
          code: string
          created_at: string
          duration_months: number
          expires_at: string | null
          id: string
          label: string | null
          max_students: number
          max_teachers: number
          request_id: string | null
          revoked: boolean
          students_redeemed: number
          teachers_redeemed: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          label?: string | null
          max_students?: number
          max_teachers?: number
          request_id?: string | null
          revoked?: boolean
          students_redeemed?: number
          teachers_redeemed?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          label?: string | null
          max_students?: number
          max_teachers?: number
          request_id?: string | null
          revoked?: boolean
          students_redeemed?: number
          teachers_redeemed?: number
        }
        Relationships: []
      }
      school_requests: {
        Row: {
          contact_email: string
          contact_person: string
          contact_phone: string | null
          created_at: string
          decision_note: string | null
          duration_months: number
          estimated_students: number | null
          estimated_teachers: number | null
          id: string
          license_id: string | null
          notes: string | null
          school_name: string
          status: string
        }
        Insert: {
          contact_email: string
          contact_person: string
          contact_phone?: string | null
          created_at?: string
          decision_note?: string | null
          duration_months?: number
          estimated_students?: number | null
          estimated_teachers?: number | null
          id?: string
          license_id?: string | null
          notes?: string | null
          school_name: string
          status?: string
        }
        Update: {
          contact_email?: string
          contact_person?: string
          contact_phone?: string | null
          created_at?: string
          decision_note?: string | null
          duration_months?: number
          estimated_students?: number | null
          estimated_teachers?: number | null
          id?: string
          license_id?: string | null
          notes?: string | null
          school_name?: string
          status?: string
        }
        Relationships: []
      }
      struggling_topics: {
        Row: {
          avg_score: number
          created_at: string
          id: string
          status: string
          subject: string
          subtopic: string
          teacher_id: string
        }
        Insert: {
          avg_score?: number
          created_at?: string
          id?: string
          status?: string
          subject: string
          subtopic: string
          teacher_id: string
        }
        Update: {
          avg_score?: number
          created_at?: string
          id?: string
          status?: string
          subject?: string
          subtopic?: string
          teacher_id?: string
        }
        Relationships: []
      }
      teacher_content: {
        Row: {
          class_level: string | null
          content_markdown: string
          created_at: string
          id: string
          kind: string
          language: string | null
          teacher_id: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          class_level?: string | null
          content_markdown: string
          created_at?: string
          id?: string
          kind: string
          language?: string | null
          teacher_id: string
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          class_level?: string | null
          content_markdown?: string
          created_at?: string
          id?: string
          kind?: string
          language?: string | null
          teacher_id?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          student_id: string
          team_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          student_id: string
          team_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          student_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          join_code: string
          name: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          join_code: string
          name: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          teacher_id?: string
        }
        Relationships: []
      }
      usage_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          role: string | null
          route: string
          started_at: string
          tool: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          role?: string | null
          route: string
          started_at?: string
          tool?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          role?: string | null
          route?: string
          started_at?: string
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      content_shared_with_user: {
        Args: { _content_id: string; _user_id: string }
        Returns: boolean
      }
      get_public_quiz: { Args: { _quiz_id: string }; Returns: Json }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      join_team_by_code: { Args: { _code: string }; Returns: Json }
      redeem_school_code: { Args: { _code: string }; Returns: Json }
      shares_team_with: {
        Args: { _teacher_id: string; _user_id: string }
        Returns: boolean
      }
      submit_public_quiz_attempt: {
        Args: {
          _guest_name: string
          _mcq_answers: Json
          _quiz_id: string
          _written_answers?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      user_plan: "free" | "pro" | "school-pro"
      user_role: "teacher" | "student"
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
      user_plan: ["free", "pro", "school-pro"],
      user_role: ["teacher", "student"],
    },
  },
} as const
