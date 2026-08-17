CREATE DATABASE IF NOT EXISTS lms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lms_db;

CREATE TABLE IF NOT EXISTS superadmins (
  id            VARCHAR(36)  NOT NULL,
  username      VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_superadmin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS apps (
  id          VARCHAR(36)   NOT NULL,
  slug        VARCHAR(64)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  logo_path   VARCHAR(500)  NOT NULL DEFAULT '',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_profiles (
  id            VARCHAR(36)  NOT NULL,
  username      VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  role          ENUM('student','admin') NOT NULL DEFAULT 'student',
  app_id        VARCHAR(36)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_app (email, app_id),
  CONSTRAINT fk_user_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_progress (
  user_id        VARCHAR(36)  NOT NULL,
  lesson_id      VARCHAR(128) NOT NULL,
  learn_index    INT          NOT NULL DEFAULT 0,
  p2_stars       VARCHAR(5000) NOT NULL DEFAULT '{}',
  p3_score       INT          NULL,
  p4_links_count INT          NOT NULL DEFAULT 0,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, lesson_id),
  CONSTRAINT fk_progress_user
    FOREIGN KEY (user_id) REFERENCES user_profiles(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lessons (
  id          VARCHAR(128) NOT NULL,
  app_id      VARCHAR(36)  NOT NULL COLLATE utf8mb4_0900_ai_ci,
  title       VARCHAR(255) NOT NULL,
  icon        VARCHAR(128) NOT NULL DEFAULT '',
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lessons_app (app_id),
  CONSTRAINT fk_lesson_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_words (
  id          VARCHAR(128) NOT NULL,
  lesson_id   VARCHAR(128) NOT NULL,
  text        VARCHAR(255) NOT NULL,
  image       VARCHAR(2000) NOT NULL DEFAULT '',
  phonetic    VARCHAR(255) NOT NULL DEFAULT '',
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_lesson_words_lesson (lesson_id),
  CONSTRAINT fk_lw_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_links (
  id          INT          NOT NULL AUTO_INCREMENT,
  lesson_id   VARCHAR(128) NOT NULL,
  text        VARCHAR(512) NOT NULL DEFAULT '',
  url         VARCHAR(2000) NOT NULL DEFAULT '',
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lesson_link (lesson_id, sort_order),
  KEY idx_lesson_links_lesson (lesson_id),
  CONSTRAINT fk_ll_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
