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

  // Clean up any leftover temp tables from previously interrupted migrations
  try {
    database.exec(`
      DROP TABLE IF EXISTS stock_plan_new;
      DROP TABLE IF EXISTS stock_plan_bias_new;
      DROP TABLE IF EXISTS stock_plan_migrated;
      DROP TABLE IF EXISTS custom_plan_bias_new;
    `);
  } catch (_) {}

  // Migrate stock_plan: drop if exists with old CHECK constraint (missing 'Waiting')
  try {
    const tableSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='stock_plan'").get();
    if (tableSql && !tableSql.sql.includes("'Waiting'")) {
      database.exec('DROP TABLE IF EXISTS stock_plan');
      database.exec('DROP INDEX IF EXISTS idx_stock_plan_stock_name');
      database.exec('DROP INDEX IF EXISTS idx_stock_plan_execution_status');
    }
  } catch (_) { /* table doesn't exist yet */ }

  // Migrate intraday_note: drop if exists with old CHECK constraint (missing 'Bullish')
  try {
    const intradaySql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='intraday_note'").get();
    if (intradaySql && !intradaySql.sql.includes("'Bullish'")) {
      database.exec('DROP TABLE IF EXISTS intraday_note_screenshot');
      database.exec('DROP TABLE IF EXISTS intraday_note');
      database.exec('DROP INDEX IF EXISTS idx_intraday_note_outcome_plan');
      database.exec('DROP INDEX IF EXISTS idx_intraday_note_custom_plan');
    }
  } catch (_) { /* table doesn't exist yet */ }

  // Migrate custom_plan: remap old bias_tag values to new 5-tag set
  try {
    const cpSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='custom_plan'").get();
    if (cpSql && cpSql.sql.includes("'Bullish (Medium)'")) {
      database.pragma('foreign_keys = OFF');
      database.exec(`
        CREATE TABLE IF NOT EXISTS custom_plan_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
          title           TEXT NOT NULL DEFAULT '',
          trade_plan      TEXT NOT NULL DEFAULT '',
          bias_tag        TEXT CHECK(bias_tag IN ('Super Bullish','Bullish','Range Bound','Bearish','Super Bearish') OR bias_tag IS NULL),
          target          REAL,
          stop_out        REAL,
          verdict_status  TEXT CHECK(verdict_status IN ('Pass', 'Fail', 'Partial', 'Cancelled') OR verdict_status IS NULL),
          verdict_notes   TEXT,
          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO custom_plan_new
          SELECT id, trading_day_id, title, trade_plan,
            CASE bias_tag
              WHEN 'Bullish (Medium)' THEN 'Bullish'
              WHEN 'Medium Bearish'   THEN 'Bearish'
              ELSE bias_tag
            END,
            target, stop_out, verdict_status, verdict_notes, created_at, updated_at
          FROM custom_plan;
        DROP TABLE custom_plan;
        ALTER TABLE custom_plan_new RENAME TO custom_plan;
      `);
      database.pragma('foreign_keys = ON');
    }
  } catch (_) { /* table doesn't exist yet */ }

  // Migrate intraday_note: add trading_day_id for day-level notes
  try {
    const intradayNoteCols = database.prepare("PRAGMA table_info(intraday_note)").all();
    if (intradayNoteCols.length > 0 && !intradayNoteCols.some(c => c.name === 'trading_day_id')) {
      database.pragma('foreign_keys = OFF');
      database.exec('DROP TABLE IF EXISTS intraday_note_v2');
      database.exec(`
        CREATE TABLE intraday_note_v2 (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          trading_day_id  INTEGER NOT NULL DEFAULT 0,
          outcome_plan_id INTEGER REFERENCES outcome_plan(id) ON DELETE SET NULL,
          custom_plan_id  INTEGER REFERENCES custom_plan(id) ON DELETE SET NULL,
          note_time       TEXT NOT NULL,
          action          TEXT NOT NULL DEFAULT '',
          status          TEXT NOT NULL DEFAULT 'Not-Known'
                          CHECK(status IN ('Super-Bullish','Bullish','Mild-Bullish','Neutral','Medium-Bearish','Bearish','Super-Bearish','Not-Known')),
          sort_order      INTEGER NOT NULL DEFAULT 0,
          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      database.exec(`
        INSERT INTO intraday_note_v2 (id, trading_day_id, outcome_plan_id, custom_plan_id, note_time, action, status, sort_order, created_at, updated_at)
        SELECT n.id, p.trading_day_id, n.outcome_plan_id, NULL, n.note_time, n.action, n.status, n.sort_order, n.created_at, n.updated_at
        FROM intraday_note n
        JOIN outcome_plan op ON n.outcome_plan_id = op.id
        JOIN possibility p ON op.possibility_id = p.id
        WHERE n.outcome_plan_id IS NOT NULL
      `);
      database.exec(`
        INSERT INTO intraday_note_v2 (id, trading_day_id, outcome_plan_id, custom_plan_id, note_time, action, status, sort_order, created_at, updated_at)
        SELECT n.id, cp.trading_day_id, NULL, n.custom_plan_id, n.note_time, n.action, n.status, n.sort_order, n.created_at, n.updated_at
        FROM intraday_note n
        JOIN custom_plan cp ON n.custom_plan_id = cp.id
        WHERE n.custom_plan_id IS NOT NULL
      `);
      database.exec('DROP TABLE intraday_note');
      database.exec('ALTER TABLE intraday_note_v2 RENAME TO intraday_note');
      database.exec('DROP INDEX IF EXISTS idx_intraday_note_outcome_plan');
      database.exec('DROP INDEX IF EXISTS idx_intraday_note_custom_plan');
      database.exec('CREATE INDEX idx_intraday_note_trading_day ON intraday_note(trading_day_id)');
      database.exec('CREATE INDEX idx_intraday_note_outcome_plan ON intraday_note(outcome_plan_id)');
      database.exec('CREATE INDEX idx_intraday_note_custom_plan ON intraday_note(custom_plan_id)');
      database.pragma('foreign_keys = ON');
    }
  } catch (e) {
    console.error('intraday_note trading_day_id migration failed:', e);
    database.pragma('foreign_keys = ON');
  }

  // Migrate outcome_plan: add description column if missing
  try {
    const outcomePlanCols = database.prepare("PRAGMA table_info(outcome_plan)").all();
    if (outcomePlanCols.length > 0 && !outcomePlanCols.some(c => c.name === 'description')) {
      database.exec("ALTER TABLE outcome_plan ADD COLUMN description TEXT");
    }
  } catch (_) { /* table doesn't exist yet */ }

  // Migrate custom_plan: add title column if missing
  try {
    const customPlanCols = database.prepare("PRAGMA table_info(custom_plan)").all();
    if (customPlanCols.length > 0 && !customPlanCols.some(c => c.name === 'title')) {
      database.exec("ALTER TABLE custom_plan ADD COLUMN title TEXT NOT NULL DEFAULT ''");
    }
    if (customPlanCols.length > 0 && !customPlanCols.some(c => c.name === 'bias_tag')) {
      database.exec("ALTER TABLE custom_plan ADD COLUMN bias_tag TEXT");
    }
  } catch (_) { /* table doesn't exist yet */ }

  // Migrate stock_plan: add symbol_id FK pointing to the symbol table
  try {
    const stockPlanCols = database.prepare("PRAGMA table_info(stock_plan)").all();
    if (stockPlanCols.length > 0 && !stockPlanCols.some(c => c.name === 'symbol_id')) {
      // Create a symbol row for any stock_name that doesn't already have one
      const distinctNames = database.prepare("SELECT DISTINCT stock_name FROM stock_plan").all();
      const insertSym = database.prepare("INSERT OR IGNORE INTO symbol (name) VALUES (?)");
      database.transaction(() => {
        for (const { stock_name } of distinctNames) insertSym.run(stock_name);
      })();
      // Add the FK column and backfill
      database.exec("ALTER TABLE stock_plan ADD COLUMN symbol_id INTEGER REFERENCES symbol(id)");
      database.exec(`
        UPDATE stock_plan
        SET symbol_id = (SELECT id FROM symbol WHERE symbol.name = stock_plan.stock_name)
      `);
    }
  } catch (_) { /* stock_plan doesn't exist yet — will be created below with symbol_id */ }

  // Migrate stock_plan: unified migration — expand timeframe CHECK and add bias_tag with Range Bound
  try {
    const spSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='stock_plan'").get();
    const needsMigration = spSql && (!spSql.sql.includes("'4Hrs'") || !spSql.sql.includes('Range Bound'));
    if (needsMigration) {
      const spCols = database.prepare("PRAGMA table_info(stock_plan)").all();
      const hasBiasTag = spCols.some(c => c.name === 'bias_tag');
      database.pragma('foreign_keys = OFF');
      database.exec('DROP TABLE IF EXISTS stock_plan_migrated');
      database.exec(`
        CREATE TABLE stock_plan_migrated (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol_id        INTEGER REFERENCES symbol(id),
          stock_name       TEXT NOT NULL,
          timeframe        TEXT NOT NULL CHECK(timeframe IN ('Monthly', 'Weekly', 'Daily', '4Hrs', '1Hrs')),
          analysis         TEXT,
          entry_price      REAL,
          target_price     REAL,
          stop_loss        REAL,
          chart_path       TEXT,
          execution_status TEXT CHECK(execution_status IN ('Pass', 'Fail', 'Partial', 'Cancelled', 'Waiting') OR execution_status IS NULL),
          bias_tag         TEXT CHECK(bias_tag IN ('Super Bullish','Bullish','Range Bound','Bearish','Super Bearish') OR bias_tag IS NULL),
          created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO stock_plan_migrated
          SELECT id, symbol_id, stock_name, timeframe, analysis, entry_price, target_price, stop_loss, chart_path, execution_status,
                 ${hasBiasTag ? 'bias_tag' : 'NULL'}, created_at, updated_at
          FROM stock_plan;
        DROP TABLE stock_plan;
        ALTER TABLE stock_plan_migrated RENAME TO stock_plan;
        CREATE INDEX IF NOT EXISTS idx_stock_plan_stock_name ON stock_plan(stock_name);
        CREATE INDEX IF NOT EXISTS idx_stock_plan_execution_status ON stock_plan(execution_status);
      `);
      database.pragma('foreign_keys = ON');
    }
  } catch (e) {
    console.error('stock_plan migration failed:', e);
    database.pragma('foreign_keys = ON');
  }

  // Migrate stock_plan: add plan_date column for user-facing plan date
  try {
    const spCols = database.prepare("PRAGMA table_info(stock_plan)").all();
    if (spCols.length > 0 && !spCols.some(c => c.name === 'plan_date')) {
      database.exec("ALTER TABLE stock_plan ADD COLUMN plan_date TEXT");
      database.exec("UPDATE stock_plan SET plan_date = DATE(created_at) WHERE plan_date IS NULL");
    }
  } catch (_) { /* table doesn't exist yet */ }

  // Migrate stock_plan: default NULL execution_status to 'Waiting'
  try {
    const spCols = database.prepare("PRAGMA table_info(stock_plan)").all();
    if (spCols.length > 0) {
      database.exec("UPDATE stock_plan SET execution_status = 'Waiting' WHERE execution_status IS NULL");
    }
  } catch (_) { /* table doesn't exist yet */ }

  // Migrate custom_plan: update bias_tag CHECK to include 'Range Bound' (replaces Neutral)
  try {
    const cpSql = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='custom_plan'").get();
    if (cpSql && !cpSql.sql.includes('Range Bound')) {
      database.pragma('foreign_keys = OFF');
      database.exec('DROP TABLE IF EXISTS custom_plan_bias_new');
      database.exec(`
        CREATE TABLE custom_plan_bias_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
          title           TEXT NOT NULL DEFAULT '',
          trade_plan      TEXT NOT NULL DEFAULT '',
          bias_tag        TEXT CHECK(bias_tag IN ('Super Bullish','Bullish','Range Bound','Bearish','Super Bearish') OR bias_tag IS NULL),
          target          REAL,
          stop_out        REAL,
          verdict_status  TEXT CHECK(verdict_status IN ('Pass', 'Fail', 'Partial', 'Cancelled') OR verdict_status IS NULL),
          verdict_notes   TEXT,
          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO custom_plan_bias_new
          SELECT id, trading_day_id, title, trade_plan,
                 CASE WHEN bias_tag = 'Neutral' THEN NULL ELSE bias_tag END,
                 target, stop_out, verdict_status, verdict_notes, created_at, updated_at
          FROM custom_plan;
        DROP TABLE custom_plan;
        ALTER TABLE custom_plan_bias_new RENAME TO custom_plan;
      `);
      database.pragma('foreign_keys = ON');
    }
  } catch (e) {
    console.error('custom_plan migration failed:', e);
    database.pragma('foreign_keys = ON');
  }

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

    CREATE TABLE IF NOT EXISTS possibility (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
      code            TEXT NOT NULL,
      bias            TEXT NOT NULL,
      has_plan        INTEGER NOT NULL DEFAULT 0,
      UNIQUE(trading_day_id, code)
    );

    CREATE TABLE IF NOT EXISTS outcome_plan (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      possibility_id  INTEGER NOT NULL REFERENCES possibility(id) ON DELETE CASCADE,
      outcome         TEXT NOT NULL,
      target          REAL,
      stop_out        REAL,
      description     TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(possibility_id, outcome)
    );

    CREATE TABLE IF NOT EXISTS screenshot (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      outcome_plan_id INTEGER NOT NULL REFERENCES outcome_plan(id) ON DELETE CASCADE,
      file_path       TEXT NOT NULL,
      label           TEXT,
      added_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verdict (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      trading_day_id   INTEGER NOT NULL UNIQUE REFERENCES trading_day(id) ON DELETE CASCADE,
      possibility_code TEXT NOT NULL,
      outcome          TEXT NOT NULL,
      bias             TEXT NOT NULL,
      had_plan         INTEGER NOT NULL,
      notes            TEXT,
      entered_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verdict_screenshot (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      verdict_id INTEGER NOT NULL REFERENCES verdict(id) ON DELETE CASCADE,
      file_path  TEXT NOT NULL,
      added_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_plan (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol_id        INTEGER REFERENCES symbol(id),
      stock_name       TEXT NOT NULL,
      timeframe        TEXT NOT NULL CHECK(timeframe IN ('Monthly', 'Weekly', 'Daily', '4Hrs', '1Hrs')),
      analysis         TEXT,
      entry_price      REAL,
      target_price     REAL,
      stop_loss        REAL,
      chart_path       TEXT,
      execution_status TEXT CHECK(execution_status IN ('Pass', 'Fail', 'Partial', 'Cancelled', 'Waiting') OR execution_status IS NULL),
      bias_tag         TEXT CHECK(bias_tag IN ('Super Bullish','Bullish','Range Bound','Bearish','Super Bearish') OR bias_tag IS NULL),
      plan_date        TEXT,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_stock_plan_stock_name ON stock_plan(stock_name);
    CREATE INDEX IF NOT EXISTS idx_stock_plan_execution_status ON stock_plan(execution_status);

    CREATE TABLE IF NOT EXISTS custom_plan (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
      title           TEXT NOT NULL DEFAULT '',
      trade_plan      TEXT NOT NULL DEFAULT '',
      bias_tag        TEXT CHECK(bias_tag IN ('Super Bullish','Bullish','Range Bound','Bearish','Super Bearish') OR bias_tag IS NULL),
      target          REAL,
      stop_out        REAL,
      verdict_status  TEXT CHECK(verdict_status IN ('Pass', 'Fail', 'Partial', 'Cancelled') OR verdict_status IS NULL),
      verdict_notes   TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custom_plan_screenshot (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      custom_plan_id  INTEGER NOT NULL REFERENCES custom_plan(id) ON DELETE CASCADE,
      file_path       TEXT NOT NULL,
      added_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS intraday_note (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      trading_day_id  INTEGER NOT NULL REFERENCES trading_day(id) ON DELETE CASCADE,
      outcome_plan_id INTEGER REFERENCES outcome_plan(id) ON DELETE SET NULL,
      custom_plan_id  INTEGER REFERENCES custom_plan(id) ON DELETE SET NULL,
      note_time       TEXT NOT NULL,
      action          TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'Not-Known'
                      CHECK(status IN ('Super-Bullish','Bullish','Mild-Bullish','Neutral','Medium-Bearish','Bearish','Super-Bearish','Not-Known')),
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_intraday_note_trading_day ON intraday_note(trading_day_id);
    CREATE INDEX IF NOT EXISTS idx_intraday_note_outcome_plan ON intraday_note(outcome_plan_id);
    CREATE INDEX IF NOT EXISTS idx_intraday_note_custom_plan ON intraday_note(custom_plan_id);

    CREATE TABLE IF NOT EXISTS intraday_note_screenshot (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      intraday_note_id INTEGER NOT NULL REFERENCES intraday_note(id) ON DELETE CASCADE,
      file_path        TEXT NOT NULL,
      added_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

module.exports = { getDb, initializeDatabase };
