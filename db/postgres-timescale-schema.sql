CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE parks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id UUID NOT NULL REFERENCES parks(id),
  code VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  floors INTEGER NOT NULL DEFAULT 1,
  area NUMERIC(14, 2),
  UNIQUE (park_id, code)
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  code VARCHAR(64) NOT NULL,
  floor_no INTEGER NOT NULL,
  state VARCHAR(32) NOT NULL,
  area NUMERIC(14, 2),
  UNIQUE (building_id, code)
);

CREATE TABLE enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  credit_code VARCHAR(64),
  industry VARCHAR(100),
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE enterprise_rooms (
  enterprise_id UUID NOT NULL REFERENCES enterprises(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  PRIMARY KEY (enterprise_id, room_id)
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  type VARCHAR(64) NOT NULL,
  room_id UUID REFERENCES rooms(id),
  online_state VARCHAR(24) NOT NULL,
  run_state VARCHAR(24) NOT NULL,
  health_score NUMERIC(5, 2),
  owner_name VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE device_telemetry (
  time TIMESTAMPTZ NOT NULL,
  device_id UUID NOT NULL REFERENCES devices(id),
  metric VARCHAR(80) NOT NULL,
  value DOUBLE PRECISION,
  text_value VARCHAR(200),
  PRIMARY KEY (time, device_id, metric)
);
SELECT create_hypertable('device_telemetry', by_range('time'), if_not_exists => TRUE);

CREATE TABLE energy_readings (
  time TIMESTAMPTZ NOT NULL,
  meter_code VARCHAR(80) NOT NULL,
  energy_type VARCHAR(32) NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  building_id UUID REFERENCES buildings(id),
  enterprise_id UUID REFERENCES enterprises(id),
  PRIMARY KEY (time, meter_code)
);
SELECT create_hypertable('energy_readings', by_range('time'), if_not_exists => TRUE);

CREATE TABLE alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alarm_code VARCHAR(80) UNIQUE NOT NULL,
  type VARCHAR(48) NOT NULL,
  level VARCHAR(32) NOT NULL,
  source VARCHAR(160) NOT NULL,
  location VARCHAR(200),
  description TEXT,
  status VARCHAR(32) NOT NULL,
  device_id UUID REFERENCES devices(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ
);

CREATE TABLE workorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(240) NOT NULL,
  type VARCHAR(64) NOT NULL,
  source VARCHAR(64) NOT NULL,
  location VARCHAR(200),
  priority VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  owner_name VARCHAR(80),
  alarm_id UUID REFERENCES alarms(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::JSONB,
  menus JSONB NOT NULL DEFAULT '[]'::JSONB
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(120),
  role_id UUID NOT NULL REFERENCES roles(id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ
);
