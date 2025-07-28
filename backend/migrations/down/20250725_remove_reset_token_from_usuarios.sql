ALTER TABLE usuarios
  DROP COLUMN IF EXISTS reset_token,
  DROP COLUMN IF EXISTS reset_token_expira,
  DROP COLUMN IF EXISTS reset_token_usado;
