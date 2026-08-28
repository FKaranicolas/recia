export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganizationRole = "owner" | "admin" | "operator" | "viewer";
export type MembershipStatus = "active" | "removed";

type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationMemberRow = {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: MembershipStatus;
  added_by: string | null;
  created_at: string;
  updated_at: string;
};

type OrganizationInvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  token_hash: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type DocumentStatus = "uploading" | "stored";
export type DocumentDerivativeKind = "thumbnail" | "preview_page";
export type DocumentDerivativeStatus = "pending" | "ready" | "failed" | "unsupported";

type DocumentRow = {
  id: string;
  organization_id: string;
  status: DocumentStatus;
  storage_path: string;
  original_filename: string;
  declared_mime_type: string;
  mime_type: string | null;
  byte_size: number | null;
  checksum_sha256: string | null;
  page_count: number | null;
  width_px: number | null;
  height_px: number | null;
  uploaded_by: string | null;
  derivative_status: DocumentDerivativeStatus;
  created_at: string;
  updated_at: string;
  stored_at: string | null;
};

type DocumentDerivativeRow = {
  id: string;
  document_id: string;
  organization_id: string;
  kind: DocumentDerivativeKind;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  width_px: number | null;
  height_px: number | null;
  page: number | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, "id"> & Partial<Omit<ProfileRow, "id">>;
        Update: Partial<Omit<ProfileRow, "id">>;
        Relationships: [];
      };
      organizations: {
        Row: OrganizationRow;
        Insert: Pick<OrganizationRow, "name" | "created_by"> &
          Partial<Omit<OrganizationRow, "name" | "created_by">>;
        Update: Partial<Omit<OrganizationRow, "id" | "created_by">>;
        Relationships: [];
      };
      organization_members: {
        Row: OrganizationMemberRow;
        Insert: Pick<
          OrganizationMemberRow,
          "organization_id" | "user_id" | "role"
        > &
          Partial<
            Omit<OrganizationMemberRow, "organization_id" | "user_id" | "role">
          >;
        Update: Partial<
          Omit<OrganizationMemberRow, "organization_id" | "user_id">
        >;
        Relationships: [];
      };
      documents: {
        Row: DocumentRow;
        Insert: Pick<
          DocumentRow,
          "organization_id" | "storage_path" | "original_filename" | "declared_mime_type"
        > &
          Partial<
            Omit<
              DocumentRow,
              "organization_id" | "storage_path" | "original_filename" | "declared_mime_type"
            >
          >;
        Update: Partial<Omit<DocumentRow, "id" | "organization_id" | "storage_path">>;
        Relationships: [];
      };
      document_derivatives: {
        Row: DocumentDerivativeRow;
        Insert: Pick<
          DocumentDerivativeRow,
          | "document_id"
          | "organization_id"
          | "kind"
          | "storage_path"
          | "mime_type"
          | "byte_size"
        > &
          Partial<Omit<DocumentDerivativeRow, "document_id" | "organization_id">>;
        Update: Partial<Omit<DocumentDerivativeRow, "id" | "document_id">>;
        Relationships: [];
      };
      organization_invitations: {
        Row: OrganizationInvitationRow;
        Insert: Pick<
          OrganizationInvitationRow,
          "organization_id" | "email" | "role" | "token_hash" | "expires_at"
        > &
          Partial<
            Omit<
              OrganizationInvitationRow,
              "organization_id" | "email" | "role" | "token_hash" | "expires_at"
            >
          >;
        Update: Partial<OrganizationInvitationRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_token: string };
        Returns: string;
      };
      create_organization: {
        Args: { organization_name: string };
        Returns: string;
      };
      create_organization_invitation: {
        Args: {
          target_email: string;
          target_organization_id: string;
          target_role: OrganizationRole;
        };
        Returns: { expires_at: string; token: string }[];
      };
      create_document_upload: {
        Args: {
          declared_bytes: number;
          declared_mime: string;
          target_filename: string;
          target_organization_id: string;
        };
        Returns: { document_id: string; storage_path: string }[];
      };
      delete_account_as_admin: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      delete_organization_as_admin: {
        Args: { requesting_user_id: string; target_organization_id: string };
        Returns: undefined;
      };
      discard_document_upload: {
        Args: { target_document_id: string };
        Returns: string;
      };
      expire_stale_document_uploads: {
        Args: { target_organization_id: string };
        Returns: string[];
      };
      finalize_document_upload: {
        Args: {
          resolved_bytes: number;
          resolved_checksum: string;
          resolved_height?: number | null;
          resolved_mime: string;
          resolved_page_count?: number | null;
          resolved_width?: number | null;
          target_document_id: string;
        };
        Returns: undefined;
      };
      find_document_by_checksum: {
        Args: { target_checksum: string; target_organization_id: string };
        Returns: string | null;
      };
      list_organization_invitations: {
        Args: { target_organization_id: string };
        Returns: {
          invitation_id: string;
          email: string;
          role: OrganizationRole;
          expires_at: string;
          created_at: string;
        }[];
      };
      register_document_derivative: {
        Args: {
          target_bytes: number;
          target_document_id: string;
          target_height?: number | null;
          target_kind: DocumentDerivativeKind;
          target_mime: string;
          target_page?: number | null;
          target_storage_path: string;
          target_width?: number | null;
        };
        Returns: undefined;
      };
      remove_organization_member: {
        Args: { target_organization_id: string; target_user_id: string };
        Returns: undefined;
      };
      revoke_organization_invitation: {
        Args: { target_invitation_id: string; target_organization_id: string };
        Returns: undefined;
      };
      set_document_derivative_status: {
        Args: { next_status: DocumentDerivativeStatus; target_document_id: string };
        Returns: undefined;
      };
      transfer_organization_ownership: {
        Args: { next_owner_id: string; target_organization_id: string };
        Returns: undefined;
      };
      update_organization_member_role: {
        Args: {
          target_organization_id: string;
          target_role: OrganizationRole;
          target_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      document_derivative_kind: DocumentDerivativeKind;
      document_derivative_status: DocumentDerivativeStatus;
      document_status: DocumentStatus;
      membership_status: MembershipStatus;
      organization_role: OrganizationRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
