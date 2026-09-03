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
      attendance: {
        Row: {
          created_at: string
          half_day: boolean
          id: string
          late_minutes: number
          login_time: string | null
          logout_time: string | null
          note: string | null
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
          working_minutes: number
        }
        Insert: {
          created_at?: string
          half_day?: boolean
          id?: string
          late_minutes?: number
          login_time?: string | null
          logout_time?: string | null
          note?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date: string
          working_minutes?: number
        }
        Update: {
          created_at?: string
          half_day?: boolean
          id?: string
          late_minutes?: number
          login_time?: string | null
          logout_time?: string | null
          note?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date?: string
          working_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          login_time: string
          logout_time: string | null
          staff_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          login_time?: string
          logout_time?: string | null
          staff_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          login_time?: string
          logout_time?: string | null
          staff_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_timing_overrides: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          from_date: string
          id: string
          login_time: string
          logout_time: string
          note: string | null
          staff_id: string | null
          to_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_date: string
          id?: string
          login_time: string
          logout_time: string
          note?: string | null
          staff_id?: string | null
          to_date: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          from_date?: string
          id?: string
          login_time?: string
          logout_time?: string
          note?: string | null
          staff_id?: string | null
          to_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_timing_overrides_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      exceptions: {
        Row: {
          approved_by: string | null
          created_at: string
          exception_type: string
          id: string
          month: string
          reason: string | null
          staff_id: string
          waived_amount: number
          waived_days: number
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          exception_type?: string
          id?: string
          month: string
          reason?: string | null
          staff_id: string
          waived_amount?: number
          waived_days?: number
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          exception_type?: string
          id?: string
          month?: string
          reason?: string | null
          staff_id?: string
          waived_amount?: number
          waived_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incentives: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          month: string
          reason: string | null
          staff_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          reason?: string | null
          staff_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          reason?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentives_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          approval_status: string
          created_at: string
          id: string
          leave_date: string
          leave_days: number
          leave_type: string
          reason: string | null
          staff_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          id?: string
          leave_date: string
          leave_days?: number
          leave_type?: string
          reason?: string | null
          staff_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          id?: string
          leave_date?: string
          leave_days?: number
          leave_type?: string
          reason?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          branch: string
          created_at: string
          department: string
          designation: string
          email: string | null
          id: string
          joining_date: string
          mobile: string | null
          name: string
          official_end_time: string | null
          official_start_time: string | null
          shift: string
          staff_code: string
          updated_at: string
          user_id: string
          work_type: string
        }
        Insert: {
          active?: boolean
          branch?: string
          created_at?: string
          department?: string
          designation?: string
          email?: string | null
          id: string
          joining_date?: string
          mobile?: string | null
          name: string
          official_end_time?: string | null
          official_start_time?: string | null
          shift?: string
          staff_code: string
          updated_at?: string
          user_id: string
          work_type?: string
        }
        Update: {
          active?: boolean
          branch?: string
          created_at?: string
          department?: string
          designation?: string
          email?: string | null
          id?: string
          joining_date?: string
          mobile?: string | null
          name?: string
          official_end_time?: string | null
          official_start_time?: string | null
          shift?: string
          staff_code?: string
          updated_at?: string
          user_id?: string
          work_type?: string
        }
        Relationships: []
      }
      salary_history: {
        Row: {
          created_at: string
          created_by: string | null
          effective_month: string
          id: string
          monthly_salary: number
          note: string | null
          staff_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_month: string
          id?: string
          monthly_salary?: number
          note?: string | null
          staff_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_month?: string
          id?: string
          monthly_salary?: number
          note?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          calculated_at: string
          daily_salary: number
          deductible_leave: number
          final_salary: number
          id: string
          incentive: number
          month: string
          monthly_salary: number
          paid_leave: number
          salary_days: number
          salary_deduction: number
          staff_id: string
          total_leave: number
          waived_leave: number
        }
        Insert: {
          calculated_at?: string
          daily_salary?: number
          deductible_leave?: number
          final_salary?: number
          id?: string
          incentive?: number
          month: string
          monthly_salary?: number
          paid_leave?: number
          salary_days?: number
          salary_deduction?: number
          staff_id: string
          total_leave?: number
          waived_leave?: number
        }
        Update: {
          calculated_at?: string
          daily_salary?: number
          deductible_leave?: number
          final_salary?: number
          id?: string
          incentive?: number
          month?: string
          monthly_salary?: number
          paid_leave?: number
          salary_days?: number
          salary_deduction?: number
          staff_id?: string
          total_leave?: number
          waived_leave?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_settings: {
        Row: {
          cycle_days: number
          full_day_minutes: number
          half_day_leave_value: number
          id: number
          late_grace_minutes: number
          office_start_time: string
          paid_leave_days: number
          updated_at: string
        }
        Insert: {
          cycle_days?: number
          full_day_minutes?: number
          half_day_leave_value?: number
          id?: number
          late_grace_minutes?: number
          office_start_time?: string
          paid_leave_days?: number
          updated_at?: string
        }
        Update: {
          cycle_days?: number
          full_day_minutes?: number
          half_day_leave_value?: number
          id?: number
          late_grace_minutes?: number
          office_start_time?: string
          paid_leave_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_salary: {
        Row: {
          monthly_salary: number
          staff_id: string
          updated_at: string
        }
        Insert: {
          monthly_salary?: number
          staff_id: string
          updated_at?: string
        }
        Update: {
          monthly_salary?: number
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_salary_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "staff" | "admin" | "super_admin"
      attendance_status:
        | "present"
        | "half_day"
        | "leave"
        | "absent"
        | "permission"
        | "holiday"
        | "week_off"
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
    Enums: {
      app_role: ["staff", "admin", "super_admin"],
      attendance_status: [
        "present",
        "half_day",
        "leave",
        "absent",
        "permission",
        "holiday",
        "week_off",
      ],
    },
  },
} as const
