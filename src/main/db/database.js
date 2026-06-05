const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDb() {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'trading-journal.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const database = getDb();

  // === Phase C demolition: drop deprecated tables (one-time, idempotent) ===
  // The old planning model (possibility + outcome_plan + custom_plan + verdict) has been
  // replaced by templates + day_plan. No data migration — initial-phase app.
  database.pragma('foreign_keys = OFF');
  database.exec(`
    DROP TABLE IF EXISTS verdict_screenshot;
    DROP TABLE IF EXISTS verdict;
    DROP TABLE IF EXISTS screenshot;
    DROP TABLE IF EXISTS outcome_plan;
    DROP TABLE IF EXISTS possibility;
    DROP TABLE IF EXISTS custom_plan_screenshot;
    DROP TABLE IF EXISTS custom_plan;
  `);
  database.pragma('foreign_keys = ON');

  // Clean up any leftover temp tables from previously interrupted migrations
  try {
    database.exec(`
      DROP TABLE IF EXISTS stock_plan_new;
      DROP TABLE IF EXISTS stock_plan_bias_new;
      DROP TABLE IF EXISTS stock_plan_migrated;
      DROP TABLE IF EXISTS custom_plan_bias_new;
      DROP TABLE IF EXISTS intraday_note_v2;
    `);
  } catch (_) {}

  // === Swing templatization migration ===
  // Drops the old free-form stock_plan table whenever it still exists; it's being replaced by
  // swing_plan (template-instance pattern, matches day_plan). Initial-phase wipe — no data preserved.
  // Also fires when swing_plan's CHECK enum is missing 'UnPlanned' (status enum expansion).
  try {
    const stockPlanExists = database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='stock_plan'"
    ).get();
    if (stockPlanExists) {
      database.exec('DROP INDEX IF EXISTS idx_stock_plan_stock_name');
      database.exec('DROP INDEX IF EXISTS idx_stock_plan_execution_status');
      database.exec('DROP TABLE IF EXISTS stock_plan');
    }
    const spSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='swing_plan'").get();
    if (spSql && !spSql.sql.includes('UnPlanned')) {
      database.exec('DROP TABLE IF EXISTS swing_plan_screenshot');
      database.exec('DROP TABLE IF EXISTS swing_plan');
      database.exec('DROP INDEX IF EXISTS idx_swing_plan_symbol');
      database.exec('DROP INDEX IF EXISTS idx_swing_plan_template');
      database.exec('DROP INDEX IF EXISTS idx_swing_plan_execution_status');
      database.exec('DROP INDEX IF EXISTS idx_swing_plan_plan_date');
      database.exec('DROP INDEX IF EXISTS idx_swing_plan_screenshot_plan');
    }
  } catch (_) {}

  // Single-direction migration: collapse two-sided outcome columns into one. Detects if
  // plan_template still has accepted_bias / has_rejected_outcome columns. Initial-phase data
  // is wiped — drop chain in order. Also fires when execution_status CHECK is missing
  // 'UnPlanned' (the post-Step 8 status enum expansion).
  try {
    const tplCols = database.prepare("PRAGMA table_info(plan_template)").all();
    const dpCols  = database.prepare("PRAGMA table_info(day_plan)").all();
    const inCols  = database.prepare("PRAGMA table_info(intraday_note)").all();
    const sshCols = database.prepare("PRAGMA table_info(day_plan_screenshot)").all();
    const dpSql   = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='day_plan'").get();
    const dpMissingUnplanned = dpSql && !dpSql.sql.includes('UnPlanned');
    const tplHasOldShape = tplCols.length > 0 && (
      tplCols.some(c => c.name === 'accepted_bias') ||
      tplCols.some(c => c.name === 'has_rejected_outcome') ||
      tplCols.some(c => c.name === 'bias' && tplCols.some(c2 => c2.name === 'has_rejected_outcome'))
    );
    const dpHasOldShape = dpCols.length > 0 && (
      dpCols.some(c => c.name === 'accepted_bias') ||
      dpCols.some(c => c.name === 'played_outcome') ||
      dpCols.some(c => c.name === 'has_rejected_outcome')
    );
    const inHasOldShape = inCols.length > 0 && (
      inCols.some(c => c.name === 'outcome') ||
      inCols.some(c => c.name === 'outcome_plan_id') ||
      inCols.some(c => c.name === 'custom_plan_id') ||
      !inCols.some(c => c.name === 'day_plan_id')
    );
    const sshHasOldShape = sshCols.length > 0 && (
      sshCols.some(c => c.name === 'outcome') ||
      !sshCols.some(c => c.name === 'kind')
    );

    if (tplHasOldShape || dpHasOldShape || inHasOldShape || sshHasOldShape || dpMissingUnplanned) {
      database.pragma('foreign_keys = OFF');
      database.exec('DROP TABLE IF EXISTS intraday_note_screenshot');
      database.exec('DROP TABLE IF EXISTS intraday_note');
      database.exec('DROP TABLE IF EXISTS day_plan_screenshot');
      database.exec('DROP TABLE IF EXISTS day_plan');
      database.exec('DROP TABLE IF EXISTS plan_template');
      database.exec('DROP INDEX IF EXISTS idx_plan_template_group');
      database.exec('DROP INDEX IF EXISTS idx_plan_template_trade_type');
      database.exec('DROP INDEX IF EXISTS idx_plan_template_system_code');
      database.exec('DROP INDEX IF EXISTS idx_plan_template_archived');
      database.exec('DROP INDEX IF EXISTS idx_day_plan_trading_day');
      database.exec('DROP INDEX IF EXISTS idx_day_plan_template');
      database.exec('DROP INDEX IF EXISTS idx_day_plan_screenshot_plan');
      database.exec('DROP INDEX IF EXISTS idx_intraday_note_day_plan_outcome');
      database.exec('DROP INDEX IF EXISTS idx_intraday_note_day_plan');
      database.exec('DROP INDEX IF EXISTS idx_intraday_note_trading_day');
      database.pragma('foreign_keys = ON');
    }
  } catch (_) {}

  // Migration: add 'In-Active' to execution_status CHECK on day_plan and swing_plan.
  // Uses rename-copy-drop to preserve existing data (SQLite cannot ALTER CHECK constraints).
  try {
    const dpSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='day_plan'").get();
    if (dpSql && !dpSql.sql.includes('In-Active')) {
      database.pragma('foreign_keys = OFF');
      database.pragma('legacy_alter_table = ON');
      database.exec(`
        ALTER TABLE day_plan RENAME TO _day_plan_inactive_migration;
        CREATE TABLE day_plan (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          trading_day_id    INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
          template_id       INTEGER REFERENCES plan_template(id) ON DELETE SET NULL,
          name              TEXT NOT NULL,
          description       TEXT,
          group_name        TEXT,
          bias              TEXT NOT NULL,
          behavior_tag      TEXT,
          target            REAL,
          stop_out          REAL,
          execution_status  TEXT NOT NULL DEFAULT 'Waiting'
                            CHECK(execution_status IN ('Waiting','Successful','Failed','Cancelled','Cost-to-Cost','UnPlanned','In-Active')),
          outcome_notes     TEXT,
          sort_order        INTEGER NOT NULL DEFAULT 0,
          created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO day_plan SELECT * FROM _day_plan_inactive_migration;
        DROP TABLE _day_plan_inactive_migration;
        CREATE INDEX IF NOT EXISTS idx_day_plan_trading_day ON day_plan(trading_day_id);
        CREATE INDEX IF NOT EXISTS idx_day_plan_template    ON day_plan(template_id);
      `);
      database.pragma('legacy_alter_table = OFF');
      database.pragma('foreign_keys = ON');
    }
  } catch (_) {}

  try {
    const spSql2 = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='swing_plan'").get();
    if (spSql2 && !spSql2.sql.includes('In-Active')) {
      database.pragma('foreign_keys = OFF');
      database.pragma('legacy_alter_table = ON');
      database.exec(`
        ALTER TABLE swing_plan RENAME TO _swing_plan_inactive_migration;
        CREATE TABLE swing_plan (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id       INTEGER REFERENCES plan_template(id) ON DELETE SET NULL,
          symbol_id         INTEGER NOT NULL REFERENCES symbol(id),
          plan_date         TEXT NOT NULL,
          name              TEXT NOT NULL,
          description       TEXT,
          group_name        TEXT,
          bias              TEXT NOT NULL,
          behavior_tag      TEXT,
          timeframe         TEXT NOT NULL CHECK(timeframe IN ('Monthly','Weekly','Daily','4Hrs','1Hrs')),
          entry_price       REAL,
          target_price      REAL,
          stop_loss         REAL,
          analysis          TEXT,
          execution_status  TEXT NOT NULL DEFAULT 'Waiting'
                            CHECK(execution_status IN ('Waiting','Successful','Failed','Cancelled','Cost-to-Cost','UnPlanned','In-Active')),
          outcome_notes     TEXT,
          created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO swing_plan SELECT * FROM _swing_plan_inactive_migration;
        DROP TABLE _swing_plan_inactive_migration;
        CREATE INDEX IF NOT EXISTS idx_swing_plan_symbol           ON swing_plan(symbol_id);
        CREATE INDEX IF NOT EXISTS idx_swing_plan_template         ON swing_plan(template_id);
        CREATE INDEX IF NOT EXISTS idx_swing_plan_execution_status ON swing_plan(execution_status);
        CREATE INDEX IF NOT EXISTS idx_swing_plan_plan_date        ON swing_plan(plan_date);
      `);
      database.pragma('legacy_alter_table = OFF');
      database.pragma('foreign_keys = ON');
    }
  } catch (_) {}

  // Repair: SQLite 3.37+ auto-updates FK references on ALTER TABLE RENAME even with
  // foreign_keys = OFF. Both In-Active migrations renamed their parent table temporarily,
  // which corrupted FKs in day_plan_screenshot, intraday_note, and swing_plan_screenshot.
  // This one-time repair detects and rebuilds each corrupted table with the correct FK.
  try {
    const dpsSql  = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='day_plan_screenshot'").get();
    const inSql   = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='intraday_note'").get();
    const spsSql  = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='swing_plan_screenshot'").get();
    const dpsCorrupted = dpsSql?.sql?.includes('_day_plan_inactive_migration');
    const inCorrupted  = inSql?.sql?.includes('_day_plan_inactive_migration');
    const spsCorrupted = spsSql?.sql?.includes('_swing_plan_inactive_migration');

    if (dpsCorrupted || inCorrupted || spsCorrupted) {
      database.pragma('foreign_keys = OFF');
      database.pragma('legacy_alter_table = ON');

      if (dpsCorrupted) {
        database.exec(`
          ALTER TABLE day_plan_screenshot RENAME TO _dps_fk_repair;
          CREATE TABLE day_plan_screenshot (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            day_plan_id INTEGER NOT NULL REFERENCES day_plan(id) ON DELETE CASCADE,
            kind        TEXT NOT NULL DEFAULT 'setup' CHECK(kind IN ('setup','outcome')),
            file_path   TEXT NOT NULL,
            added_at    DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO day_plan_screenshot SELECT * FROM _dps_fk_repair;
          DROP TABLE _dps_fk_repair;
          CREATE INDEX IF NOT EXISTS idx_day_plan_screenshot_plan ON day_plan_screenshot(day_plan_id, kind);
        `);
      }

      if (inCorrupted) {
        database.exec(`
          ALTER TABLE intraday_note RENAME TO _in_fk_repair;
          CREATE TABLE intraday_note (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
            day_plan_id     INTEGER NOT NULL REFERENCES day_plan(id) ON DELETE CASCADE,
            note_time       TEXT NOT NULL,
            action          TEXT NOT NULL DEFAULT '',
            status          TEXT NOT NULL DEFAULT 'Not-Known'
                            CHECK(status IN ('Super-Bullish','Bullish','Mild-Bullish','Neutral','Medium-Bearish','Bearish','Super-Bearish','Not-Known')),
            sort_order      INTEGER NOT NULL DEFAULT 0,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO intraday_note SELECT * FROM _in_fk_repair;
          DROP TABLE _in_fk_repair;
          CREATE INDEX IF NOT EXISTS idx_intraday_note_trading_day ON intraday_note(trading_day_id);
          CREATE INDEX IF NOT EXISTS idx_intraday_note_day_plan    ON intraday_note(day_plan_id);
        `);
      }

      if (spsCorrupted) {
        database.exec(`
          ALTER TABLE swing_plan_screenshot RENAME TO _sps_fk_repair;
          CREATE TABLE swing_plan_screenshot (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            swing_plan_id INTEGER NOT NULL REFERENCES swing_plan(id) ON DELETE CASCADE,
            kind          TEXT NOT NULL DEFAULT 'setup' CHECK(kind IN ('setup','outcome')),
            file_path     TEXT NOT NULL,
            added_at      DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO swing_plan_screenshot SELECT * FROM _sps_fk_repair;
          DROP TABLE _sps_fk_repair;
          CREATE INDEX IF NOT EXISTS idx_swing_plan_screenshot_plan ON swing_plan_screenshot(swing_plan_id, kind);
        `);
      }

      database.pragma('legacy_alter_table = OFF');
      database.pragma('foreign_keys = ON');
    }
  } catch (_) {}

  // Migration: add screenshot_path column to plan_template (additive, no data loss)
  try {
    const tplColNames = database.prepare("PRAGMA table_info(plan_template)").all();
    if (tplColNames.length > 0 && !tplColNames.some(c => c.name === 'screenshot_path')) {
      database.exec('ALTER TABLE plan_template ADD COLUMN screenshot_path TEXT');
    }
  } catch (_) {}

  database.exec(`
    CREATE TABLE IF NOT EXISTS symbol (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trading_day (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_date  DATE NOT NULL,
      symbol_id   INTEGER NOT NULL REFERENCES symbol(id),
      notes       TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(trade_date, symbol_id)
    );

    -- === Plan Template Library (Phase A) ===

    CREATE TABLE IF NOT EXISTS plan_group (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      description TEXT,
      is_system   INTEGER NOT NULL DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plan_template (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_type            TEXT NOT NULL CHECK(trade_type IN ('Intraday','Swing','Both')),
      group_id              INTEGER REFERENCES plan_group(id) ON DELETE SET NULL,
      name                  TEXT NOT NULL,
      description           TEXT,
      bias                  TEXT NOT NULL CHECK(bias IN ('Super Bullish','Bullish','Possibly Bullish','Range Bound','Possibly Bearish','Bearish','Super Bearish')),
      behavior_tag          TEXT,
      system_code           TEXT,
      is_system             INTEGER NOT NULL DEFAULT 0,
      is_archived           INTEGER NOT NULL DEFAULT 0,
      usage_count           INTEGER NOT NULL DEFAULT 0,
      last_used_at          DATETIME,
      position_sizing_note  TEXT,
      tags                  TEXT,
      created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_plan_template_group       ON plan_template(group_id);
    CREATE INDEX IF NOT EXISTS idx_plan_template_trade_type  ON plan_template(trade_type);
    CREATE INDEX IF NOT EXISTS idx_plan_template_system_code ON plan_template(system_code);
    CREATE INDEX IF NOT EXISTS idx_plan_template_archived    ON plan_template(is_archived);

    -- === Day Plan instances ===
    -- One directional plan per row. Pre-market: name/bias/target/stop/screenshots/notes.
    -- Post-market: execution_status + outcome_notes (edited via Update Day's Result view).

    CREATE TABLE IF NOT EXISTS day_plan (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      trading_day_id    INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
      template_id       INTEGER REFERENCES plan_template(id) ON DELETE SET NULL,

      name              TEXT NOT NULL,
      description       TEXT,
      group_name        TEXT,
      bias              TEXT NOT NULL,
      behavior_tag      TEXT,

      target            REAL,
      stop_out          REAL,

      execution_status  TEXT NOT NULL DEFAULT 'Waiting'
                        CHECK(execution_status IN ('Waiting','Successful','Failed','Cancelled','Cost-to-Cost','UnPlanned','In-Active')),
      outcome_notes     TEXT,

      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_day_plan_trading_day ON day_plan(trading_day_id);
    CREATE INDEX IF NOT EXISTS idx_day_plan_template    ON day_plan(template_id);

    -- kind: 'setup' = chart attached during pre-market planning; 'outcome' = result chart
    --       attached in Update Day's Verdict after the trade played out.
    CREATE TABLE IF NOT EXISTS day_plan_screenshot (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      day_plan_id INTEGER NOT NULL REFERENCES day_plan(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL DEFAULT 'setup' CHECK(kind IN ('setup','outcome')),
      file_path   TEXT NOT NULL,
      added_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_day_plan_screenshot_plan ON day_plan_screenshot(day_plan_id, kind);

    -- === Intraday Notes (per day_plan) ===

    CREATE TABLE IF NOT EXISTS intraday_note (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
      day_plan_id     INTEGER NOT NULL REFERENCES day_plan(id) ON DELETE CASCADE,
      note_time       TEXT NOT NULL,
      action          TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'Not-Known'
                      CHECK(status IN ('Super-Bullish','Bullish','Mild-Bullish','Neutral','Medium-Bearish','Bearish','Super-Bearish','Not-Known')),
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_intraday_note_trading_day ON intraday_note(trading_day_id);
    CREATE INDEX IF NOT EXISTS idx_intraday_note_day_plan    ON intraday_note(day_plan_id);

    CREATE TABLE IF NOT EXISTS intraday_note_screenshot (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      intraday_note_id INTEGER NOT NULL REFERENCES intraday_note(id) ON DELETE CASCADE,
      file_path        TEXT NOT NULL,
      added_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- === Day-Level Intraday Notes (per trading_day, not scoped to a plan) ===

    CREATE TABLE IF NOT EXISTS day_intraday_note (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
      note_time       TEXT NOT NULL,
      action          TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'Not-Known'
                      CHECK(status IN ('Super-Bullish','Bullish','Mild-Bullish','Neutral','Medium-Bearish','Bearish','Super-Bearish','Not-Known')),
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_day_intraday_note_trading_day ON day_intraday_note(trading_day_id);

    CREATE TABLE IF NOT EXISTS day_intraday_note_screenshot (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      day_intraday_note_id INTEGER NOT NULL REFERENCES day_intraday_note(id) ON DELETE CASCADE,
      file_path            TEXT NOT NULL,
      added_at             DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- === Swing Plan instances (templatized — mirrors day_plan, with swing-specific fields) ===
    -- One plan = one stock + one strategy template + entry/target/stop + timeframe.
    -- Snapshot fields (name/description/group_name/bias/behavior_tag) come from plan_template
    -- at pick-time, so future template edits don't mutate history.

    CREATE TABLE IF NOT EXISTS swing_plan (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id       INTEGER REFERENCES plan_template(id) ON DELETE SET NULL,
      symbol_id         INTEGER NOT NULL REFERENCES symbol(id),
      plan_date         TEXT NOT NULL,

      -- snapshot from template
      name              TEXT NOT NULL,
      description       TEXT,
      group_name        TEXT,
      bias              TEXT NOT NULL,
      behavior_tag      TEXT,

      -- swing-specific instance fields
      timeframe         TEXT NOT NULL CHECK(timeframe IN ('Monthly','Weekly','Daily','4Hrs','1Hrs')),
      entry_price       REAL,
      target_price      REAL,
      stop_loss         REAL,
      analysis          TEXT,

      -- outcome (same enum as day_plan)
      execution_status  TEXT NOT NULL DEFAULT 'Waiting'
                        CHECK(execution_status IN ('Waiting','Successful','Failed','Cancelled','Cost-to-Cost','UnPlanned','In-Active')),
      outcome_notes     TEXT,

      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_swing_plan_symbol           ON swing_plan(symbol_id);
    CREATE INDEX IF NOT EXISTS idx_swing_plan_template         ON swing_plan(template_id);
    CREATE INDEX IF NOT EXISTS idx_swing_plan_execution_status ON swing_plan(execution_status);
    CREATE INDEX IF NOT EXISTS idx_swing_plan_plan_date        ON swing_plan(plan_date);

    CREATE TABLE IF NOT EXISTS swing_plan_screenshot (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      swing_plan_id INTEGER NOT NULL REFERENCES swing_plan(id) ON DELETE CASCADE,
      kind          TEXT NOT NULL DEFAULT 'setup' CHECK(kind IN ('setup','outcome')),
      file_path     TEXT NOT NULL,
      added_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_swing_plan_screenshot_plan ON swing_plan_screenshot(swing_plan_id, kind);

    -- === Session Journal (Market Profile / Nifty Futures) ===

    CREATE TABLE IF NOT EXISTS sessions (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      session_date      TEXT NOT NULL UNIQUE,
      instrument        TEXT NOT NULL DEFAULT 'NIFTY50-FUT',
      prev_vah          REAL,
      prev_poc          REAL,
      prev_val          REAL,
      prev_session_type TEXT,
      opening_price     REAL,
      gap_type          TEXT,
      ib_high           REAL,
      ib_low            REAL,
      ib_range          REAL,
      a_vah             REAL,
      a_poc             REAL,
      a_val             REAL,
      created_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id              INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      row_type                TEXT NOT NULL,
      tpo_label               TEXT NOT NULL,
      time_from               TEXT,
      time_to                 TEXT,
      period_high             REAL,
      period_low              REAL,
      period_close            REAL,
      period_range            REAL,
      location_vs_prev_va     TEXT,
      location_vs_a_footprint TEXT,
      extension_direction     TEXT,
      otf_symptoms            TEXT,
      va_migration_poc        TEXT,
      va_migration_width      TEXT,
      observation             TEXT,
      bias                    TEXT,
      bias_trigger            TEXT,
      open_question           TEXT,
      structure_event_type    TEXT,
      price_reference         REAL,
      acceptance              TEXT,
      sort_order              INTEGER NOT NULL DEFAULT 0,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_journal_entries_session ON journal_entries(session_id);
  `);

  // App-wide key-value settings store
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Add period_close column if it doesn't exist yet (added after initial release)
  const jeColumns = database.pragma('table_info(journal_entries)').map(c => c.name);
  if (!jeColumns.includes('period_close')) {
    database.exec(`ALTER TABLE journal_entries ADD COLUMN period_close REAL`);
  }

  // Add prev_high / prev_low to sessions (needed for Half Back = (prev_high + prev_low) / 2)
  const sessCols = database.pragma('table_info(sessions)').map(c => c.name);
  if (!sessCols.includes('prev_high')) database.exec(`ALTER TABLE sessions ADD COLUMN prev_high REAL`);
  if (!sessCols.includes('prev_low'))  database.exec(`ALTER TABLE sessions ADD COLUMN prev_low  REAL`);

  // Add Dhan API config columns to symbol table (added for OHLC fetch feature)
  const symCols = database.pragma('table_info(symbol)').map(c => c.name);
  if (!symCols.includes('dhan_security_id'))      database.exec(`ALTER TABLE symbol ADD COLUMN dhan_security_id    TEXT`);
  if (!symCols.includes('dhan_exchange_segment')) database.exec(`ALTER TABLE symbol ADD COLUMN dhan_exchange_segment TEXT`);
  if (!symCols.includes('dhan_instrument_type'))  database.exec(`ALTER TABLE symbol ADD COLUMN dhan_instrument_type  TEXT`);

  // Fix any symbols saved with the invalid segment value 'NSE_FO' (correct is 'NSE_FNO')
  database.exec(`UPDATE symbol SET dhan_exchange_segment = 'NSE_FNO' WHERE dhan_exchange_segment = 'NSE_FO'`);

  // Seed Market Profile Openings group + 6 system templates (run once)
  seedSystemTemplates(database);

  // Seed default symbols if empty
  const count = database.prepare('SELECT COUNT(*) as count FROM symbol').get();
  if (count.count === 0) {
    const insert = database.prepare('INSERT INTO symbol (name) VALUES (?)');
    const seedMany = database.transaction((symbols) => {
      for (const s of symbols) insert.run(s);
    });
    seedMany(['NIFTY', 'BANKNIFTY', 'FINNIFTY']);
  }
}

