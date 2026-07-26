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
          correct_count: number
          id: string
          quiz_id: string | null
          score: number
          student_id: string
          subject: string
          subtopic_breakdown: Json
          taken_at: string
          total_count: number
        }
        Insert: {
          correct_count?: number
          id?: string
          quiz_id?: string | null
          score?: number
          student_id: string
          subject: string
          subtopic_breakdown?: Json
          taken_at?: string
          total_count?: number
        }
        Update: {
          correct_count?: number
          id?: string
          quiz_id?: string | null
          score?: number
          student_id?: string
          subject?: string
          subtopic_breakdown?: Json
          taken_at?: string
          total_count?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_plan: "free" | "pro" | "admin"
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
      user_plan: ["free", "pro", "admin"],
      user_role: ["teacher", "student"],
    },
  },
} as const
