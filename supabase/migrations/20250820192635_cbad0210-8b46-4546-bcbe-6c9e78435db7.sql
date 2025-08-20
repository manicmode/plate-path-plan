-- Optional polish: Lock down schema creation
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT  USAGE  ON SCHEMA public TO authenticated, service_role;