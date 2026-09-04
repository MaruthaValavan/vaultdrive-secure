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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          resource_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          checksum: string | null
          created_at: string
          folder_id: string | null
          id: string
          is_deleted: boolean
          mime_type: string
          original_name: string
          owner_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_deleted?: boolean
          mime_type?: string
          original_name: string
          owner_id: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_deleted?: boolean
          mime_type?: string
          original_name?: string
          owner_id?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean
          name: string
          owner_id: string
          parent_id: string | null
          path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          name: string
          owner_id: string
          parent_id?: string | null
          path?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          name?: string
          owner_id?: string
          parent_id?: string | null
          path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          owner_id: string
          resource_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          owner_id: string
          resource_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          owner_id?: string
          resource_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_suspended: boolean
          storage_quota_bytes: number
          storage_used_bytes: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_suspended?: boolean
          storage_quota_bytes?: number
          storage_used_bytes?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_suspended?: boolean
          storage_quota_bytes?: number
          storage_used_bytes?: number
        }
        Relationships: []
      }
      shares: {
        Row: {
          created_at: string
          id: string
          link_expires_at: string | null
          link_password_hash: string | null
          link_token: string | null
          resource_id: string
          resource_type: Database["public"]["Enums"]["share_resource"]
          role: Database["public"]["Enums"]["share_role"]
          shared_by: string
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_expires_at?: string | null
          link_password_hash?: string | null
          link_token?: string | null
          resource_id: string
          resource_type: Database["public"]["Enums"]["share_resource"]
          role?: Database["public"]["Enums"]["share_role"]
          shared_by: string
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_expires_at?: string | null
          link_password_hash?: string | null
          link_token?: string | null
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["share_resource"]
          role?: Database["public"]["Enums"]["share_role"]
          shared_by?: string
          shared_with_user_id?: string | null
        }
        Relationships: []
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
      can_edit_file: {
        Args: { _file_id: string; _uid: string }
        Returns: boolean
      }
      can_edit_folder: {
        Args: { _folder_id: string; _uid: string }
        Returns: boolean
      }
      can_read_file: {
        Args: { _file_id: string; _uid: string }
        Returns: boolean
      }
      can_read_folder: {
        Args: { _folder_id: string; _uid: string }
        Returns: boolean
      }
      confirm_upload: {
        Args: {
          p_checksum?: string
          p_folder_id?: string
          p_mime_type: string
          p_original_name: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: {
          checksum: string | null
          created_at: string
          folder_id: string | null
          id: string
          is_deleted: boolean
          mime_type: string
          original_name: string
          owner_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      file_access_role: {
        Args: { _file_id: string; _uid: string }
        Returns: Database["public"]["Enums"]["share_role"]
      }
      folder_share_role: {
        Args: { _folder_id: string; _uid: string }
        Returns: Database["public"]["Enums"]["share_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_link_password: { Args: { p_password: string }; Returns: string }
      soft_delete_file: { Args: { p_file_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      notification_type: "share_created" | "share_revoked" | "quota_warning"
      share_resource: "file" | "folder"
      share_role: "viewer" | "editor"
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
      app_role: ["admin", "user"],
      notification_type: ["share_created", "share_revoked", "quota_warning"],
      share_resource: ["file", "folder"],
      share_role: ["viewer", "editor"],
    },
  },
} as const
