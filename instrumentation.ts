export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  // FTS5 virtual tables cannot be created through libsql's prepared statement
  // path (Statement.run) used by drizzle-kit migrate — it mishandles FTS5's
  // internal SQLITE_OK callbacks. We create them here at startup using
  // client.execute() which uses sqlite3_exec and handles FTS5 correctly.
  //
  // Note: GROUP_CONCAT(DISTINCT col, ' ') is not valid SQLite syntax —
  // DISTINCT aggregates only accept one argument. We use a subquery instead:
  // (SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT name FROM ...))
  const { createClient } = await import('@libsql/client');

  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const distinctAircraftNames = (routeIdExpr: string) =>
    `COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = ${routeIdExpr})), '')`;

  const flightNumbers = (routeIdExpr: string) =>
    `COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = ${routeIdExpr}), '')`;

  const statements = [
    `CREATE VIRTUAL TABLE IF NOT EXISTS routes_fts USING fts5(
      route_id UNINDEXED,
      flight_numbers,
      departure_icao,
      arrival_icao,
      aircraft_names
    )`,

    `INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
    SELECT
      r.id,
      ${flightNumbers('r.id')},
      r.departure_icao,
      r.arrival_icao,
      ${distinctAircraftNames('r.id')}
    FROM routes r
    WHERE r.id NOT IN (SELECT route_id FROM routes_fts)`,

    `CREATE TRIGGER IF NOT EXISTS routes_fts_insert AFTER INSERT ON routes BEGIN
      INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
      VALUES (NEW.id, '', NEW.departure_icao, NEW.arrival_icao, '');
    END`,

    `CREATE TRIGGER IF NOT EXISTS routes_fts_update AFTER UPDATE ON routes BEGIN
      DELETE FROM routes_fts WHERE route_id = OLD.id;
      INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
      SELECT NEW.id,
        ${flightNumbers('NEW.id')},
        NEW.departure_icao, NEW.arrival_icao,
        ${distinctAircraftNames('NEW.id')};
    END`,

    `CREATE TRIGGER IF NOT EXISTS routes_fts_delete AFTER DELETE ON routes BEGIN
      DELETE FROM routes_fts WHERE route_id = OLD.id;
    END`,

    `CREATE TRIGGER IF NOT EXISTS routes_fts_fn_insert AFTER INSERT ON routes_flight_numbers BEGIN
      DELETE FROM routes_fts WHERE route_id = NEW.route_id;
      INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
      SELECT r.id,
        ${flightNumbers('r.id')},
        r.departure_icao, r.arrival_icao,
        ${distinctAircraftNames('r.id')}
      FROM routes r WHERE r.id = NEW.route_id;
    END`,

    `CREATE TRIGGER IF NOT EXISTS routes_fts_fn_delete AFTER DELETE ON routes_flight_numbers BEGIN
      DELETE FROM routes_fts WHERE route_id = OLD.route_id;
      INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
      SELECT r.id,
        ${flightNumbers('r.id')},
        r.departure_icao, r.arrival_icao,
        ${distinctAircraftNames('r.id')}
      FROM routes r WHERE r.id = OLD.route_id;
    END`,

    `CREATE TRIGGER IF NOT EXISTS routes_fts_ac_insert AFTER INSERT ON route_aircraft BEGIN
      DELETE FROM routes_fts WHERE route_id = NEW.route_id;
      INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
      SELECT r.id,
        ${flightNumbers('r.id')},
        r.departure_icao, r.arrival_icao,
        ${distinctAircraftNames('r.id')}
      FROM routes r WHERE r.id = NEW.route_id;
    END`,

    `CREATE TRIGGER IF NOT EXISTS routes_fts_ac_delete AFTER DELETE ON route_aircraft BEGIN
      DELETE FROM routes_fts WHERE route_id = OLD.route_id;
      INSERT INTO routes_fts(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
      SELECT r.id,
        ${flightNumbers('r.id')},
        r.departure_icao, r.arrival_icao,
        ${distinctAircraftNames('r.id')}
      FROM routes r WHERE r.id = OLD.route_id;
    END`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

  client.close();
}
