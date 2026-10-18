// Tipos de la base de datos, mantenidos a mano en el mismo formato que genera
// `supabase gen types typescript`. Actualízalos junto con cada migración en
// supabase/migrations/ (o regenéralos con la CLI cuando alguien la tenga enlazada).
// Las columnas geography (PostGIS) se tipan como unknown.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_migrations: {
        Row: { name: string; applied_at: string };
        Insert: { name: string; applied_at?: string };
        Update: { name?: string; applied_at?: string };
        Relationships: [];
      };
      polymers: {
        Row: { code: string; resin_number: number; name: string; price_per_kg: number };
        Insert: { code: string; resin_number: number; name: string; price_per_kg: number };
        Update: { code?: string; resin_number?: number; name?: string; price_per_kg?: number };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          display_name: string;
          org_type: string;
          municipality: string;
          zone: string;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          display_name: string;
          org_type: string;
          municipality: string;
          zone: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          display_name?: string;
          org_type?: string;
          municipality?: string;
          zone?: string;
          verified?: boolean;
          created_at?: string;
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
          estimated_kg: number;
          photo_urls: string[];
          pickup_from: string;
          pickup_to: string;
          modality: Database["public"]["Enums"]["lot_modality"];
          price_per_kg: number;
          notes: string | null;
          status: Database["public"]["Enums"]["lot_status"];
          location: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          generator_id: string;
          polymer_code: string;
          estimated_kg: number;
          photo_urls?: string[];
          pickup_from: string;
          pickup_to: string;
          modality: Database["public"]["Enums"]["lot_modality"];
          price_per_kg?: number;
          notes?: string | null;
          status?: Database["public"]["Enums"]["lot_status"];
          location: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          generator_id?: string;
          polymer_code?: string;
          estimated_kg?: number;
          photo_urls?: string[];
          pickup_from?: string;
          pickup_to?: string;
          modality?: Database["public"]["Enums"]["lot_modality"];
          price_per_kg?: number;
          notes?: string | null;
          status?: Database["public"]["Enums"]["lot_status"];
          location?: unknown;
          created_at?: string;
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
          confirmed_kg: number | null;
          total_amount: number | null;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          certificate_code: string | null;
        };
        Insert: {
          id?: string;
          lot_id: string;
          collector_id: string;
          reserved_at?: string;
          delivered_at?: string | null;
          completed_at?: string | null;
          confirmed_kg?: number | null;
          total_amount?: number | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          certificate_code?: string | null;
        };
        Update: {
          id?: string;
          lot_id?: string;
          collector_id?: string;
          reserved_at?: string;
          delivered_at?: string | null;
          completed_at?: string | null;
          confirmed_kg?: number | null;
          total_amount?: number | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          certificate_code?: string | null;
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
    };
    Views: {
      profile_impact: {
        Row: {
          profile_id: string | null;
          role: Database["public"]["Enums"]["user_role"] | null;
          display_name: string | null;
          org_type: string | null;
          municipality: string | null;
          verified: boolean | null;
          lots_published: number | null;
          completed_count: number | null;
          completed_kg: number | null;
          total_amount: number | null;
          rating_avg: number | null;
          rating_count: number | null;
        };
        Relationships: [];
      };
      impact_monthly: {
        Row: {
          month: string | null;
          generator_id: string | null;
          municipality: string | null;
          polymer_code: string | null;
          completed_kg: number | null;
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
          completed_kg: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      my_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      publish_lot: {
        Args: {
          p_polymer_code: string;
          p_estimated_kg: number;
          p_pickup_from: string;
          p_pickup_to: string;
          p_modality: Database["public"]["Enums"]["lot_modality"];
          p_photo_urls?: string[];
          p_notes?: string | null;
        };
        Returns: string;
      };
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
          estimated_kg: number;
          price_per_kg: number;
          modality: Database["public"]["Enums"]["lot_modality"];
          pickup_from: string;
          pickup_to: string;
          photo_urls: string[];
          notes: string | null;
          lat: number;
          lng: number;
          distance_m: number;
        }[];
      };
      reserve_lot: {
        Args: { p_lot_id: string };
        Returns: string;
      };
      mark_delivered: {
        Args: { p_pickup_id: string };
        Returns: undefined;
      };
      complete_pickup: {
        Args: {
          p_pickup_id: string;
          p_confirmed_kg: number;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
        };
        Returns: string;
      };
      rate_pickup: {
        Args: { p_pickup_id: string; p_stars: number; p_comment?: string | null };
        Returns: undefined;
      };
      get_certificate: {
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
          confirmed_kg: number;
        }[];
      };
    };
    Enums: {
      user_role: "generador" | "valorizador" | "municipalidad";
      lot_modality: "venta" | "trueque" | "donacion";
      lot_status: "publicado" | "reservado" | "entregado" | "completado" | "cancelado";
      payment_method: "efectivo" | "transferencia" | "chivo_wallet";
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