// === Seed: Market Profile Openings group + 6 read-only system templates ===
const SYSTEM_GROUP_NAME = 'Market Profile Openings';
const SYSTEM_GROUP_DESC = 'Six pre-built market opening scenarios. Cannot be deleted; clone to customize.';

// Each Market Profile opening = 2 single-direction templates (Accepted + Rejected).
// Every template is directional — the bias IS the scenario; no internal Accepted/Rejected duality.
const SYSTEM_TEMPLATE_SEEDS = [
  { system_code: 'Open_Abv_PDR_Acc',    name: 'Open above PDR — Accepted',    bias: 'Super Bullish',    behavior_tag: null },
  { system_code: 'Open_Abv_PDR_Rej',    name: 'Open above PDR — Rejected',    bias: 'Bearish',          behavior_tag: null },
  { system_code: 'Open_Abv_VAH_IR_Acc', name: 'Open above VAH IR — Accepted', bias: 'Bullish',          behavior_tag: null },
  { system_code: 'Open_Abv_VAH_IR_Rej', name: 'Open above VAH IR — Rejected', bias: 'Bearish',          behavior_tag: null },
  { system_code: 'Open_Abv_POC_IV_Acc', name: 'Open above POC IV — Accepted', bias: 'Possibly Bullish', behavior_tag: null },
  { system_code: 'Open_Abv_POC_IV_Rej', name: 'Open above POC IV — Rejected', bias: 'Possibly Bearish', behavior_tag: null },
  { system_code: 'Open_Bel_POC_IV_Acc', name: 'Open below POC IV — Accepted', bias: 'Possibly Bearish', behavior_tag: null },
  { system_code: 'Open_Bel_POC_IV_Rej', name: 'Open below POC IV — Rejected', bias: 'Possibly Bullish', behavior_tag: null },
  { system_code: 'Open_Bel_VAL_IR_Acc', name: 'Open below VAL IR — Accepted', bias: 'Bearish',          behavior_tag: null },
  { system_code: 'Open_Bel_VAL_IR_Rej', name: 'Open below VAL IR — Rejected', bias: 'Bullish',          behavior_tag: null },
  { system_code: 'Open_Bel_PDR_Acc',    name: 'Open below PDR — Accepted',    bias: 'Super Bearish',    behavior_tag: null },
  { system_code: 'Open_Bel_PDR_Rej',    name: 'Open below PDR — Rejected',    bias: 'Bullish',          behavior_tag: null },
];

