-- Add granular page-level permissions to workspace members and invitations
-- This allows workspace owners to assign specific view/manage permissions per page
-- instead of relying solely on fixed roles (manager/viewer).

ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT NULL;

ALTER TABLE workspace_invitations
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT NULL;

COMMENT ON COLUMN workspace_members.permissions IS
  'Granular page-level permissions: {"dashboard":{"view":bool},"agents":{"view":bool,"manage":bool},...}. When present, takes precedence over role-derived permissions for non-owners.';

COMMENT ON COLUMN workspace_invitations.permissions IS
  'Granular permissions to assign when the invitee accepts. Mirrors workspace_members.permissions structure.';
