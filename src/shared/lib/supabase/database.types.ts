export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          metadata: Json | null;
          resource_id: string | null;
          resource_type: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          resource_id?: string | null;
          resource_type: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          resource_id?: string | null;
          resource_type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      farm_devices: {
        Row: {
          config: Json | null;
          created_at: string;
          device_type: Database['public']['Enums']['device_type'];
          farm_id: string;
          id: string;
          is_active: boolean;
          lat: number;
          lng: number;
          name: string;
          updated_at: string;
        };
        Insert: {
          config?: Json | null;
          created_at?: string;
          device_type?: Database['public']['Enums']['device_type'];
          farm_id: string;
          id?: string;
          is_active?: boolean;
          lat: number;
          lng: number;
          name: string;
          updated_at?: string;
        };
        Update: {
          config?: Json | null;
          created_at?: string;
          device_type?: Database['public']['Enums']['device_type'];
          farm_id?: string;
          id?: string;
          is_active?: boolean;
          lat?: number;
          lng?: number;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'farm_devices_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
        ];
      };
      farm_members: {
        Row: {
          assigned_by: string | null;
          created_at: string;
          farm_id: string;
          id: string;
          role: Database['public']['Enums']['farm_member_role'];
          user_id: string;
        };
        Insert: {
          assigned_by?: string | null;
          created_at?: string;
          farm_id: string;
          id?: string;
          role?: Database['public']['Enums']['farm_member_role'];
          user_id: string;
        };
        Update: {
          assigned_by?: string | null;
          created_at?: string;
          farm_id?: string;
          id?: string;
          role?: Database['public']['Enums']['farm_member_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'farm_members_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
        ];
      };
      farms: {
        Row: {
          area_unit: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          image_url: string | null;
          lat: number | null;
          lng: number | null;
          name: string;
          organization_id: string;
          province: string | null;
          total_area: number | null;
          updated_at: string;
        };
        Insert: {
          area_unit?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          lat?: number | null;
          lng?: number | null;
          name: string;
          organization_id: string;
          province?: string | null;
          total_area?: number | null;
          updated_at?: string;
        };
        Update: {
          area_unit?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          organization_id?: string;
          province?: string | null;
          total_area?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'farms_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      lands: {
        Row: {
          area: number | null;
          area_unit: string;
          color: string | null;
          created_at: string;
          created_by: string | null;
          crop_type: string | null;
          farm_id: string;
          geometry_json: Json | null;
          id: string;
          image_url: string | null;
          name: string;
          notes: string | null;
          status: Database['public']['Enums']['land_status'];
          updated_at: string;
        };
        Insert: {
          area?: number | null;
          area_unit?: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          crop_type?: string | null;
          farm_id: string;
          geometry_json?: Json | null;
          id?: string;
          image_url?: string | null;
          name: string;
          notes?: string | null;
          status?: Database['public']['Enums']['land_status'];
          updated_at?: string;
        };
        Update: {
          area?: number | null;
          area_unit?: string;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          crop_type?: string | null;
          farm_id?: string;
          geometry_json?: Json | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          notes?: string | null;
          status?: Database['public']['Enums']['land_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lands_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_members: {
        Row: {
          id: string;
          invited_by: string | null;
          joined_at: string;
          organization_id: string;
          role: Database['public']['Enums']['org_member_role'];
          user_id: string;
        };
        Insert: {
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          organization_id: string;
          role?: Database['public']['Enums']['org_member_role'];
          user_id: string;
        };
        Update: {
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          organization_id?: string;
          role?: Database['public']['Enums']['org_member_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_tilesets: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          mapbox_url: string;
          max_zoom: number | null;
          min_zoom: number | null;
          name: string;
          opacity: number;
          organization_id: string;
          sort_order: number;
          tile_size: number;
          tileset_type: Database['public']['Enums']['tileset_type'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          mapbox_url: string;
          max_zoom?: number | null;
          min_zoom?: number | null;
          name: string;
          opacity?: number;
          organization_id: string;
          sort_order?: number;
          tile_size?: number;
          tileset_type?: Database['public']['Enums']['tileset_type'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          mapbox_url?: string;
          max_zoom?: number | null;
          min_zoom?: number | null;
          name?: string;
          opacity?: number;
          organization_id?: string;
          sort_order?: number;
          tile_size?: number;
          tileset_type?: Database['public']['Enums']['tileset_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_tilesets_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_date: string | null;
          farm_id: string;
          id: string;
          land_id: string | null;
          priority: Database['public']['Enums']['task_priority'];
          status: Database['public']['Enums']['task_status'];
          team_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          farm_id: string;
          id?: string;
          land_id?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['task_status'];
          team_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          farm_id?: string;
          id?: string;
          land_id?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          status?: Database['public']['Enums']['task_status'];
          team_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_to_profiles_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_land_id_fkey';
            columns: ['land_id'];
            isOneToOne: false;
            referencedRelation: 'lands';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      team_members: {
        Row: {
          joined_at: string;
          role: string;
          team_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          role?: string;
          team_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          role?: string;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_members_user_id_profiles_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          color: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          farm_id: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          farm_id: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          farm_id?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teams_farm_id_fkey';
            columns: ['farm_id'];
            isOneToOne: false;
            referencedRelation: 'farms';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_my_farm_ids: { Args: never; Returns: string[] };
      get_my_org_ids: { Args: never; Returns: string[] };
    };
    Enums: {
      device_type: 'camera' | 'solar_cell' | 'water_pump' | 'sensor';
      farm_member_role: 'owner' | 'manager' | 'worker';
      land_status: 'active' | 'fallow' | 'harvested' | 'preparing';
      org_member_role: 'owner' | 'admin' | 'member';
      task_priority: 'low' | 'medium' | 'high' | 'urgent';
      task_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      tileset_type: 'raster' | 'vector' | 'raster-dem';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      device_type: ['camera', 'solar_cell', 'water_pump', 'sensor'],
      farm_member_role: ['owner', 'manager', 'worker'],
      land_status: ['active', 'fallow', 'harvested', 'preparing'],
      org_member_role: ['owner', 'admin', 'member'],
      task_priority: ['low', 'medium', 'high', 'urgent'],
      task_status: ['pending', 'in_progress', 'completed', 'cancelled'],
      tileset_type: ['raster', 'vector', 'raster-dem'],
    },
  },
} as const;
