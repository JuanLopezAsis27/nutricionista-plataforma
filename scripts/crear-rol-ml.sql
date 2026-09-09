-- =============================================================================
-- Rol de SOLO LECTURA para el servicio de ML.
--
-- Se corre UNA VEZ por entorno, con el stack levantado:
--
--   docker compose -p nutri_prod -f docker-compose.prod.yml exec -T postgres \
--     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v clave="'UNA_CLAVE_FUERTE'" \
--     < scripts/crear-rol-ml.sql
--
-- Después, en el .env del entorno:
--   DATABASE_URL_RO=postgresql://ml_lector:UNA_CLAVE_FUERTE@postgres:5432/nutricionista
--
-- POR QUÉ UN ROL Y NO UNA RÉPLICA
--
-- `ml-servicio/db.py` ya ejecuta `SET default_transaction_read_only = on` al
-- abrir la conexión, pero eso es una promesa del CLIENTE: cualquier cambio en
-- ese archivo —o un bug— la anula. Definido en el rol, la garantía la aplica el
-- servidor y no hay forma de que el servicio escriba aunque quiera.
--
-- El plan alternativo era una réplica física de solo lectura. Para este volumen
-- de consultas eso significa otro host, otro respaldo y otro punto de falla, sin
-- ganar nada: el rol da el mismo aislamiento de escritura.
-- =============================================================================

\set ON_ERROR_STOP on

-- Idempotente: se puede volver a correr sin romper nada.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ml_lector') THEN
    CREATE ROLE ml_lector LOGIN;
  END IF;
END
$$;

ALTER ROLE ml_lector LOGIN PASSWORD :clave;

-- `GRANT ... ON DATABASE` exige un nombre literal; no acepta CURRENT_CATALOG ni
-- una expresión. De ahí el SQL dinámico, para que el script sirva sin editarlo
-- en cualquier entorno (prod y staging usan bases con distinto nombre).
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO ml_lector', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO ml_lector;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ml_lector;

-- Para las tablas que cree una migración FUTURA. Sin esto, el servicio dejaría
-- de ver tablas nuevas y fallaría con "permission denied" recién en producción.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ml_lector;

-- La garantía de solo lectura, del lado del SERVIDOR.
ALTER ROLE ml_lector SET default_transaction_read_only = on;

-- Una consulta pesada del ML no puede ahogar a la app. Hoy no existe ningún
-- límite: un escaneo largo compite con las consultas que atienden pacientes.
ALTER ROLE ml_lector SET statement_timeout = '15s';

-- Y que no se quede una transacción abierta reteniendo recursos.
ALTER ROLE ml_lector SET idle_in_transaction_session_timeout = '30s';

\echo 'Rol ml_lector listo (solo lectura, statement_timeout 15s).'
