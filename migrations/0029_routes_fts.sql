--> statement-breakpoint
CREATE VIRTUAL TABLE IF NOT EXISTS `routes_fts` USING fts5(
  route_id UNINDEXED,
  flight_numbers,
  departure_icao,
  arrival_icao,
  aircraft_names
);
--> statement-breakpoint
INSERT INTO `routes_fts`(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
SELECT
  r.id,
  COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
  r.departure_icao,
  r.arrival_icao,
  COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
FROM routes r;
--> statement-breakpoint
CREATE TRIGGER `routes_fts_insert` AFTER INSERT ON `routes` BEGIN
  INSERT INTO `routes_fts`(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
  VALUES (NEW.id, '', NEW.departure_icao, NEW.arrival_icao, '');
END;
--> statement-breakpoint
CREATE TRIGGER `routes_fts_update` AFTER UPDATE ON `routes` BEGIN
  DELETE FROM `routes_fts` WHERE route_id = OLD.id;
  INSERT INTO `routes_fts`(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
  SELECT NEW.id,
    COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = NEW.id), ''),
    NEW.departure_icao,
    NEW.arrival_icao,
    COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = NEW.id)), '');
END;
--> statement-breakpoint
CREATE TRIGGER `routes_fts_delete` AFTER DELETE ON `routes` BEGIN
  DELETE FROM `routes_fts` WHERE route_id = OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER `routes_fts_fn_insert` AFTER INSERT ON `routes_flight_numbers` BEGIN
  DELETE FROM `routes_fts` WHERE route_id = NEW.route_id;
  INSERT INTO `routes_fts`(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
  SELECT r.id,
    COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
    r.departure_icao,
    r.arrival_icao,
    COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
  FROM routes r WHERE r.id = NEW.route_id;
END;
--> statement-breakpoint
CREATE TRIGGER `routes_fts_fn_delete` AFTER DELETE ON `routes_flight_numbers` BEGIN
  DELETE FROM `routes_fts` WHERE route_id = OLD.route_id;
  INSERT INTO `routes_fts`(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
  SELECT r.id,
    COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
    r.departure_icao,
    r.arrival_icao,
    COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
  FROM routes r WHERE r.id = OLD.route_id;
END;
--> statement-breakpoint
CREATE TRIGGER `routes_fts_ac_insert` AFTER INSERT ON `route_aircraft` BEGIN
  DELETE FROM `routes_fts` WHERE route_id = NEW.route_id;
  INSERT INTO `routes_fts`(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
  SELECT r.id,
    COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
    r.departure_icao,
    r.arrival_icao,
    COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
  FROM routes r WHERE r.id = NEW.route_id;
END;
--> statement-breakpoint
CREATE TRIGGER `routes_fts_ac_delete` AFTER DELETE ON `route_aircraft` BEGIN
  DELETE FROM `routes_fts` WHERE route_id = OLD.route_id;
  INSERT INTO `routes_fts`(route_id, flight_numbers, departure_icao, arrival_icao, aircraft_names)
  SELECT r.id,
    COALESCE((SELECT GROUP_CONCAT(rfn.flight_number, ' ') FROM routes_flight_numbers rfn WHERE rfn.route_id = r.id), ''),
    r.departure_icao,
    r.arrival_icao,
    COALESCE((SELECT GROUP_CONCAT(name, ' ') FROM (SELECT DISTINCT a.name FROM route_aircraft ra JOIN aircraft a ON ra.aircraft_id = a.id WHERE ra.route_id = r.id)), '')
  FROM routes r WHERE r.id = OLD.route_id;
END;
