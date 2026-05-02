-- Be More Amy virtual baton tracker setup
-- Run this once in the existing `signup` database before uploading the tracker files.

CREATE TABLE IF NOT EXISTS baton_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  signup_id INT NOT NULL,
  leg_number INT NOT NULL,
  event_type ENUM('start','update','finish') NOT NULL,
  event_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gps_lat DECIMAL(10,7) NULL,
  gps_lng DECIMAL(10,7) NULL,
  display_lat DECIMAL(10,7) NULL,
  display_lng DECIMAL(10,7) NULL,
  route_fraction DECIMAL(9,6) NULL,
  accuracy_m DECIMAL(10,2) NULL,
  note VARCHAR(255) NULL,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_baton_events_leg_time (leg_number, event_time),
  KEY idx_baton_events_signup_time (signup_id, event_time),
  KEY idx_baton_events_visible_time (is_hidden, event_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
