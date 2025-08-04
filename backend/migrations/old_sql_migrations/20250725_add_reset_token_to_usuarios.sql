ALTER TABLE usuarios
  ADD COLUMN reset_token VARCHAR(255),
  ADD COLUMN reset_token_expira TIMESTAMP,
  ADD COLUMN reset_token_usado BOOLEAN DEFAULT FALSE;
