// Tipos de la base de datos, mantenidos a mano en el mismo formato que genera
// `supabase gen types typescript`. Actualízalos junto con cada migración en
// supabase/migrations/ (o regenéralos con la CLI cuando alguien la tenga enlazada).
// Las columnas geography (PostGIS) se tipan como unknown.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type E = {
  userRole: "generador" | "valorizador" | "municipalidad" | "administrador";
  lotModality: "venta" | "trueque" | "donacion";
  lotStatus: "publicado" | "reservado" | "entregado" | "completado" | "cancelado";
  paymentMethod: "efectivo" | "transferencia" | "chivo_wallet";
  valorizadorTipo: "base" | "volumen";
  planTier: "gratis" | "trazabilidad";
};

export type Database = {
  public: {
    Tables: {
      app_migrations: {
        Row: { name: string; applied_at: string };
        Insert: { name: string; applied_at?: string };
        Update: { name?: string; applied_at?: string };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          description: string;
          min_value: number | null;
          max_value: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          description: string;
          min_value?: number | null;
          max_value?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string;
          min_value?: number | null;
          max_value?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      polymers: {
        // price_per_kg quedó sin usar: los precios de referencia viven en app_settings (USD por libra).
        Row: { code: string; resin_number: number; name: string; price_per_kg: number };
        Insert: { code: string; resin_number: number; name: string; price_per_kg: number };
        Update: { code?: string; resin_number?: number; name?: string; price_per_kg?: number };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: E["userRole"];
          display_name: string;
          org_type: string;
          municipality: string;
          zone: string;
          verified: boolean;
          created_at: string;
          tipo_valorizador: E["valorizadorTipo"] | null;
          slug: string | null;
        };
        Insert: {
          id: string;
          role: E["userRole"];
          display_name: string;
          org_type: string;
          municipality: string;
          zone: string;
          verified?: boolean;
          created_at?: string;
          tipo_valorizador?: E["valorizadorTipo"] | null;
          slug?: string | null;
        };
        Update: {
          id?: string;
          role?: E["userRole"];
          display_name?: string;
          org_type?: string;
          municipality?: string;
          zone?: string;
          verified?: boolean;
          created_at?: string;
          tipo_valorizador?: E["valorizadorTipo"] | null;
          slug?: string | null;
        };
        Relationships: [];
      };
      profile_private: {
        Row: { id: string; whatsapp: string | null; address: string | null; location: unknown };
        Insert: { id: string; whatsapp?: string | null; address?: string | null; location: unknown };
        Update: { id?: string; whatsapp?: string | null; address?: string | null; location?: unknown };
        Relationships: [
          {
            foreignKeyName: "profile_private_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lots: {
        Row: {
          id: string;
          generator_id: string;
          polymer_code: string;
          estimated_lb: number;
          photo_urls: string[];
          pickup_from: string;
          pickup_to: string;
          modality: E["lotModality"];
          price_per_lb: number;
          notes: string | null;
          status: E["lotStatus"];
          location: unknown;
          created_at: string;
          scheduled_pickup_id: string | null;
        };
        Insert: {
          id?: string;
          generator_id: string;
          polymer_code: string;
          estimated_lb: number;
          photo_urls?: string[];
          pickup_from: string;
          pickup_to: string;
          modality: E["lotModality"];
          price_per_lb?: number;
          notes?: string | null;
          status?: E["lotStatus"];
          location: unknown;
          created_at?: string;
          scheduled_pickup_id?: string | null;
        };
        Update: {
          id?: string;
          generator_id?: string;
          polymer_code?: string;
          estimated_lb?: number;
          photo_urls?: string[];
          pickup_from?: string;
          pickup_to?: string;
          modality?: E["lotModality"];
          price_per_lb?: number;
          notes?: string | null;
          status?: E["lotStatus"];
          location?: unknown;
          created_at?: string;
          scheduled_pickup_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lots_generator_id_fkey";
            columns: ["generator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lots_polymer_code_fkey";
            columns: ["polymer_code"];
            isOneToOne: false;
            referencedRelation: "polymers";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "lots_scheduled_pickup_id_fkey";
            columns: ["scheduled_pickup_id"];
            isOneToOne: false;
            referencedRelation: "scheduled_pickups";
            referencedColumns: ["id"];
          },
        ];
      };
      pickups: {
        Row: {
          id: string;
          lot_id: string;
          collector_id: string;
          reserved_at: string;
          delivered_at: string | null;
          completed_at: string | null;
          confirmed_lb: number | null;
          total_amount: number | null;
          payment_method: E["paymentMethod"] | null;
          voucher_code: string | null;
          proposed_lb: number | null;
          proposed_price_per_lb: number | null;
          proposed_at: string | null;
          final_price_per_lb: number | null;
          was_corrected: boolean;
        };
        Insert: {
          id?: string;
          lot_id: string;
          collector_id: string;
          reserved_at?: string;
          delivered_at?: string | null;
          completed_at?: string | null;
          confirmed_lb?: number | null;
          total_amount?: number | null;
          payment_method?: E["paymentMethod"] | null;
          voucher_code?: string | null;
          proposed_lb?: number | null;
          proposed_price_per_lb?: number | null;
          proposed_at?: string | null;
          final_price_per_lb?: number | null;
          was_corrected?: boolean;
        };
        Update: {
          id?: string;
          lot_id?: string;
          collector_id?: string;
          reserved_at?: string;
          delivered_at?: string | null;
          completed_at?: string | null;
          confirmed_lb?: number | null;
          total_amount?: number | null;
          payment_method?: E["paymentMethod"] | null;
          voucher_code?: string | null;
          proposed_lb?: number | null;
          proposed_price_per_lb?: number | null;
          proposed_at?: string | null;
          final_price_per_lb?: number | null;
          was_corrected?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "pickups_lot_id_fkey";
            columns: ["lot_id"];
            isOneToOne: true;
            referencedRelation: "lots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pickups_collector_id_fkey";
            columns: ["collector_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ratings: {
        Row: {
          id: string;
          pickup_id: string;
          rater_id: string;
          ratee_id: string;
          stars: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pickup_id: string;
          rater_id: string;
          ratee_id: string;
          stars: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pickup_id?: string;
          rater_id?: string;
          ratee_id?: string;
          stars?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_pickup_id_fkey";
            columns: ["pickup_id"];
            isOneToOne: false;
            referencedRelation: "pickups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_rater_id_fkey";
            columns: ["rater_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey";
            columns: ["ratee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      generator_plans: {
        Row: {
          profile_id: string;
          plan: E["planTier"];
          started_at: string | null;
          expires_at: string | null;
          requested_at: string | null;
          source: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          profile_id: string;
          plan?: E["planTier"];
          started_at?: string | null;
          expires_at?: string | null;
          requested_at?: string | null;
          source?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          profile_id?: string;
          plan?: E["planTier"];
          started_at?: string | null;
          expires_at?: string | null;
          requested_at?: string | null;
          source?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "generator_plans_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      commissions: {
        Row: {
          id: string;
          pickup_id: string;
          collector_id: string;
          gross_amount: number;
          pct: number;
          amount: number;
          status: "pendiente" | "cobrada";
          created_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          pickup_id: string;
          collector_id: string;
          gross_amount: number;
          pct: number;
          amount: number;
          status?: "pendiente" | "cobrada";
          created_at?: string;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          pickup_id?: string;
          collector_id?: string;
          gross_amount?: number;
          pct?: number;
          amount?: number;
          status?: "pendiente" | "cobrada";
          created_at?: string;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commissions_pickup_id_fkey";
            columns: ["pickup_id"];
            isOneToOne: true;
            referencedRelation: "pickups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commissions_collector_id_fkey";
            columns: ["collector_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      points_ledger: {
        Row: {
          id: string;
          profile_id: string;
          kind: "ganado" | "canje" | "ajuste";
          points: number;
          remaining: number | null;
          pickup_id: string | null;
          expires_at: string | null;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          kind: "ganado" | "canje" | "ajuste";
          points: number;
          remaining?: number | null;
          pickup_id?: string | null;
          expires_at?: string | null;
          note?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          kind?: "ganado" | "canje" | "ajuste";
          points?: number;
          remaining?: number | null;
          pickup_id?: string | null;
          expires_at?: string | null;
          note?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "points_ledger_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      alert_prefs: {
        Row: { profile_id: string; enabled: boolean; radius_km: number; polymers: string[] | null; updated_at: string };
        Insert: { profile_id: string; enabled?: boolean; radius_km?: number; polymers?: string[] | null; updated_at?: string };
        Update: { profile_id?: string; enabled?: boolean; radius_km?: number; polymers?: string[] | null; updated_at?: string };
        Relationships: [];
      };
      notification_queue: {
        Row: {
          id: string;
          profile_id: string;
          event: string;
          payload: Json;
          send_after: string;
          sent_at: string | null;
          attempts: number;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          event: string;
          payload?: Json;
          send_after?: string;
          sent_at?: string | null;
          attempts?: number;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          event?: string;
          payload?: Json;
          send_after?: string;
          sent_at?: string | null;
          attempts?: number;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pickup_releases: {
        Row: {
          id: string;
          lot_id: string;
          collector_id: string;
          reserved_at: string;
          released_at: string;
          reason: "generador" | "reciclador" | "automatica";
        };
        Insert: {
          id?: string;
          lot_id: string;
          collector_id: string;
          reserved_at: string;
          released_at?: string;
          reason: "generador" | "reciclador" | "automatica";
        };
        Update: {
          id?: string;
          lot_id?: string;
          collector_id?: string;
          reserved_at?: string;
          released_at?: string;
          reason?: "generador" | "reciclador" | "automatica";
        };
        Relationships: [];
      };
      scheduled_pickups: {
        Row: {
          id: string;
          generator_id: string;
          collector_id: string;
          polymer_code: string;
          estimated_lb: number;
          modality: E["lotModality"];
          weekday: number;
          start_time: string;
          end_time: string;
          notes: string | null;
          active: boolean;
          last_created_for: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          generator_id: string;
          collector_id: string;
          polymer_code: string;
          estimated_lb: number;
          modality: E["lotModality"];
          weekday: number;
          start_time: string;
          end_time: string;
          notes?: string | null;
          active?: boolean;
          last_created_for?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          generator_id?: string;
          collector_id?: string;
          polymer_code?: string;
          estimated_lb?: number;
          modality?: E["lotModality"];
          weekday?: number;
          start_time?: string;
          end_time?: string;
          notes?: string | null;
          active?: boolean;
          last_created_for?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_pickups_generator_id_fkey";
            columns: ["generator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_pickups_collector_id_fkey";
            columns: ["collector_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      profile_impact: {
        Row: {
          profile_id: string | null;
          role: E["userRole"] | null;
          display_name: string | null;
          org_type: string | null;
          municipality: string | null;
          verified: boolean | null;
          lots_published: number | null;
          completed_count: number | null;
          completed_lb: number | null;
          total_amount: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          reputation_tier: "nuevo" | "en_marcha" | "confiable" | "destacado" | null;
          reputation_score: number | null;
        };
        Relationships: [];
      };
      impact_monthly: {
        Row: {
          month: string | null;
          generator_id: string | null;
          municipality: string | null;
          polymer_code: string | null;
          completed_lb: number | null;
          total_amount: number | null;
          pickups_count: number | null;
        };
        Relationships: [];
      };
      impact_heat: {
        Row: {
          municipality: string | null;
          lat: number | null;
          lng: number | null;
          completed_lb: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      my_role: { Args: never; Returns: E["userRole"] };
      is_admin: { Args: never; Returns: boolean };
      setting_num: { Args: { p_key: string }; Returns: number };
      set_setting: { Args: { p_key: string; p_value: Json }; Returns: undefined };

      publish_lot: {
        Args: {
          p_polymer_code: string;
          p_estimated_lb: number;
          p_pickup_from: string;
          p_pickup_to: string;
          p_modality: E["lotModality"];
          p_photo_urls?: string[];
          p_notes?: string | null;
        };
        Returns: string;
      };
      repeat_lot: { Args: { p_lot_id: string }; Returns: string };
      nearby_lots: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m: number;
          p_polymers?: string[] | null;
        };
        Returns: {
          id: string;
          generator_id: string;
          generator_name: string;
          polymer_code: string;
          estimated_lb: number;
          price_per_lb: number;
          modality: E["lotModality"];
          pickup_from: string;
          pickup_to: string;
          photo_urls: string[];
          notes: string | null;
          lat: number;
          lng: number;
          distance_m: number;
        }[];
      };
      reserve_lot: { Args: { p_lot_id: string }; Returns: string };
      propose_delivery: {
        Args: { p_pickup_id: string; p_lb: number; p_price_per_lb?: number | null };
        Returns: undefined;
      };
      complete_pickup: {
        Args: {
          p_pickup_id: string;
          p_accept: boolean;
          p_confirmed_lb?: number | null;
          p_final_price_per_lb?: number | null;
          p_payment_method?: E["paymentMethod"];
        };
        Returns: string;
      };
      release_reservation: { Args: { p_pickup_id: string }; Returns: undefined };
      release_expired_reservations: { Args: never; Returns: number };
      rate_pickup: {
        Args: { p_pickup_id: string; p_stars: number; p_comment?: string | null };
        Returns: undefined;
      };
      get_voucher: {
        Args: { p_code: string };
        Returns: {
          code: string;
          completed_at: string;
          generator_name: string;
          generator_org_type: string;
          municipality: string;
          collector_name: string;
          collector_org_type: string;
          polymer_code: string;
          polymer_name: string;
          resin_number: number;
          confirmed_lb: number;
          modality: E["lotModality"];
          price_per_lb: number;
          total_amount: number;
        }[];
      };

      has_active_plan: { Args: { p_profile: string }; Returns: boolean };
      plan_status: {
        Args: never;
        Returns: {
          plan: "gratis" | "trazabilidad";
          active: boolean;
          started_at: string | null;
          expires_at: string | null;
          requested_at: string | null;
          published_this_month: number;
          free_limit: number | null;
        }[];
      };
      request_plan: { Args: never; Returns: undefined };
      set_generator_plan: {
        Args: { p_profile_id: string; p_plan: E["planTier"]; p_expires_at?: string | null };
        Returns: undefined;
      };
      set_valorizador_tipo: {
        Args: { p_profile_id: string; p_tipo: E["valorizadorTipo"] };
        Returns: undefined;
      };
      commission_summary: {
        Args: { p_month?: string | null };
        Returns: {
          collector_id: string;
          collector_name: string;
          deliveries: number;
          gross_amount: number;
          commission_amount: number;
          pending_amount: number;
          paid_amount: number;
        }[];
      };
      commission_pickup_facts: {
        Args: { p_pickup_ids: string[] };
        Returns: {
          pickup_id: string;
          confirmed_lb: number | null;
          completed_at: string | null;
          voucher_code: string | null;
          polymer_code: string;
        }[];
      };
      set_commission_status: {
        Args: { p_commission_id: string; p_status: "pendiente" | "cobrada" };
        Returns: undefined;
      };

      points_balance: { Args: { p_profile?: string | null }; Returns: number };
      redeem_points: {
        Args: { p_profile_id: string; p_points: number; p_note?: string | null };
        Returns: undefined;
      };

      save_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_user_agent?: string | null };
        Returns: undefined;
      };
      remove_push_subscription: { Args: { p_endpoint: string }; Returns: undefined };
      set_alert_prefs: {
        Args: { p_radius_km: number; p_polymers: string[] | null; p_enabled?: boolean };
        Returns: undefined;
      };
      claim_due_notifications: {
        Args: { p_limit?: number };
        Returns: { id: string; profile_id: string; event: string; payload: Json; attempts: number }[];
      };
      finish_notification: { Args: { p_id: string; p_error?: string | null }; Returns: undefined };

      save_scheduled_pickup: {
        Args: {
          p_collector_id: string;
          p_polymer_code: string;
          p_estimated_lb: number;
          p_modality: E["lotModality"];
          p_weekday: number;
          p_start_time: string;
          p_end_time: string;
          p_notes?: string | null;
          p_id?: string | null;
        };
        Returns: string;
      };
      set_scheduled_active: { Args: { p_id: string; p_active: boolean }; Returns: undefined };
      delete_scheduled_pickup: { Args: { p_id: string }; Returns: undefined };
      create_scheduled_lots: { Args: never; Returns: number };

      get_circular: {
        Args: { p_slug: string };
        Returns: {
          business_name: string;
          org_type: string;
          total_lb: number;
          co2_kg: number;
          deliveries: number;
          last_delivery_at: string;
        }[];
      };
      generator_history: {
        Args: { p_from?: string | null; p_to?: string | null };
        Returns: {
          lot_id: string;
          pickup_id: string | null;
          polymer_code: string;
          modality: E["lotModality"];
          status: E["lotStatus"];
          estimated_lb: number;
          confirmed_lb: number | null;
          total_amount: number | null;
          created_at: string;
          completed_at: string | null;
          collector_name: string | null;
          voucher_code: string | null;
        }[];
      };
      monthly_report: {
        Args: { p_month?: string | null };
        Returns: {
          voucher_code: string;
          completed_at: string;
          collector_name: string;
          polymer_code: string;
          modality: E["lotModality"];
          confirmed_lb: number;
          total_amount: number;
        }[];
      };
    };
    Enums: {
      user_role: E["userRole"];
      lot_modality: E["lotModality"];
      lot_status: E["lotStatus"];
      payment_method: E["paymentMethod"];
      valorizador_tipo: E["valorizadorTipo"];
      plan_tier: E["planTier"];
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
