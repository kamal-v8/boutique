-- Postgres databases required by the boutique services.
-- Runs once on first postgres container init (docker-entrypoint-initdb.d).
CREATE DATABASE users_db;
CREATE DATABASE products_db;
CREATE DATABASE orders_db;
