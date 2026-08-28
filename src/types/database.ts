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
      delete_account_as_admin: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      delete_organization_as_admin: {
        Args: { requesting_user_id: string; target_organization_id: string };
        Returns: undefined;
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
      remove_organization_member: {
        Args: { target_organization_id: string; target_user_id: string };
        Returns: undefined;
      };
      revoke_organization_invitation: {
        Args: { target_invitation_id: string; target_organization_id: string };
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
      membership_status: MembershipStatus;
      organization_role: OrganizationRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
