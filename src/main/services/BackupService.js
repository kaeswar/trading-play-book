'use strict';

const fs   = require('fs');
const path = require('path');

const BACKUP_VERSION = '4.0.0';
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

  // Plan groups
  const planGroups = db.prepare('SELECT * FROM plan_group').all().map(g => ({
    name: g.name, description: g.description, is_system: g.is_system,
    created_at: g.created_at, updated_at: g.updated_at,
  }));

  // Plan templates — export ALL (system + user), marked by system_code for idempotent re-import
  const planTemplates = db.prepare(`
    SELECT t.*, g.name AS group_name
    FROM plan_template t LEFT JOIN plan_group g ON t.group_id = g.id
  `).all().map(t => ({
    trade_type:           t.trade_type,
    group_name:           t.group_name || null,
    name:                 t.name,
    description:          t.description,
    bias:                 t.bias,
    behavior_tag:         t.behavior_tag,
    system_code:          t.system_code,
    is_system:            t.is_system,
    is_archived:          t.is_archived,
    usage_count:          t.usage_count,
    last_used_at:         t.last_used_at,
    position_sizing_note: t.position_sizing_note,
    tags:                 t.tags,
    created_at:           t.created_at,
    updated_at:           t.updated_at,
  }));

  // Trading days with day_plans, screenshots, and intraday notes
  const tradingDays = [];
  for (const sym of symbols) {
    const days = db.prepare('SELECT * FROM trading_day WHERE symbol_id = ?').all(sym.id);
    for (const day of days) {
      const dayPlans = db.prepare(
        'SELECT * FROM day_plan WHERE trading_day_id = ? ORDER BY sort_order, id'
      ).all(day.id).map(dp => ({
        template_system_code: db.prepare('SELECT system_code FROM plan_template WHERE id = ?').get(dp.template_id)?.system_code || null,
        template_name:        db.prepare('SELECT name FROM plan_template WHERE id = ?').get(dp.template_id)?.name || null,
        name:             dp.name,
        description:      dp.description,
        group_name:       dp.group_name,
        bias:             dp.bias,
        behavior_tag:     dp.behavior_tag,
        target:           dp.target,
        stop_out:         dp.stop_out,
        execution_status: dp.execution_status,
        outcome_notes:    dp.outcome_notes,
        sort_order:       dp.sort_order,
        created_at:       dp.created_at,
        updated_at:       dp.updated_at,
        screenshots: db.prepare('SELECT * FROM day_plan_screenshot WHERE day_plan_id = ?').all(dp.id)
          .map(s => ({ kind: s.kind || 'setup', image: readImage(s.file_path, userData) }))
          .filter(s => s.image),
        intradayNotes: db.prepare(
          'SELECT * FROM intraday_note WHERE day_plan_id = ? ORDER BY sort_order, note_time'
        ).all(dp.id).map(n => ({
          note_time:  n.note_time,
          action:     n.action,
          status:     n.status,
          sort_order: n.sort_order,
          created_at: n.created_at,
          updated_at: n.updated_at,
          screenshots: db.prepare('SELECT * FROM intraday_note_screenshot WHERE intraday_note_id = ?').all(n.id)
            .map(s => ({ image: readImage(s.file_path, userData) }))
            .filter(s => s.image),
        })),
      }));

      tradingDays.push({
        trade_date:  day.trade_date,
        symbol_name: sym.name,
        notes:       day.notes,
        created_at:  day.created_at,
        updated_at:  day.updated_at,
        dayPlans,
      });
    }
  }

  // Swing plans (template-instance, replaces old stock_plan)
  const swingPlans = db.prepare(`
    SELECT sp.*, s.name AS sym_name,
           pt.system_code AS tpl_system_code,
           pt.name AS tpl_name
    FROM swing_plan sp
    LEFT JOIN symbol s ON sp.symbol_id = s.id
    LEFT JOIN plan_template pt ON sp.template_id = pt.id
  `).all().map(sp => ({
    template_system_code: sp.tpl_system_code || null,
    template_name:        sp.tpl_name || null,
    symbol_name:          sp.sym_name || null,
    plan_date:            sp.plan_date,
    name:                 sp.name,
    description:          sp.description,
    group_name:           sp.group_name,
    bias:                 sp.bias,
    behavior_tag:         sp.behavior_tag,
    timeframe:            sp.timeframe,
    entry_price:          sp.entry_price,
    target_price:         sp.target_price,
    stop_loss:            sp.stop_loss,
    analysis:             sp.analysis,
    execution_status:     sp.execution_status,
    outcome_notes:        sp.outcome_notes,
    created_at:           sp.created_at,
    updated_at:           sp.updated_at,
    screenshots: db.prepare('SELECT * FROM swing_plan_screenshot WHERE swing_plan_id = ?').all(sp.id)
      .map(s => ({ kind: s.kind || 'setup', image: readImage(s.file_path, userData) }))
      .filter(s => s.image),
  }));

  return {
    version:    BACKUP_VERSION,
    format:     'tpbj-backup',
    exportedAt: new Date().toISOString(),
    data: {
      symbols: symbols.map(s => ({ name: s.name, is_active: s.is_active })),
      planGroups,
      planTemplates,
      tradingDays,
      swingPlans,
    },
  };
}

