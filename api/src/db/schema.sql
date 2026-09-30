CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS stamm;
CREATE SCHEMA IF NOT EXISTS termino;
CREATE SCHEMA IF NOT EXISTS ausfall;

CREATE TABLE IF NOT EXISTS stamm.praxis (
  id uuid PRIMARY KEY, name text NOT NULL, adresse text NOT NULL,
  termino_location_id text UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS stamm.therapeut (
  id uuid PRIMARY KEY, vorname text NOT NULL, nachname text NOT NULL,
  qualifikationen text[] NOT NULL, termino_practitioner_id text UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS stamm.arbeitszeit (
  therapeut_id uuid NOT NULL REFERENCES stamm.therapeut(id),
  wochentag int NOT NULL CHECK (wochentag BETWEEN 1 AND 5),
  praxis_id uuid NOT NULL REFERENCES stamm.praxis(id),
  von time NOT NULL, bis time NOT NULL
);
CREATE TABLE IF NOT EXISTS stamm.patient (
  id uuid PRIMARY KEY, vorname text NOT NULL, nachname text NOT NULL,
  geburtsdatum date NOT NULL, telefon text, email text,
  termino_patient_id text UNIQUE
);
CREATE TABLE IF NOT EXISTS stamm.verordnung (
  id uuid PRIMARY KEY, patient_id uuid NOT NULL REFERENCES stamm.patient(id),
  ausstellungsdatum date NOT NULL, diagnosegruppe text NOT NULL, heilmittel text NOT NULL,
  verordnungsmenge int NOT NULL, frequenz_pro_woche int NOT NULL
);

CREATE TABLE IF NOT EXISTS termino.appointment (
  id text PRIMARY KEY, location_id text NOT NULL, practitioner_id text NOT NULL,
  service text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  duration_min int NOT NULL,
  status text NOT NULL CHECK (status IN ('booked','cancelled')),
  patient jsonb NOT NULL, booked_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('export','api','patient')),
  CONSTRAINT keine_ueberschneidung EXCLUDE USING gist
    (practitioner_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'booked')
);
CREATE INDEX IF NOT EXISTS appointment_patient_idx ON termino.appointment ((patient->>'id'));
CREATE TABLE IF NOT EXISTS termino.export_snapshot (
  stand text PRIMARY KEY CHECK (stand IN ('0800','0805')),
  exported_at timestamptz NOT NULL, payload jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS termino.sim_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), stand text NOT NULL
);

CREATE TABLE IF NOT EXISTS ausfall.ausfall (
  id uuid PRIMARY KEY, therapeut_id uuid NOT NULL REFERENCES stamm.therapeut(id),
  von timestamptz NOT NULL, bis timestamptz NOT NULL, created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ausfall.entscheidung (
  appointment_id text PRIMARY KEY, aktion text NOT NULL,
  neuer_termin_id text, created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ausfall.outbox (
  id serial PRIMARY KEY, appointment_id text NOT NULL,
  kanal text NOT NULL CHECK (kanal IN ('sms','email')), empfaenger text NOT NULL,
  betreff text, text text NOT NULL, created_at timestamptz NOT NULL
);
