-- Remove a coluna expires_at da tabela invitations
ALTER TABLE invitations DROP COLUMN IF EXISTS expires_at;
