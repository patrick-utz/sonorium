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
      records: {
        Row: {
          album: string
          alternative_releases: Json | null
          artist: string
          artistic_assessment: string | null
          artistic_rating: number | null
          audiophile_assessment: string | null
          catalog_number: string | null
          cover_art: string | null
          created_at: string | null
          critic_reviews: Json | null
          critic_score: number | null
          date_added: string
          format: string
          format_details: string | null
          genre: string[]
          id: string
          is_favorite: boolean | null
          label: string | null
          mastering_quality: number | null
          moods: string[] | null
          my_rating: number | null
          personal_notes: string | null
          pressing: string | null
          purchase_location: string | null
          purchase_price: number | null
          recommendation_reason: string | null
          recommendations: Json | null
          recording_quality: number | null
          status: string
          streaming_links: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          vinyl_recommendation: string | null
          year: number
        }
        Insert: {
          album: string
          alternative_releases?: Json | null
          artist: string
          artistic_assessment?: string | null
          artistic_rating?: number | null
          audiophile_assessment?: string | null
          catalog_number?: string | null
          cover_art?: string | null
          created_at?: string | null
          critic_reviews?: Json | null
          critic_score?: number | null
          date_added?: string
          format?: string
          format_details?: string | null
          genre?: string[]
          id?: string
          is_favorite?: boolean | null
          label?: string | null
          mastering_quality?: number | null
          moods?: string[] | null
          my_rating?: number | null
          personal_notes?: string | null
          pressing?: string | null
          purchase_location?: string | null
          purchase_price?: number | null
          recommendation_reason?: string | null
          recommendations?: Json | null
          recording_quality?: number | null
          status?: string
          streaming_links?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          vinyl_recommendation?: string | null
          year: number
        }
        Update: {
          album?: string
          alternative_releases?: Json | null
          artist?: string
          artistic_assessment?: string | null
          artistic_rating?: number | null
          audiophile_assessment?: string | null
          catalog_number?: string | null
          cover_art?: string | null
          created_at?: string | null
          critic_reviews?: Json | null
          critic_score?: number | null
          date_added?: string
          format?: string
          format_details?: string | null
          genre?: string[]
          id?: string
          is_favorite?: boolean | null
          label?: string | null
          mastering_quality?: number | null
          moods?: string[] | null
          my_rating?: number | null
          personal_notes?: string | null
          pressing?: string | null
          purchase_location?: string | null
          purchase_price?: number | null
          recommendation_reason?: string | null
          recommendations?: Json | null
          recording_quality?: number | null
          status?: string
          streaming_links?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          vinyl_recommendation?: string | null
          year?: number
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