// Old single-bundled system_codes (replaced by the 12 single-direction ones above)
const LEGACY_BUNDLED_CODES = [
  'Open_Abv_PDR', 'Open_Abv_VAH_IR', 'Open_Abv_POC_IV',
  'Open_Bel_POC_IV', 'Open_Bel_VAL_IR', 'Open_Bel_PDR',
];

function seedSystemTemplates(database) {
  let group = database.prepare('SELECT id FROM plan_group WHERE name = ?').get(SYSTEM_GROUP_NAME);
  if (!group) {
    const res = database.prepare(
      'INSERT INTO plan_group (name, description, is_system) VALUES (?, ?, 1)'
    ).run(SYSTEM_GROUP_NAME, SYSTEM_GROUP_DESC);
    group = { id: res.lastInsertRowid };
  }

  // Upgrade: if any old bundled system_code exists, remove the 6 legacy ones so we re-seed cleanly.
  // day_plans created from them survive (template_id → SET NULL; snapshot fields are intact).
  const placeholders = LEGACY_BUNDLED_CODES.map(() => '?').join(',');
  const legacyCount = database.prepare(
    `SELECT COUNT(*) AS c FROM plan_template WHERE system_code IN (${placeholders})`
  ).get(...LEGACY_BUNDLED_CODES).c;
  if (legacyCount > 0) {
    database.prepare(
      `DELETE FROM plan_template WHERE system_code IN (${placeholders})`
    ).run(...LEGACY_BUNDLED_CODES);
  }

  // UPSERT — keeps system templates in sync with the canonical spec on every boot.
  const findTpl = database.prepare('SELECT id FROM plan_template WHERE system_code = ?');
  const insertTpl = database.prepare(`
    INSERT INTO plan_template
      (trade_type, group_id, name, description, bias, behavior_tag, system_code, is_system)
    VALUES ('Intraday', ?, ?, NULL, ?, ?, ?, 1)
  `);
  const updateTpl = database.prepare(`
    UPDATE plan_template SET
      group_id = ?, name = ?, bias = ?, behavior_tag = ?,
      is_archived = 0, updated_at = CURRENT_TIMESTAMP
    WHERE system_code = ?
  `);

  const upsertMany = database.transaction((seeds) => {
    for (const s of seeds) {
      const existing = findTpl.get(s.system_code);
      if (existing) {
        updateTpl.run(group.id, s.name, s.bias, s.behavior_tag, s.system_code);
      } else {
        insertTpl.run(group.id, s.name, s.bias, s.behavior_tag, s.system_code);
      }
    }
  });
  upsertMany(SYSTEM_TEMPLATE_SEEDS);
}

module.exports = { getDb, initializeDatabase };
