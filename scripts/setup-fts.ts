/**
 * Sets up the FTS5 full-text search index for routes.
 *
 * This cannot be run through drizzle-kit migrate because libsql's migration
 * runner uses prepared statements (Statement.run) which don't support FTS5
 * virtual table creation. Instead, we use the underlying libsql client's
 * execute() method directly.
 *
 * Run with: bun run scripts/setup-fts.ts
 */

import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const statements = [
  // Create FTS5 virtual table
  `CREATE VIRTUAL TABLE IF NOT EXISTS routes_fts USING fts5(
    route_id UNINDEXED,
    flight_numbers,
    departure_icao,
    arrival_icao,
    aircraft_names
  )`,

  // Populate from existing data
  `INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
  SELECT
    r.id,
    COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
    r.departure_icao,
    r.arrival_icao,
    COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
  FROM routes r
  WHERE r.id NOT IN (SELECT route_id FROM routes_fts)`,

  // Trigger: routes INSERT
  `CREATE TRIGGER IF NOT EXISTS routes_fts_insert AFTER INSERT ON routes BEGIN
    INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
    VALUES (NEW.id, '', NEW.departure_icao, NEW.arrival_icao, '');
  END`,

  // Trigger: routes UPDATE
  `CREATE TRIGGER IF NOT EXISTS routes_fts_update AFTER UPDATE ON routes BEGIN
    DELETE FROM routes_fts WHERE route_id = OLD.id;
    INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
    SELECT NEW.id,
      COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = NEW.id), ''),
      NEW.departure_icao,
      NEW.arrival_icao,
      COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = NEW.id)), '');
  END`,

  // Trigger: routes DELETE
  `CREATE TRIGGER IF NOT EXISTS routes_fts_delete AFTER DELETE ON routes BEGIN
    DELETE FROM routes_fts WHERE route_id = OLD.id;
  END`,

  // Trigger: routes_flight_numbers INSERT
  `CREATE TRIGGER IF NOT EXISTS routes_fts_fn_insert AFTER INSERT ON routes_flight_numbers BEGIN
    DELETE FROM routes_fts WHERE route_id = NEW.route_id;
    INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
    SELECT r.id,
      COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
      r.departure_icao,
      r.arrival_icao,
      COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
    FROM routes r WHERE r.id = NEW.route_id;
  END`,

  // Trigger: routes_flight_numbers DELETE
  `CREATE TRIGGER IF NOT EXISTS routes_fts_fn_delete AFTER DELETE ON routes_flight_numbers BEGIN
    DELETE FROM routes_fts WHERE route_id = OLD.route_id;
    INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
    SELECT r.id,
      COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
      r.departure_icao,
      r.arrival_icao,
      COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
    FROM routes r WHERE r.id = OLD.route_id;
  END`,

  // Trigger: route_aircraft INSERT
  `CREATE TRIGGER IF NOT EXISTS routes_fts_ac_insert AFTER INSERT ON route_aircraft BEGIN
    DELETE FROM routes_fts WHERE route_id = NEW.route_id;
    INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
    SELECT r.id,
      COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
      r.departure_icao,
      r.arrival_icao,
      COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
    FROM routes r WHERE r.id = NEW.route_id;
  END`,

  // Trigger: route_aircraft DELETE
  `CREATE TRIGGER IF NOT EXISTS routes_fts_ac_delete AFTER DELETE ON route_aircraft BEGIN
    DELETE FROM routes_fts WHERE route_id = OLD.route_id;
    INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
    SELECT r.id,
      COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
      r.departure_icao,
      r.arrival_icao,
      COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
    FROM routes r WHERE r.id = OLD.route_id;
  END`,
];

async function setupFts() {
  console.log('Setting up FTS5 routes search index...');

  for (const sql of statements) {
    const label = sql.trim().split('\n')[0].trim().slice(0, 60);
    try {
      await client.execute(sql);
      console.log(`  ✓ ${label}`);
    } catch (err) {
      console.error(`  ✗ ${label}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log('Done. FTS5 routes_fts table and triggers are ready.');
  client.close();
}

setupFts();
