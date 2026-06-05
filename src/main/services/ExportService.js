const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserWindow, app } = require('electron');

const tradingDayRepo = require('../db/tradingDayRepo');
const dayPlanRepo = require('../db/dayPlanRepo');
const dayPlanScreenshotRepo = require('../db/dayPlanScreenshotRepo');
const swingPlanRepo = require('../db/swingPlanRepo');
const swingPlanScreenshotRepo = require('../db/swingPlanScreenshotRepo');

const PDF_FOOTER = `<div style="width:100%;font-size:8px;color:#666;padding:0 0.4in;display:flex;justify-content:space-between;align-items:center;font-family:Arial,sans-serif">
  <span>Donationware &nbsp;·&nbsp; Please donate if it is useful &nbsp;·&nbsp; UPI ID mentioned in the About window &nbsp;·&nbsp; Author: kaeswar &nbsp;·&nbsp; kaeswar@gmail.com</span>
  <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;

const EXEC_STYLE = {
  Successful:    { bg: '#d1fae5', col: '#065f46' },
  Failed:        { bg: '#fee2e2', col: '#991b1b' },
  'Cost-to-Cost':{ bg: '#fef3c7', col: '#92400e' },
  UnPlanned:     { bg: '#ede9fe', col: '#5b21b6' },
  Cancelled:     { bg: '#f3f4f6', col: '#4b5563' },
  Waiting:       { bg: '#fef3c7', col: '#92400e' },
};

function logoDataUrl() {
  try {
    const iconPath = path.join(__dirname, '../../../assets/icon.png');
    if (!fs.existsSync(iconPath)) return null;
    return `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`;
  } catch { return null; }
}

function imgToBase64(relativePath) {
  try {
    const fullPath = path.join(app.getPath('userData'), relativePath);
    if (!fs.existsSync(fullPath)) return null;
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase().replace('.', '');
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' }[ext] || 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch { return null; }
}

function csvEsc(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ── Data aggregation ──────────────────────────────────────────────────────────

function buildExportData({ symbolIds, dateFrom, dateTo, forPdf = false }) {
  const days = tradingDayRepo.getForExport({ symbolIds, dateFrom, dateTo });
  const bySymbol = {};

  for (const day of days) {
    const dayPlans = dayPlanRepo.getByTradingDay(day.id);
    if (dayPlans.length === 0) continue; // day must have ≥1 plan now anyway

    const enrichedPlans = dayPlans.map((dp) => {
      let setupShots = [];
      let outcomeShots = [];
      if (forPdf) {
        const all = dayPlanScreenshotRepo.getByDayPlan(dp.id)
          .map(ss => ({ ...ss, dataUrl: imgToBase64(ss.file_path) }))
          .filter(ss => ss.dataUrl);
        setupShots   = all.filter(s => (s.kind || 'setup') === 'setup');
        outcomeShots = all.filter(s => s.kind === 'outcome');
      }
      return { ...dp, setupShots, outcomeShots };
    });

    if (!bySymbol[day.symbol_name]) bySymbol[day.symbol_name] = [];
    bySymbol[day.symbol_name].push({
      ...day,
      dayPlans: enrichedPlans,
    });
  }

  const allDays = Object.values(bySymbol).flat();
  const totalDays = allDays.length;
  const preparedDays = allDays.filter((d) => d.dayPlans.length > 0).length;
  let successfulPlans = 0, failedPlans = 0, totalPlans = 0;
  for (const d of allDays) {
    for (const dp of d.dayPlans) {
      totalPlans++;
      if (dp.execution_status === 'Successful') successfulPlans++;
      else if (dp.execution_status === 'Failed') failedPlans++;
    }
  }

  return {
    bySymbol,
    summary: {
      totalDays,
      preparedDays,
      prepRate: totalDays > 0 ? Math.round((preparedDays / totalDays) * 100) : 0,
      totalPlans,
      successfulPlans,
      failedPlans,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      symbolNames: Object.keys(bySymbol),
    },
  };
}

// ── CSV export ────────────────────────────────────────────────────────────────
// Lean tabular layout: one row per day_plan, no summary header. Eight columns optimized
// for Excel filtering across many days (filter by plan name, group, bias, status, etc.).

function exportToCSV(exportData, filePath) {
  const { bySymbol } = exportData;
  const lines = [];

  const headers = ['Date', 'Symbol', 'Plan Name', 'Group', 'Bias', 'Target', 'Stop Out', 'Execution Status'];
  lines.push(headers.map(csvEsc).join(','));

  // Flatten + sort by date ASC so Excel sees chronological rows
  const rows = [];
  for (const [symbolName, days] of Object.entries(bySymbol)) {
    for (const day of days) {
      for (const dp of day.dayPlans) {
        rows.push({
          date:    day.trade_date,
          symbol:  symbolName,
          name:    dp.name,
          group:   dp.group_name || '',
          bias:    dp.bias,
          target:  dp.target ?? '',
          stopOut: dp.stop_out ?? '',
          status:  dp.execution_status || 'Waiting',
        });
      }
    }
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.symbol.localeCompare(b.symbol)));

  for (const r of rows) {
    lines.push([r.date, r.symbol, r.name, r.group, r.bias, r.target, r.stopOut, r.status].map(csvEsc).join(','));
  }

  fs.writeFileSync(filePath, '﻿' + lines.join('\r\n'), 'utf8');
}

// ── PDF export ────────────────────────────────────────────────────────────────

function buildPdfHtml(exportData) {
  const { bySymbol, summary } = exportData;
  const logo = logoDataUrl();
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const execBadge = (status) => {
    const s = status || 'Pending';
    const { bg, col } = EXEC_STYLE[s] || EXEC_STYLE.Pending;
    return `<span style="background:${bg};color:${col};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:bold">${esc(s)}</span>`;
  };

  const screenshotsHtml = (shots) => {
    if (!shots || shots.length === 0) return '';
    return `<div style="margin-top:6px">${
      shots.map((ss) => `<div style="display:inline-block;margin:4px"><img src="${ss.dataUrl}" style="max-width:220px;max-height:160px;border-radius:4px;border:1px solid #e0e0e0" /></div>`).join('')
    }</div>`;
  };

  let body = '';
  const biasColor = (b) => b && b.includes('Bullish') ? '#1d4ed8' : b && b.includes('Bearish') ? '#dc2626' : '#6b7280';

  for (const [symbolName, days] of Object.entries(bySymbol)) {
    body += `
      <div style="margin-bottom:32px">
        <div style="font-size:18px;font-weight:bold;color:#4f46e5;border-left:4px solid #4f46e5;padding-left:10px;margin-bottom:16px">
          ${esc(symbolName)}
        </div>`;

    for (const day of days) {
      const succCount = day.dayPlans.filter(p => p.execution_status === 'Successful').length;
      const failCount = day.dayPlans.filter(p => p.execution_status === 'Failed').length;

      body += `
        <div style="border:1px solid #e0e0e0;border-radius:8px;margin-bottom:20px;overflow:hidden;page-break-inside:avoid">
          <div style="background:#4f46e5;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <span style="font-size:15px;font-weight:bold">${esc(day.trade_date)}</span>
              ${day.notes ? `<span style="font-size:11px;opacity:0.8;margin-left:12px">${esc(day.notes)}</span>` : ''}
            </div>
            <div style="font-size:11px">
              ${day.dayPlans.length} plans · ${succCount} successful · ${failCount} failed
            </div>
          </div>
          <div style="padding:14px">`;

      if (day.dayPlans.length === 0) {
        body += `<div style="color:#999;font-size:12px">No plans created for this day.</div>`;
      } else {
        for (const dp of day.dayPlans) {
          body += `
            <div style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:10px;padding:10px;page-break-inside:avoid">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div>
                  <span style="font-weight:bold;font-size:13px">${esc(dp.name)}</span>
                  ${dp.group_name ? `<span style="font-size:10px;color:#888;margin-left:8px">${esc(dp.group_name)}</span>` : ''}
                  <span style="color:${biasColor(dp.bias)};font-weight:bold;font-size:11px;margin-left:8px">${esc(dp.bias)}</span>
                  ${dp.behavior_tag && dp.behavior_tag !== dp.bias ? `<span style="font-size:10px;color:#666;margin-left:6px">(${esc(dp.behavior_tag)})</span>` : ''}
                </div>
                <div>${execBadge(dp.execution_status)}</div>
              </div>
              ${dp.description ? `<div style="font-size:11px;color:#555;margin-bottom:6px">${esc(dp.description)}</div>` : ''}
              <div style="font-size:11px;color:#444;margin-bottom:4px">
                <strong>Target:</strong> ${dp.target ?? '—'} &nbsp;·&nbsp; <strong>Stop:</strong> ${dp.stop_out ?? '—'}
              </div>
              ${dp.setupShots && dp.setupShots.length > 0 ? `<div style="margin-top:6px"><div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Setup</div>${screenshotsHtml(dp.setupShots)}</div>` : ''}
              ${dp.outcome_notes ? `<div style="font-size:11px;color:#555;margin-top:6px;padding-top:6px;border-top:1px dashed #ddd"><strong>Notes:</strong> ${esc(dp.outcome_notes)}</div>` : ''}
              ${dp.outcomeShots && dp.outcomeShots.length > 0 ? `<div style="margin-top:6px"><div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Outcome</div>${screenshotsHtml(dp.outcomeShots)}</div>` : ''}
            </div>`;
        }
      }

      body += `</div></div>`;
    }
    body += `</div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a2e; padding: 24px; }
    @media print { div { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #4f46e5">
    <div style="display:inline-flex;align-items:center;gap:12px;justify-content:center">
      ${logo ? `<img src="${logo}" style="width:48px;height:48px;border-radius:10px" />` : ''}
      <div style="text-align:left">
        <div style="font-size:22px;font-weight:bold;color:#4f46e5">Trading Play Book</div>
        <div style="font-size:10px;color:#818cf8;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-top:4px">Export Report</div>
      </div>
    </div>
  </div>
  <div style="background:#f5f3ff;border-radius:10px;padding:16px;margin-bottom:28px">
    <div style="font-size:12px;font-weight:bold;color:#4f46e5;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Summary</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;text-align:center">
      ${[
        ['Total Days', summary.totalDays],
        ['Prepared', `${summary.preparedDays} (${summary.prepRate}%)`],
        ['Total Plans', summary.totalPlans],
        ['Successful', summary.successfulPlans],
        ['Failed', summary.failedPlans],
      ].map(([label, value]) => `
        <div>
          <div style="font-size:20px;font-weight:bold;color:#4f46e5">${esc(String(value))}</div>
          <div style="font-size:10px;color:#666;text-transform:uppercase;margin-top:2px">${label}</div>
        </div>`).join('')}
    </div>
    ${summary.dateFrom || summary.dateTo ? `
    <div style="text-align:center;font-size:11px;color:#666;margin-top:10px">
      ${summary.dateFrom || 'Start'} → ${summary.dateTo || 'Today'}
    </div>` : ''}
  </div>
  ${body}
</body>
</html>`;
}

async function exportToPDF(exportData, filePath) {
  const html = buildPdfHtml(exportData);
  const tmpPath = path.join(os.tmpdir(), `tpb_export_${Date.now()}.html`);
  fs.writeFileSync(tmpPath, html, 'utf8');

  const win = new BrowserWindow({
    show: false, width: 1200, height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await new Promise((resolve, reject) => {
    win.webContents.once('did-finish-load', resolve);
    win.webContents.once('did-fail-load', (_, __, ___, errDesc) => reject(new Error(errDesc)));
    win.loadFile(tmpPath);
  });
  await new Promise((r) => setTimeout(r, 400));

  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true, pageSize: 'A4',
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: PDF_FOOTER,
    margins: { top: 0.4, bottom: 0.6, left: 0.4, right: 0.4 },
  });

  win.destroy();
  try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  fs.writeFileSync(filePath, pdfBuffer);
}

// ── Swing data (templatized swing_plan + screenshots) ─────────────────────────
// CSV mirrors the intraday CSV style: lean tabular layout, no summary header.
// PDF still rich — per-plan card with setup + outcome screenshot panels.

function buildSwingExportData({ symbolIds, executionStatus, dateFrom, dateTo, forPdf = false }) {
  let plans = swingPlanRepo.search({
    executionStatus: executionStatus || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo || undefined,
  });

  // Filter by symbol IDs if requested (Gallery passes ID list)
  if (Array.isArray(symbolIds) && symbolIds.length > 0) {
    plans = plans.filter((p) => symbolIds.includes(p.symbol_id));
  }

  if (forPdf) {
    plans = plans.map((p) => {
      const all = swingPlanScreenshotRepo.getBySwingPlan(p.id)
        .map(ss => ({ ...ss, dataUrl: imgToBase64(ss.file_path) }))
        .filter(ss => ss.dataUrl);
      return {
        ...p,
        setupShots:   all.filter(s => (s.kind || 'setup') === 'setup'),
        outcomeShots: all.filter(s => s.kind === 'outcome'),
      };
    });
  }

  const byStatus = {};
  for (const p of plans) {
    const s = p.execution_status || 'Waiting';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  return {
    plans,
    summary: {
      total: plans.length, byStatus,
      symbolNames: [...new Set(plans.map((p) => p.symbol_name))].sort(),
      dateFrom: dateFrom || null, dateTo: dateTo || null,
    },
  };
}

function exportSwingToCSV(swingData, filePath) {
  const { plans } = swingData;
  const lines = [];

  const headers = [
    'Plan Date', 'Symbol', 'Plan Name', 'Group', 'Timeframe',
    'Bias', 'Entry', 'Target', 'Stop', 'Execution Status',
  ];
  lines.push(headers.map(csvEsc).join(','));

  // Sort by plan_date ASC, then symbol
  const sorted = [...plans].sort((a, b) => {
    if (a.plan_date !== b.plan_date) return a.plan_date < b.plan_date ? -1 : 1;
    return (a.symbol_name || '').localeCompare(b.symbol_name || '');
  });

  for (const p of sorted) {
    lines.push([
      p.plan_date, p.symbol_name, p.name, p.group_name || '', p.timeframe,
      p.bias,
      p.entry_price ?? '', p.target_price ?? '', p.stop_loss ?? '',
      p.execution_status || 'Waiting',
    ].map(csvEsc).join(','));
  }

  fs.writeFileSync(filePath, '﻿' + lines.join('\r\n'), 'utf8');
}

function buildSwingPdfHtml(swingData) {
  const { plans, summary } = swingData;
  const logo = logoDataUrl();
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const statusBadge = (raw) => {
    const s = raw || 'Waiting';
    const { bg, col } = EXEC_STYLE[s] || EXEC_STYLE.Waiting;
    return `<span style="background:${bg};color:${col};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:bold">${esc(s)}</span>`;
  };

  const biasColor = (b) => b && b.includes('Bullish') ? '#1d4ed8' : b && b.includes('Bearish') ? '#dc2626' : '#6b7280';

  const screenshotsHtml = (shots, label) => {
    if (!shots || shots.length === 0) return '';
    const imgs = shots.map((ss) =>
      `<div style="display:inline-block;margin:4px"><img src="${ss.dataUrl}" style="max-width:220px;max-height:160px;border-radius:4px;border:1px solid #e0e0e0" /></div>`
    ).join('');
    return `<div style="margin-top:8px"><div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${label}</div>${imgs}</div>`;
  };

  let body = '';
  for (const p of plans) {
    body += `
      <div style="border:1px solid #e0e0e0;border-radius:8px;margin-bottom:20px;overflow:hidden;page-break-inside:avoid">
        <div style="background:#4f46e5;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:15px;font-weight:bold">${esc(p.symbol_name)}</span>
            <span style="font-size:11px;opacity:0.85;margin-left:10px">${esc(p.name)}</span>
            ${p.group_name ? `<span style="font-size:10px;opacity:0.7;margin-left:8px">${esc(p.group_name)}</span>` : ''}
          </div>
          <div>${statusBadge(p.execution_status)}</div>
        </div>
        <div style="padding:14px">
          <div style="font-size:11px;color:#555;margin-bottom:6px">
            <strong>Plan Date:</strong> ${esc(p.plan_date)}
            &nbsp;·&nbsp; <strong>Timeframe:</strong> ${esc(p.timeframe)}
            &nbsp;·&nbsp; <span style="color:${biasColor(p.bias)};font-weight:bold">${esc(p.bias)}</span>
            ${p.behavior_tag && p.behavior_tag !== p.bias ? `<span style="font-size:10px;color:#666;margin-left:6px">(${esc(p.behavior_tag)})</span>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;text-align:center;font-size:11px">
            ${[['Entry', p.entry_price ?? '—'], ['Target', p.target_price ?? '—'], ['Stop Loss', p.stop_loss ?? '—']]
              .map(([label, value]) => `
              <div style="background:#f5f3ff;border-radius:6px;padding:8px">
                <div style="font-size:14px;font-weight:bold;color:#4f46e5">${esc(String(value))}</div>
                <div style="font-size:10px;color:#666;text-transform:uppercase;margin-top:2px">${label}</div>
              </div>`).join('')}
          </div>
          ${p.analysis ? `
          <div style="background:#f9fafb;border-radius:6px;padding:10px;font-size:11px;color:#444;margin-bottom:8px;line-height:1.5">
            <strong>Analysis:</strong> ${esc(p.analysis)}
          </div>` : ''}
          ${screenshotsHtml(p.setupShots, 'Setup')}
          ${p.outcome_notes ? `
          <div style="background:#f9fafb;border-radius:6px;padding:10px;font-size:11px;color:#444;margin-top:8px;margin-bottom:8px;line-height:1.5">
            <strong>Outcome Notes:</strong> ${esc(p.outcome_notes)}
          </div>` : ''}
          ${screenshotsHtml(p.outcomeShots, 'Outcome')}
        </div>
      </div>`;
  }

  const statusEntries = Object.entries(summary.byStatus);
  const gridCols = Math.min(statusEntries.length + 1, 5);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a2e; padding: 24px; }
    @media print { div { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #4f46e5">
    <div style="display:inline-flex;align-items:center;gap:12px;justify-content:center">
      ${logo ? `<img src="${logo}" style="width:48px;height:48px;border-radius:10px" />` : ''}
      <div style="text-align:left">
        <div style="font-size:22px;font-weight:bold;color:#4f46e5">Trading Play Book</div>
        <div style="font-size:10px;color:#818cf8;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-top:4px">Swing Plans Export</div>
      </div>
    </div>
  </div>
  <div style="background:#f5f3ff;border-radius:10px;padding:16px;margin-bottom:28px">
    <div style="font-size:12px;font-weight:bold;color:#4f46e5;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Summary</div>
    <div style="display:grid;grid-template-columns:repeat(${gridCols},1fr);gap:10px;text-align:center">
      <div>
        <div style="font-size:20px;font-weight:bold;color:#4f46e5">${summary.total}</div>
        <div style="font-size:10px;color:#666;text-transform:uppercase;margin-top:2px">Total Plans</div>
      </div>
      ${statusEntries.map(([s, count]) => `
      <div>
        <div style="font-size:20px;font-weight:bold;color:#4f46e5">${count}</div>
        <div style="font-size:10px;color:#666;text-transform:uppercase;margin-top:2px">${esc(s)}</div>
      </div>`).join('')}
    </div>
    ${summary.dateFrom || summary.dateTo ? `
    <div style="text-align:center;font-size:11px;color:#666;margin-top:10px">
      ${summary.dateFrom || 'Start'} → ${summary.dateTo || 'Today'}
    </div>` : ''}
  </div>
  ${body}
</body>
</html>`;
}

async function exportSwingToPDF(swingData, filePath) {
  const html = buildSwingPdfHtml(swingData);
  const tmpPath = path.join(os.tmpdir(), `tpb_swing_export_${Date.now()}.html`);
  fs.writeFileSync(tmpPath, html, 'utf8');

  const win = new BrowserWindow({
    show: false, width: 1200, height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await new Promise((resolve, reject) => {
    win.webContents.once('did-finish-load', resolve);
    win.webContents.once('did-fail-load', (_, __, ___, errDesc) => reject(new Error(errDesc)));
    win.loadFile(tmpPath);
  });
  await new Promise((r) => setTimeout(r, 400));

  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true, pageSize: 'A4',
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: PDF_FOOTER,
    margins: { top: 0.4, bottom: 0.6, left: 0.4, right: 0.4 },
  });

  win.destroy();
  try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  fs.writeFileSync(filePath, pdfBuffer);
}

// ── Plan-wise export (one template × N symbols → CSV) ─────────────────────────
// Columns: Date, Symbol, Bias, Target, Stop, Execution Status
// File name supplied by the caller (sanitised plan name).

function buildPlanWiseExportData({ templateId, symbolIds }) {
  // Swing plans
  let swingPlans = swingPlanRepo.search({ templateId });
  if (Array.isArray(symbolIds) && symbolIds.length > 0) {
    swingPlans = swingPlans.filter((p) => symbolIds.includes(p.symbol_id));
  }

  // Intraday day plans
  let dayPlans = dayPlanRepo.getByTemplateId(templateId);
  if (Array.isArray(symbolIds) && symbolIds.length > 0) {
    dayPlans = dayPlans.filter((dp) => symbolIds.includes(dp.symbol_id));
  }

  // Normalize to a common shape for exportPlanWiseToCSV
  const plans = [
    ...swingPlans.map((p) => ({
      plan_date:        p.plan_date,
      symbol_name:      p.symbol_name,
      symbol_id:        p.symbol_id,
      bias:             p.bias,
      target_price:     p.target_price,
      stop_loss:        p.stop_loss,
      execution_status: p.execution_status,
      name:             p.name,
      trade_type:       'Swing',
    })),
    ...dayPlans.map((dp) => ({
      plan_date:        dp.plan_date,
      symbol_name:      dp.symbol_name,
      symbol_id:        dp.symbol_id,
      bias:             dp.bias,
      target_price:     dp.target ?? null,
      stop_loss:        dp.stop_out ?? null,
      execution_status: dp.execution_status,
      name:             dp.name,
      trade_type:       'Intraday',
    })),
  ];

  const planName = plans.length > 0 ? plans[0].name : `plan_${templateId}`;
  return { plans, planName };
}

function exportPlanWiseToCSV({ plans }, filePath) {
  const lines = [];
  lines.push(['Date', 'Symbol', 'Type', 'Bias', 'Target', 'Stop', 'Execution Status'].map(csvEsc).join(','));

  const sorted = [...plans].sort((a, b) => {
    if (a.plan_date !== b.plan_date) return a.plan_date < b.plan_date ? -1 : 1;
    return (a.symbol_name || '').localeCompare(b.symbol_name || '');
  });

  for (const p of sorted) {
    lines.push([
      p.plan_date,
      p.symbol_name,
      p.trade_type || '',
      p.bias,
      p.target_price ?? '',
      p.stop_loss ?? '',
      p.execution_status || 'Waiting',
    ].map(csvEsc).join(','));
  }

  fs.writeFileSync(filePath, '﻿' + lines.join('\r\n'), 'utf8');
}

module.exports = { buildExportData, exportToCSV, exportToPDF, buildSwingExportData, exportSwingToCSV, exportSwingToPDF, buildPlanWiseExportData, exportPlanWiseToCSV };