// ── Import ────────────────────────────────────────────────────────────────────

function importBackup(db, userData, filePath) {
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (backup.format !== 'tpbj-backup') throw new Error('Not a valid .tpbj backup file.');

  const now   = new Date().toISOString();
  const stats = {
    tradingDays: 0, dayPlans: 0,
    planGroups: 0, planTemplates: 0,
    intradayNotes: 0, swingPlans: 0, screenshots: 0,
  };

  const img = (imgObj, sub) => {
    const rel = writeImage(imgObj, sub, userData);
    if (rel) stats.screenshots++;
    return rel;
  };

  db.transaction(() => {
    // Symbols
    const symbolMap = {};
    for (const sym of (backup.data.symbols || [])) {
      const row = db.prepare('SELECT id FROM symbol WHERE name = ?').get(sym.name);
      symbolMap[sym.name] = row
        ? row.id
        : db.prepare('INSERT INTO symbol (name, is_active) VALUES (?, ?)').run(sym.name, sym.is_active ?? 1).lastInsertRowid;
    }

    // Plan groups
    const groupMap = {};
    for (const g of (backup.data.planGroups || [])) {
      const existing = db.prepare('SELECT id FROM plan_group WHERE name = ?').get(g.name);
      if (existing) {
        groupMap[g.name] = existing.id;
      } else {
        stats.planGroups++;
        groupMap[g.name] = db.prepare(
          'INSERT INTO plan_group (name, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).run(g.name, g.description || null, g.is_system ? 1 : 0, g.created_at || now, g.updated_at || now).lastInsertRowid;
      }
    }

    // Plan templates — dedup by system_code (system) or (name + bias + created_at) for user
    const templateMap = {};
    for (const t of (backup.data.planTemplates || [])) {
      let existing = null;
      if (t.system_code) {
        existing = db.prepare('SELECT id FROM plan_template WHERE system_code = ?').get(t.system_code);
      } else {
        existing = db.prepare(
          'SELECT id FROM plan_template WHERE name = ? AND bias = ? AND created_at = ?'
        ).get(t.name, t.bias, t.created_at);
      }
      let id;
      if (existing) {
        id = existing.id;
      } else {
        stats.planTemplates++;
        const groupId = t.group_name ? (groupMap[t.group_name] || null) : null;
        id = db.prepare(`
          INSERT INTO plan_template
            (trade_type, group_id, name, description,
             bias, behavior_tag,
             system_code, is_system, is_archived,
             usage_count, last_used_at, position_sizing_note, tags, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          t.trade_type || 'Intraday', groupId, t.name, t.description || null,
          t.bias, t.behavior_tag || null,
          t.system_code || null, t.is_system ? 1 : 0, t.is_archived ? 1 : 0,
          t.usage_count ?? 0, t.last_used_at || null, t.position_sizing_note || null, t.tags || null,
          t.created_at || now, t.updated_at || now
        ).lastInsertRowid;
      }
      if (t.system_code) templateMap[t.system_code] = id;
      templateMap[t.name] = id;
    }

    // Trading days + day plans
    for (const day of (backup.data.tradingDays || [])) {
      const symbolId = symbolMap[day.symbol_name];
      if (!symbolId) continue;

      const existingDay = db.prepare(
        'SELECT id FROM trading_day WHERE trade_date = ? AND symbol_id = ?'
      ).get(day.trade_date, symbolId);
      const tradingDayId = existingDay
        ? existingDay.id
        : (() => {
            stats.tradingDays++;
            return db.prepare(
              'INSERT INTO trading_day (trade_date, symbol_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
            ).run(day.trade_date, symbolId, day.notes, day.created_at || now, day.updated_at || now).lastInsertRowid;
          })();

      for (const dp of (day.dayPlans || [])) {
        const existing = db.prepare(
          'SELECT id FROM day_plan WHERE trading_day_id = ? AND name = ? AND created_at = ?'
        ).get(tradingDayId, dp.name, dp.created_at);
        if (existing) continue;

        const templateId = (dp.template_system_code && templateMap[dp.template_system_code])
          || (dp.template_name && templateMap[dp.template_name])
          || null;

        const dpId = db.prepare(`
          INSERT INTO day_plan
            (trading_day_id, template_id, name, description, group_name,
             bias, behavior_tag, target, stop_out,
             execution_status, outcome_notes, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          tradingDayId, templateId, dp.name, dp.description || null, dp.group_name || null,
          dp.bias, dp.behavior_tag || null,
          dp.target ?? null, dp.stop_out ?? null,
          dp.execution_status || 'Waiting', dp.outcome_notes || null,
          dp.sort_order ?? 0, dp.created_at || now, dp.updated_at || now
        ).lastInsertRowid;
        stats.dayPlans++;

        for (const ss of (dp.screenshots || [])) {
          const rel = img(ss.image, day.trade_date);
          if (rel) db.prepare(
            'INSERT INTO day_plan_screenshot (day_plan_id, kind, file_path, added_at) VALUES (?, ?, ?, ?)'
          ).run(dpId, ss.kind || 'setup', rel, now);
        }

        for (const note of (dp.intradayNotes || [])) {
          const noteId = db.prepare(
            'INSERT INTO intraday_note (trading_day_id, day_plan_id, note_time, action, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(
            tradingDayId, dpId, note.note_time, note.action || '',
            note.status || 'Not-Known', note.sort_order ?? 0,
            note.created_at || now, note.updated_at || now
          ).lastInsertRowid;
          stats.intradayNotes++;
          for (const ss of (note.screenshots || [])) {
            const rel = img(ss.image, day.trade_date);
            if (rel) db.prepare(
              'INSERT INTO intraday_note_screenshot (intraday_note_id, file_path, added_at) VALUES (?, ?, ?)'
            ).run(noteId, rel, now);
          }
        }
      }
    }

    // Swing plans (v4+ backups). Older backups had stockPlans — silently ignored since table is gone.
    for (const sp of (backup.data.swingPlans || [])) {
      const symbolId = sp.symbol_name ? (symbolMap[sp.symbol_name] || null) : null;
      if (!symbolId) continue;

      const exists = db.prepare(
        'SELECT id FROM swing_plan WHERE symbol_id = ? AND name = ? AND plan_date = ? AND created_at = ?'
      ).get(symbolId, sp.name, sp.plan_date, sp.created_at);
      if (exists) continue;

      const templateId = (sp.template_system_code && templateMap[sp.template_system_code])
        || (sp.template_name && templateMap[sp.template_name])
        || null;

      const spId = db.prepare(`
        INSERT INTO swing_plan
          (template_id, symbol_id, plan_date,
           name, description, group_name, bias, behavior_tag,
           timeframe, entry_price, target_price, stop_loss, analysis,
           execution_status, outcome_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        templateId, symbolId, sp.plan_date,
        sp.name, sp.description || null, sp.group_name || null, sp.bias, sp.behavior_tag || null,
        sp.timeframe || 'Daily',
        sp.entry_price ?? null, sp.target_price ?? null, sp.stop_loss ?? null, sp.analysis || null,
        sp.execution_status || 'Waiting', sp.outcome_notes || null,
        sp.created_at || now, sp.updated_at || now
      ).lastInsertRowid;
      stats.swingPlans++;

      for (const ss of (sp.screenshots || [])) {
        const rel = img(ss.image, 'swing');
        if (rel) db.prepare(
          'INSERT INTO swing_plan_screenshot (swing_plan_id, kind, file_path, added_at) VALUES (?, ?, ?, ?)'
        ).run(spId, ss.kind || 'setup', rel, now);
      }
    }
  })();

  return stats;
}

module.exports = { exportBackup, importBackup, BACKUP_VERSION };
