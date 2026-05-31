'use strict';

const fs   = require('fs');
const path = require('path');

const BACKUP_VERSION = '1.0.0';
const MIME_MAP = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };

function readImage(relativePath, userData) {
  if (!relativePath) return null;
  try {
    const fullPath = path.join(userData, relativePath);
    if (!fs.existsSync(fullPath)) return null;
    const ext = path.extname(relativePath).toLowerCase().slice(1);
    return {
      fileName: path.basename(relativePath),
      mimeType: MIME_MAP[ext] || 'image/png',
      data: fs.readFileSync(fullPath).toString('base64'),
    };
  } catch {
    return null;
  }
}

function writeImage(imgObj, subDir, userData) {
  if (!imgObj || !imgObj.data) return null;
  try {
    const dir = path.join(userData, 'images', 'restored', subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${imgObj.fileName || 'image.png'}`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(imgObj.data, 'base64'));
    return path.join('images', 'restored', subDir, name);
  } catch {
    return null;
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportBackup(db, userData) {
  const symbols = db.prepare('SELECT * FROM symbol').all();

  const tradingDays = [];
  for (const sym of symbols) {
    const days = db.prepare('SELECT * FROM trading_day WHERE symbol_id = ?').all(sym.id);
    for (const day of days) {
      // Possibilities + outcome plans (with their intraday notes)
      const possibilities = db.prepare('SELECT * FROM possibility WHERE trading_day_id = ?').all(day.id);
      const possibilitiesData = possibilities.map(p => ({
        code: p.code,
        bias: p.bias,
        has_plan: p.has_plan,
        outcomePlans: db.prepare('SELECT * FROM outcome_plan WHERE possibility_id = ?').all(p.id).map(op => ({
          outcome:     op.outcome,
          target:      op.target,
          stop_out:    op.stop_out,
          description: op.description,
          created_at:  op.created_at,
          updated_at:  op.updated_at,
          screenshots: db.prepare('SELECT * FROM screenshot WHERE outcome_plan_id = ?').all(op.id)
            .map(s => ({ label: s.label, image: readImage(s.file_path, userData) }))
            .filter(s => s.image),
          intradayNotes: db.prepare('SELECT * FROM intraday_note WHERE outcome_plan_id = ? ORDER BY sort_order').all(op.id)
            .map(n => noteToObj(n, db, userData)),
        })),
      }));

      // Verdict
      const verdict = db.prepare('SELECT * FROM verdict WHERE trading_day_id = ?').get(day.id);
      const verdictData = verdict ? {
        possibility_code: verdict.possibility_code,
        outcome:          verdict.outcome,
        bias:             verdict.bias,
        had_plan:         verdict.had_plan,
        notes:            verdict.notes,
        entered_at:       verdict.entered_at,
        updated_at:       verdict.updated_at,
        screenshots: db.prepare('SELECT * FROM verdict_screenshot WHERE verdict_id = ?').all(verdict.id)
          .map(s => ({ image: readImage(s.file_path, userData) }))
          .filter(s => s.image),
      } : null;

      // Custom plans (with their intraday notes)
      const customPlans = db.prepare('SELECT * FROM custom_plan WHERE trading_day_id = ?').all(day.id).map(cp => ({
        title:          cp.title,
        trade_plan:     cp.trade_plan,
        bias_tag:       cp.bias_tag,
        target:         cp.target,
        stop_out:       cp.stop_out,
        verdict_status: cp.verdict_status,
        verdict_notes:  cp.verdict_notes,
        created_at:     cp.created_at,
        updated_at:     cp.updated_at,
        screenshots: db.prepare('SELECT * FROM custom_plan_screenshot WHERE custom_plan_id = ?').all(cp.id)
          .map(s => ({ image: readImage(s.file_path, userData) }))
          .filter(s => s.image),
        intradayNotes: db.prepare('SELECT * FROM intraday_note WHERE custom_plan_id = ? ORDER BY sort_order').all(cp.id)
          .map(n => noteToObj(n, db, userData)),
      }));

      // Standalone intraday notes (no custom_plan_id, no outcome_plan_id)
      const intradayNotes = db.prepare(
        'SELECT * FROM intraday_note WHERE trading_day_id = ? AND custom_plan_id IS NULL AND outcome_plan_id IS NULL ORDER BY sort_order'
      ).all(day.id).map(n => noteToObj(n, db, userData));

      tradingDays.push({
        trade_date:   day.trade_date,
        symbol_name:  sym.name,
        notes:        day.notes,
        created_at:   day.created_at,
        updated_at:   day.updated_at,
        possibilities: possibilitiesData,
        verdict:       verdictData,
        customPlans,
        intradayNotes,
      });
    }
  }

  // Stock plans (join symbol name for portability)
  const stockPlans = db.prepare(
    'SELECT sp.*, s.name AS sym_name FROM stock_plan sp LEFT JOIN symbol s ON sp.symbol_id = s.id'
  ).all().map(sp => ({
    stock_name:       sp.stock_name,
    symbol_name:      sp.sym_name || null,
    timeframe:        sp.timeframe,
    bias_tag:         sp.bias_tag,
    analysis:         sp.analysis,
    entry_price:      sp.entry_price,
    target_price:     sp.target_price,
    stop_loss:        sp.stop_loss,
    execution_status: sp.execution_status,
    plan_date:        sp.plan_date,
    created_at:       sp.created_at,
    updated_at:       sp.updated_at,
    chart:            readImage(sp.chart_path, userData),
  }));

  return {
    version:    BACKUP_VERSION,
    format:     'tpbj-backup',
    exportedAt: new Date().toISOString(),
    data: {
      symbols: symbols.map(s => ({ name: s.name, is_active: s.is_active })),
      tradingDays,
      stockPlans,
    },
  };
}

function noteToObj(n, db, userData) {
  return {
    note_time:  n.note_time,
    action:     n.action,
    status:     n.status,
    sort_order: n.sort_order,
    created_at: n.created_at,
    updated_at: n.updated_at,
    screenshots: db.prepare('SELECT * FROM intraday_note_screenshot WHERE intraday_note_id = ?').all(n.id)
      .map(s => ({ image: readImage(s.file_path, userData) }))
      .filter(s => s.image),
  };
}

// ── Import ────────────────────────────────────────────────────────────────────

function importBackup(db, userData, filePath) {
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (backup.format !== 'tpbj-backup') throw new Error('Not a valid .tpbj backup file.');

  const now   = new Date().toISOString();
  const stats = { tradingDays: 0, possibilities: 0, outcomePlans: 0, verdicts: 0, customPlans: 0, intradayNotes: 0, stockPlans: 0, screenshots: 0 };

  const img = (imgObj, sub) => {
    const rel = writeImage(imgObj, sub, userData);
    if (rel) stats.screenshots++;
    return rel;
  };

  db.transaction(() => {
    // ── Symbols ──
    const symbolMap = {};
    for (const sym of (backup.data.symbols || [])) {
      const row = db.prepare('SELECT id FROM symbol WHERE name = ?').get(sym.name);
      symbolMap[sym.name] = row
        ? row.id
        : db.prepare('INSERT INTO symbol (name, is_active) VALUES (?, ?)').run(sym.name, sym.is_active ?? 1).lastInsertRowid;
    }

    // ── Trading days ──
    for (const day of (backup.data.tradingDays || [])) {
      const symbolId = symbolMap[day.symbol_name];
      if (!symbolId) continue;

      const existingDay = db.prepare('SELECT id FROM trading_day WHERE trade_date = ? AND symbol_id = ?').get(day.trade_date, symbolId);
      const tradingDayId = existingDay
        ? existingDay.id
        : (() => {
            stats.tradingDays++;
            return db.prepare(
              'INSERT INTO trading_day (trade_date, symbol_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
            ).run(day.trade_date, symbolId, day.notes, day.created_at || now, day.updated_at || now).lastInsertRowid;
          })();

      // Possibilities
      for (const poss of (day.possibilities || [])) {
        const existingPoss = db.prepare('SELECT id FROM possibility WHERE trading_day_id = ? AND code = ?').get(tradingDayId, poss.code);
        const possibilityId = existingPoss
          ? existingPoss.id
          : (() => {
              stats.possibilities++;
              return db.prepare(
                'INSERT INTO possibility (trading_day_id, code, bias, has_plan) VALUES (?, ?, ?, ?)'
              ).run(tradingDayId, poss.code, poss.bias, poss.has_plan ?? 0).lastInsertRowid;
            })();

        for (const op of (poss.outcomePlans || [])) {
          const existingOp = db.prepare('SELECT id FROM outcome_plan WHERE possibility_id = ? AND outcome = ?').get(possibilityId, op.outcome);
          const outcomePlanId = existingOp
            ? existingOp.id
            : (() => {
                stats.outcomePlans++;
                const id = db.prepare(
                  'INSERT INTO outcome_plan (possibility_id, outcome, target, stop_out, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
                ).run(possibilityId, op.outcome, op.target, op.stop_out, op.description, op.created_at || now, op.updated_at || now).lastInsertRowid;
                for (const ss of (op.screenshots || [])) {
                  const rel = img(ss.image, day.trade_date);
                  if (rel) db.prepare('INSERT INTO screenshot (outcome_plan_id, file_path, label, added_at) VALUES (?, ?, ?, ?)').run(id, rel, ss.label, now);
                }
                return id;
              })();

          for (const note of (op.intradayNotes || [])) {
            insertNote(db, note, { tradingDayId, outcomePlanId }, img, day.trade_date, now, stats);
          }
        }
      }

      // Verdict
      if (day.verdict && !db.prepare('SELECT id FROM verdict WHERE trading_day_id = ?').get(tradingDayId)) {
        const v = day.verdict;
        const vid = db.prepare(
          'INSERT INTO verdict (trading_day_id, possibility_code, outcome, bias, had_plan, notes, entered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(tradingDayId, v.possibility_code, v.outcome, v.bias, v.had_plan ?? 0, v.notes, v.entered_at || now, v.updated_at || now).lastInsertRowid;
        stats.verdicts++;
        for (const ss of (v.screenshots || [])) {
          const rel = img(ss.image, day.trade_date);
          if (rel) db.prepare('INSERT INTO verdict_screenshot (verdict_id, file_path, added_at) VALUES (?, ?, ?)').run(vid, rel, now);
        }
      }

      // Custom plans
      for (const cp of (day.customPlans || [])) {
        const existingCp = db.prepare(
          'SELECT id FROM custom_plan WHERE trading_day_id = ? AND title = ? AND created_at = ?'
        ).get(tradingDayId, cp.title, cp.created_at);
        const customPlanId = existingCp
          ? existingCp.id
          : (() => {
              stats.customPlans++;
              const id = db.prepare(
                'INSERT INTO custom_plan (trading_day_id, title, trade_plan, bias_tag, target, stop_out, verdict_status, verdict_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).run(tradingDayId, cp.title, cp.trade_plan, cp.bias_tag, cp.target, cp.stop_out, cp.verdict_status, cp.verdict_notes, cp.created_at || now, cp.updated_at || now).lastInsertRowid;
              for (const ss of (cp.screenshots || [])) {
                const rel = img(ss.image, day.trade_date);
                if (rel) db.prepare('INSERT INTO custom_plan_screenshot (custom_plan_id, file_path, added_at) VALUES (?, ?, ?)').run(id, rel, now);
              }
              return id;
            })();

        for (const note of (cp.intradayNotes || [])) {
          insertNote(db, note, { tradingDayId, customPlanId }, img, day.trade_date, now, stats);
        }
      }

      // Standalone intraday notes
      for (const note of (day.intradayNotes || [])) {
        insertNote(db, note, { tradingDayId }, img, day.trade_date, now, stats);
      }
    }

    // ── Stock plans ──
    for (const sp of (backup.data.stockPlans || [])) {
      const exists = db.prepare('SELECT id FROM stock_plan WHERE stock_name = ? AND timeframe = ? AND created_at = ?').get(sp.stock_name, sp.timeframe, sp.created_at);
      if (!exists) {
        const symbolId = sp.symbol_name ? (symbolMap[sp.symbol_name] || null) : null;
        const chartPath = sp.chart ? img(sp.chart, 'swing') : null;
        db.prepare(
          'INSERT INTO stock_plan (stock_name, symbol_id, timeframe, bias_tag, analysis, entry_price, target_price, stop_loss, chart_path, execution_status, plan_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(sp.stock_name, symbolId, sp.timeframe, sp.bias_tag || null, sp.analysis, sp.entry_price, sp.target_price, sp.stop_loss, chartPath, sp.execution_status || 'Waiting', sp.plan_date || null, sp.created_at || now, sp.updated_at || now);
        stats.stockPlans++;
      }
    }
  })();

  return stats;
}

function insertNote(db, note, ids, img, tradeDate, now, stats) {
  const existing = db.prepare(
    'SELECT id FROM intraday_note WHERE trading_day_id = ? AND outcome_plan_id IS ? AND custom_plan_id IS ? AND created_at = ?'
  ).get(ids.tradingDayId, ids.outcomePlanId || null, ids.customPlanId || null, note.created_at);
  if (existing) return;

  const id = db.prepare(
    'INSERT INTO intraday_note (trading_day_id, outcome_plan_id, custom_plan_id, note_time, action, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    ids.tradingDayId, ids.outcomePlanId || null, ids.customPlanId || null,
    note.note_time, note.action, note.status || 'Not-Known', note.sort_order ?? 0,
    note.created_at || now, note.updated_at || now
  ).lastInsertRowid;
  stats.intradayNotes++;
  for (const ss of (note.screenshots || [])) {
    const rel = img(ss.image, tradeDate);
    if (rel) db.prepare('INSERT INTO intraday_note_screenshot (intraday_note_id, file_path, added_at) VALUES (?, ?, ?)').run(id, rel, now);
  }
}

module.exports = { exportBackup, importBackup, BACKUP_VERSION };
