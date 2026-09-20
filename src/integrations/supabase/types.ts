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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      itinerary_days: {
        Row: {
          activities: Json
          created_at: string
          day_date: string | null
          day_number: number
          est_cost_inr: number | null
          id: string
          summary: string | null
          title: string
          trip_id: string
        }
        Insert: {
          activities?: Json
          created_at?: string
          day_date?: string | null
          day_number: number
          est_cost_inr?: number | null
          id?: string
          summary?: string | null
          title: string
          trip_id: string
        }
        Update: {
          activities?: Json
          created_at?: string
          day_date?: string | null
          day_number?: number
          est_cost_inr?: number | null
          id?: string
          summary?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          home_city: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_city?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_city?: string | null
          id?: string
        }
        Relationships: []
      }
      stay_options: {
        Row: {
          area: string | null
          booking_url: string | null
          created_at: string
          highlights: string | null
          id: string
          kind: string
          name: string
          price_per_night_inr: number
          rating: number | null
          trip_id: string
        }
        Insert: {
          area?: string | null
          booking_url?: string | null
          created_at?: string
          highlights?: string | null
          id?: string
          kind: string
          name: string
          price_per_night_inr: number
          rating?: number | null
          trip_id: string
        }
        Update: {
          area?: string | null
          booking_url?: string | null
          created_at?: string
          highlights?: string | null
          id?: string
          kind?: string
          name?: string
          price_per_night_inr?: number
          rating?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stay_options_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_options: {
        Row: {
          arrive_at: string | null
          booking_url: string | null
          convenience_score: number | null
          created_at: string
          depart_at: string | null
          duration_minutes: number | null
          id: string
          mode: string
          notes: string | null
          price_inr: number
          provider: string
          trip_id: string
        }
        Insert: {
          arrive_at?: string | null
          booking_url?: string | null
          convenience_score?: number | null
          created_at?: string
          depart_at?: string | null
          duration_minutes?: number | null
          id?: string
          mode: string
          notes?: string | null
          price_inr: number
          provider: string
          trip_id: string
        }
        Update: {
          arrive_at?: string | null
          booking_url?: string | null
          convenience_score?: number | null
          created_at?: string
          depart_at?: string | null
          duration_minutes?: number | null
          id?: string
          mode?: string
          notes?: string | null
          price_inr?: number
          provider?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_options_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          created_at: string
          id: string
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_inr: number | null
          created_at: string
          destination: string
          end_date: string
          id: string
          interests: string | null
          invite_code: string
          notes: string | null
          origin_city: string
          owner_id: string
          pace: string
          plan_status: string
          start_date: string
          summary: string | null
          title: string
          travellers: number
          updated_at: string
        }
        Insert: {
          budget_inr?: number | null
          created_at?: string
          destination: string
          end_date: string
          id?: string
          interests?: string | null
          invite_code?: string
          notes?: string | null
          origin_city: string
          owner_id: string
          pace?: string
          plan_status?: string
          start_date: string
          summary?: string | null
          title: string
          travellers?: number
          updated_at?: string
        }
        Update: {
          budget_inr?: number | null
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          interests?: string | null
          invite_code?: string
          notes?: string | null
          origin_city?: string
          owner_id?: string
          pace?: string
          plan_status?: string
          start_date?: string
          summary?: string | null
          title?: string
          travellers?: number
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<TName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TName]["Row"]

export type TablesInsert<TName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TName]["Insert"]

export type TablesUpdate<TName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TName]["Update"]

export type Enums<TName extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][TName]
