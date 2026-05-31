const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserWindow, app } = require('electron');

const tradingDayRepo = require('../db/tradingDayRepo');
const possibilityRepo = require('../db/possibilityRepo');
const outcomePlanRepo = require('../db/outcomePlanRepo');
const verdictRepo = require('../db/verdictRepo');
const screenshotRepo = require('../db/screenshotRepo');
const verdictScreenshotRepo = require('../db/verdictScreenshotRepo');
const customPlanRepo = require('../db/customPlanRepo');
const customPlanScreenshotRepo = require('../db/customPlanScreenshotRepo');
const intradayNoteRepo = require('../db/intradayNoteRepo');
const stockPlanRepo = require('../db/stockPlanRepo');

const POSSIBILITY_LABELS = {
  Open_Abv_PDR:    'Open above Previous Day Range',
  Open_Abv_VAH_IR: 'Open above VAH and Inside Range',
  Open_Abv_POC_IV: 'Open above POC and Inside VAH',
  Open_Bel_POC_IV: 'Open below POC Inside VA',
  Open_Bel_VAL_IR: 'Open below VAL and Inside Range',
  Open_Bel_PDR:    'Open below Previous Day Range',
};

const PDF_FOOTER = `<div style="width:100%;font-size:8px;color:#666;padding:0 0.4in;display:flex;justify-content:space-between;align-items:center;font-family:Arial,sans-serif">
  <span>Donationware &nbsp;·&nbsp; Please donate if it is useful &nbsp;·&nbsp; UPI ID mentioned in the About window &nbsp;·&nbsp; Author: kaeswar &nbsp;·&nbsp; kaeswar@gmail.com</span>
  <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;

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

function buildExportData({ symbolIds, dateFrom, dateTo, includeNotes,
  dayFilter = 'all', verdictBias = '', possibilityDisplay = 'all',
  forPdf = false }) {
  const days = tradingDayRepo.getForExport({ symbolIds, dateFrom, dateTo });

  const bySymbol = {};

  for (const day of days) {
    const verdict = verdictRepo.getByTradingDay(day.id);
    const rawPossibilities = possibilityRepo.getByTradingDay(day.id);
    const rawCustomPlans = customPlanRepo.getByTradingDay(day.id);

    // Day filter
    if (dayFilter === 'hasVerdict' && !verdict) continue;
    if (dayFilter === 'hasPlan' && !rawPossibilities.some((p) => p.has_plan) && rawCustomPlans.length === 0) continue;
    if (dayFilter === 'verdictHadPlan') {
      if (!verdict) continue;
      const playedOut = rawPossibilities.find((p) => p.code === verdict.possibility_code);
      if (!playedOut?.has_plan) continue;
    }

    // Verdict bias filter
    if (verdictBias && verdict?.bias !== verdictBias) continue;

    // Possibility display filter (default plans)
    const filteredPossibilities =
      possibilityDisplay === 'playedOut' && verdict
        ? rawPossibilities.filter((p) => p.code === verdict.possibility_code)
        : possibilityDisplay === 'planned'
        ? rawPossibilities.filter((p) => p.has_plan)
        : rawPossibilities;

    const possibilities = filteredPossibilities.map((p) => {
      const outcomePlans = outcomePlanRepo.getByPossibility(p.id);
      const accepted = outcomePlans.find((op) => op.outcome === 'Accepted') || null;
      const rejected = outcomePlans.find((op) => op.outcome === 'Rejected') || null;

      let acceptedScreenshots = [];
      let rejectedScreenshots = [];
      if (forPdf) {
        if (accepted) {
          acceptedScreenshots = screenshotRepo.getByOutcomePlan(accepted.id)
            .map((ss) => ({ ...ss, dataUrl: imgToBase64(ss.file_path) }))
            .filter((ss) => ss.dataUrl);
        }
        if (rejected) {
          rejectedScreenshots = screenshotRepo.getByOutcomePlan(rejected.id)
            .map((ss) => ({ ...ss, dataUrl: imgToBase64(ss.file_path) }))
            .filter((ss) => ss.dataUrl);
        }
      }

      return { ...p, accepted, rejected, acceptedScreenshots, rejectedScreenshots };
    });

    let verdictScreenshots = [];
    if (forPdf && verdict) {
      verdictScreenshots = verdictScreenshotRepo.getByVerdict(verdict.id)
        .map((vs) => ({ ...vs, dataUrl: imgToBase64(vs.file_path) }))
        .filter((vs) => vs.dataUrl);
    }

    // Custom plan display filter — played-out means verdict_status is set
    const filteredCustomPlans =
      possibilityDisplay === 'playedOut'
        ? rawCustomPlans.filter((cp) => cp.verdict_status != null)
        : rawCustomPlans;

    const customPlans = filteredCustomPlans.map((cp) => {
      let screenshots = [];
      if (forPdf) {
        screenshots = customPlanScreenshotRepo.getByCustomPlan(cp.id)
          .map((ss) => ({ ...ss, dataUrl: imgToBase64(ss.file_path) }))
          .filter((ss) => ss.dataUrl);
      }
      return { ...cp, screenshots };
    });

    // Intraday notes
    const intradayNotes = includeNotes ? intradayNoteRepo.getByTradingDay(day.id) : [];

    if (!bySymbol[day.symbol_name]) bySymbol[day.symbol_name] = [];
    bySymbol[day.symbol_name].push({
      ...day,
      possibilities,
      verdict,
      verdictScreenshots,
      customPlans,
      intradayNotes,
    });
  }

  // Summary metrics
  const allDays = Object.values(bySymbol).flat();
  const totalDays = allDays.length;
  const preparedDays = allDays.filter((d) => d.verdict?.had_plan).length;
  const acceptedCount = allDays.filter((d) => d.verdict?.outcome === 'Accepted').length;
  const rejectedCount = allDays.filter((d) => d.verdict?.outcome === 'Rejected').length;

  return {
    bySymbol,
    summary: {
      totalDays,
      preparedDays,
      prepRate: totalDays > 0 ? Math.round((preparedDays / totalDays) * 100) : 0,
      acceptedCount,
      rejectedCount,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      symbolNames: Object.keys(bySymbol),
    },
  };
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportToCSV(exportData, filePath) {
  const { bySymbol, summary } = exportData;
  const lines = [];

  // Summary header block
  lines.push('Trading Play Book — Export Report');
  lines.push(`Symbols,${summary.symbolNames.join(' | ')}`);
  lines.push(`Date Range,${summary.dateFrom || 'All'} to ${summary.dateTo || 'All'}`);
  lines.push(`Total Days,${summary.totalDays}`);
  lines.push(`Prepared,${summary.preparedDays} (${summary.prepRate}%)`);
  lines.push(`Accepted,${summary.acceptedCount}`);
  lines.push(`Rejected,${summary.rejectedCount}`);
  lines.push('');

  // Column headers
  const headers = [
    'Type', 'Date', 'Symbol', 'Day Notes',
    'Possibility Code', 'Possibility Label', 'Bias', 'Has Plan',
    'Accepted Target', 'Accepted Stop Out', 'Accepted Description',
    'Rejected Target', 'Rejected Stop Out', 'Rejected Description',
    'Custom Plan Title', 'Custom Plan Bias', 'Custom Plan Target', 'Custom Plan Stop Out', 'Custom Plan Verdict',
    'Verdict Code', 'Verdict Outcome', 'Verdict Bias', 'Had Plan', 'Verdict Notes',
    'Intraday Notes',
  ];
  lines.push(headers.map(csvEsc).join(','));

  for (const [symbolName, days] of Object.entries(bySymbol)) {
    for (const day of days) {
      const vd = day.verdict;
      const notesStr = day.intradayNotes
        .map((n) => `[${n.note_time}] ${n.status}: ${n.action}`)
        .join(' | ');

      // Possibility rows
      for (const p of day.possibilities) {
        lines.push([
          'Possibility',
          day.trade_date, symbolName, day.notes || '',
          p.code, POSSIBILITY_LABELS[p.code] || p.code, p.bias, p.has_plan ? 'Yes' : 'No',
          p.accepted?.target ?? '', p.accepted?.stop_out ?? '', p.accepted?.description ?? '',
          p.rejected?.target ?? '', p.rejected?.stop_out ?? '', p.rejected?.description ?? '',
          '', '', '', '', '',
          vd?.possibility_code ?? '', vd?.outcome ?? '', vd?.bias ?? '',
          vd != null ? (vd.had_plan ? 'Yes' : 'No') : '',
          vd?.notes ?? '', notesStr,
        ].map(csvEsc).join(','));
      }

      // Custom plan rows
      for (const cp of day.customPlans) {
        lines.push([
          'Custom Plan',
          day.trade_date, symbolName, day.notes || '',
          '', '', '', '',
          '', '', '', '', '', '',
          cp.title, cp.bias_tag ?? '', cp.target ?? '', cp.stop_out ?? '', cp.verdict_status ?? '',
          vd?.possibility_code ?? '', vd?.outcome ?? '', vd?.bias ?? '',
          vd != null ? (vd.had_plan ? 'Yes' : 'No') : '',
          vd?.notes ?? '', notesStr,
        ].map(csvEsc).join(','));
      }
    }
  }

  fs.writeFileSync(filePath, '﻿' + lines.join('\r\n'), 'utf8');
}

// ── PDF export ────────────────────────────────────────────────────────────────

function buildPdfHtml(exportData) {
  const { bySymbol, summary } = exportData;
  const logo = logoDataUrl();

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const verdictBadge = (vd) => {
    if (!vd) return '<span style="color:#999">No Verdict</span>';
    const bg = vd.outcome === 'Accepted' ? '#d1fae5' : '#fee2e2';
    const col = vd.outcome === 'Accepted' ? '#065f46' : '#991b1b';
    return `<span style="background:${bg};color:${col};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:bold">${esc(vd.outcome)} · ${esc(vd.bias)}</span>`;
  };

  const screenshotsHtml = (screenshots) => {
    if (!screenshots || screenshots.length === 0) return '';
    const imgs = screenshots.map((ss) =>
      `<div style="display:inline-block;margin:4px"><img src="${ss.dataUrl}" style="max-width:220px;max-height:160px;border-radius:4px;border:1px solid #e0e0e0" /></div>`
    ).join('');
    return `<div style="margin-top:6px">${imgs}</div>`;
  };

  let body = '';

  for (const [symbolName, days] of Object.entries(bySymbol)) {
    body += `
      <div style="margin-bottom:32px">
        <div style="font-size:18px;font-weight:bold;color:#4f46e5;border-left:4px solid #4f46e5;padding-left:10px;margin-bottom:16px">
          ${esc(symbolName)}
        </div>`;

    for (const day of days) {
      const vd = day.verdict;
      body += `
        <div style="border:1px solid #e0e0e0;border-radius:8px;margin-bottom:20px;overflow:hidden;page-break-inside:avoid">
          <!-- Day header -->
          <div style="background:#4f46e5;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <span style="font-size:15px;font-weight:bold">${esc(day.trade_date)}</span>
              ${day.notes ? `<span style="font-size:11px;opacity:0.8;margin-left:12px">${esc(day.notes)}</span>` : ''}
            </div>
            <div>${verdictBadge(vd)}</div>
          </div>
          <div style="padding:14px">`;

      // Verdict detail
      if (vd) {
        body += `
            <div style="background:#f5f3ff;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px">
              <strong>Verdict:</strong> ${esc(vd.possibility_code)} &nbsp;·&nbsp;
              ${esc(vd.outcome)} &nbsp;·&nbsp; ${esc(vd.bias)} &nbsp;·&nbsp;
              Prepared: ${vd.had_plan ? 'Yes' : 'No'}
              ${vd.notes ? `&nbsp;·&nbsp; Notes: ${esc(vd.notes)}` : ''}
            </div>`;
        if (day.verdictScreenshots.length > 0) {
          body += `<div style="margin-bottom:12px">${screenshotsHtml(day.verdictScreenshots)}</div>`;
        }
      }

      // Possibilities table
      const hasAnyPlan = day.possibilities.some((p) => p.has_plan);
      if (hasAnyPlan || day.possibilities.length > 0) {
        body += `
            <div style="font-size:11px;font-weight:bold;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Default Plans</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px">
              <thead>
                <tr style="background:#f5f3ff">
                  <th style="padding:5px 8px;text-align:left;border:1px solid #e0e0e0;color:#4f46e5">Scenario</th>
                  <th style="padding:5px 8px;text-align:left;border:1px solid #e0e0e0;color:#4f46e5">Bias</th>
                  <th style="padding:5px 8px;text-align:center;border:1px solid #e0e0e0;color:#4f46e5">Plan</th>
                  <th style="padding:5px 8px;text-align:left;border:1px solid #e0e0e0;color:#4f46e5">Accepted (T / SL)</th>
                  <th style="padding:5px 8px;text-align:left;border:1px solid #e0e0e0;color:#4f46e5">Rejected (T / SL)</th>
                </tr>
              </thead>
              <tbody>`;
        for (const p of day.possibilities) {
          const biasCol = p.bias === 'Bullish' ? '#1d4ed8' : '#dc2626';
          const acc = p.accepted;
          const rej = p.rejected;
          body += `
                <tr style="background:${p.bias === 'Bullish' ? '#eff6ff' : '#fef2f2'}">
                  <td style="padding:5px 8px;border:1px solid #e0e0e0">
                    <div style="font-weight:bold">${esc(p.code)}</div>
                    <div style="font-size:10px;color:#666">${esc(POSSIBILITY_LABELS[p.code] || p.code)}</div>
                  </td>
                  <td style="padding:5px 8px;border:1px solid #e0e0e0;color:${biasCol};font-weight:bold">${esc(p.bias)}</td>
                  <td style="padding:5px 8px;border:1px solid #e0e0e0;text-align:center">${p.has_plan ? '✓' : '—'}</td>
                  <td style="padding:5px 8px;border:1px solid #e0e0e0">
                    ${acc ? `${acc.target ?? '—'} / ${acc.stop_out ?? '—'}${acc.description ? `<div style="font-size:10px;color:#666;margin-top:2px">${esc(acc.description)}</div>` : ''}` : '—'}
                    ${screenshotsHtml(p.acceptedScreenshots)}
                  </td>
                  <td style="padding:5px 8px;border:1px solid #e0e0e0">
                    ${rej ? `${rej.target ?? '—'} / ${rej.stop_out ?? '—'}${rej.description ? `<div style="font-size:10px;color:#666;margin-top:2px">${esc(rej.description)}</div>` : ''}` : '—'}
                    ${screenshotsHtml(p.rejectedScreenshots)}
                  </td>
                </tr>`;
        }
        body += `</tbody></table>`;
      }

      // Custom plans
      if (day.customPlans.length > 0) {
        body += `<div style="font-size:11px;font-weight:bold;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Custom Plans</div>`;
        for (const cp of day.customPlans) {
          body += `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px;margin-bottom:8px;font-size:11px">
              <div style="font-weight:bold;margin-bottom:4px">${esc(cp.title)}${cp.bias_tag ? ` <span style="font-size:10px;color:#555;font-weight:normal">· ${esc(cp.bias_tag)}</span>` : ''}</div>
              ${cp.trade_plan ? `<div style="color:#444;margin-bottom:4px">${esc(cp.trade_plan)}</div>` : ''}
              <div style="color:#666">
                ${cp.target ? `Target: ${cp.target}` : ''}
                ${cp.stop_out ? ` &nbsp; SL: ${cp.stop_out}` : ''}
                ${cp.verdict_status ? ` &nbsp; Verdict: <strong>${esc(cp.verdict_status)}</strong>` : ''}
              </div>
              ${screenshotsHtml(cp.screenshots)}
            </div>`;
        }
      }

      // Intraday notes
      if (day.intradayNotes.length > 0) {
        body += `<div style="font-size:11px;font-weight:bold;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Intraday Notes</div>`;
        body += `<div style="background:#f9fafb;border-radius:6px;padding:8px 12px;font-size:11px">`;
        for (const note of day.intradayNotes) {
          body += `
            <div style="padding:4px 0;border-bottom:1px solid #e0e0e0;display:flex;gap:8px;align-items:baseline">
              <span style="color:#4f46e5;font-weight:bold;min-width:50px">${esc(note.note_time)}</span>
              <span style="background:#e0e7ff;color:#3730a3;font-size:10px;padding:1px 6px;border-radius:8px">${esc(note.status)}</span>
              <span style="color:#333">${esc(note.action)}</span>
            </div>`;
        }
        body += `</div>`;
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
    @media print { .day-card { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <!-- Report header -->
  <div style="text-align:center;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #4f46e5">
    <div style="display:inline-flex;align-items:center;gap:12px;justify-content:center">
      ${logo ? `<img src="${logo}" style="width:48px;height:48px;border-radius:10px" />` : ''}
      <div style="text-align:left">
        <div style="font-size:22px;font-weight:bold;color:#4f46e5">Trading Play Book</div>
        <div style="font-size:10px;color:#818cf8;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-top:4px">Export Report</div>
      </div>
    </div>
  </div>

  <!-- Summary -->
  <div style="background:#f5f3ff;border-radius:10px;padding:16px;margin-bottom:28px">
    <div style="font-size:12px;font-weight:bold;color:#4f46e5;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Summary</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;text-align:center">
      ${[
        ['Total Days', summary.totalDays],
        ['Prepared', `${summary.preparedDays} (${summary.prepRate}%)`],
        ['Accepted', summary.acceptedCount],
        ['Rejected', summary.rejectedCount],
        ['Symbols', summary.symbolNames.join(', ')],
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

  <!-- Day data -->
  ${body}
</body>
</html>`;
}

async function exportToPDF(exportData, filePath) {
  const html = buildPdfHtml(exportData);
  const tmpPath = path.join(os.tmpdir(), `tpb_export_${Date.now()}.html`);
  fs.writeFileSync(tmpPath, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await new Promise((resolve, reject) => {
    win.webContents.once('did-finish-load', resolve);
    win.webContents.once('did-fail-load', (_, __, ___, errDesc) => reject(new Error(errDesc)));
    win.loadFile(tmpPath);
  });

  await new Promise((r) => setTimeout(r, 400));

  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: PDF_FOOTER,
    margins: { top: 0.4, bottom: 0.6, left: 0.4, right: 0.4 },
  });

  win.destroy();
  try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }

  fs.writeFileSync(filePath, pdfBuffer);
}

// ── Swing data aggregation ────────────────────────────────────────────────────

function buildSwingExportData({ stockNames, executionStatus, dateFrom, dateTo, includeAnalysis, forPdf = false }) {
  let plans = stockPlanRepo.search({
    query: '',
    executionStatus: executionStatus && executionStatus !== 'Waiting' ? executionStatus : '',
    timeframe: '',
    activeOnly: executionStatus === 'Waiting',
  });

  if (stockNames && stockNames.length > 0) {
    plans = plans.filter((p) => stockNames.includes(p.stock_name));
  }

  if (dateFrom) {
    plans = plans.filter((p) => p.created_at && p.created_at.substring(0, 10) >= dateFrom);
  }
  if (dateTo) {
    plans = plans.filter((p) => p.created_at && p.created_at.substring(0, 10) <= dateTo);
  }

  if (forPdf) {
    plans = plans.map((p) => ({
      ...p,
      chartDataUrl: p.chart_path ? imgToBase64(p.chart_path) : null,
    }));
  }

  const byStatus = {};
  for (const p of plans) {
    const s = p.execution_status || 'Waiting';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  return {
    plans,
    includeAnalysis,
    summary: {
      total: plans.length,
      byStatus,
      stockNames: [...new Set(plans.map((p) => p.stock_name))].sort(),
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    },
  };
}

// ── Swing CSV ─────────────────────────────────────────────────────────────────

function exportSwingToCSV(swingData, filePath) {
  const { plans, summary, includeAnalysis } = swingData;
  const lines = [];

  lines.push('Trading Play Book — Swing Plans Export');
  lines.push(`Stocks,${summary.stockNames.join(' | ')}`);
  lines.push(`Date Range,${summary.dateFrom || 'All'} to ${summary.dateTo || 'All'}`);
  lines.push(`Total Plans,${summary.total}`);
  for (const [s, count] of Object.entries(summary.byStatus)) {
    lines.push(`${csvEsc(s)},${count}`);
  }
  lines.push('');

  const headers = [
    'Stock Name', 'Timeframe', 'Entry Price', 'Target Price', 'Stop Loss',
    'Execution Status', 'Created Date', 'Updated Date',
  ];
  if (includeAnalysis) headers.splice(6, 0, 'Analysis');
  lines.push(headers.map(csvEsc).join(','));

  for (const p of plans) {
    const row = [
      p.stock_name,
      p.timeframe || '',
      p.entry_price ?? '',
      p.target_price ?? '',
      p.stop_loss ?? '',
      p.execution_status || 'Waiting',
      p.created_at ? p.created_at.substring(0, 10) : '',
      p.updated_at ? p.updated_at.substring(0, 10) : '',
    ];
    if (includeAnalysis) row.splice(6, 0, p.analysis || '');
    lines.push(row.map(csvEsc).join(','));
  }

  fs.writeFileSync(filePath, '﻿' + lines.join('\r\n'), 'utf8');
}

// ── Swing PDF ─────────────────────────────────────────────────────────────────

function buildSwingPdfHtml(swingData) {
  const { plans, summary, includeAnalysis } = swingData;
  const logo = logoDataUrl();
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const STATUS_STYLE = {
    Pass:      { bg: '#d1fae5', col: '#065f46' },
    Fail:      { bg: '#fee2e2', col: '#991b1b' },
    Partial:   { bg: '#fef3c7', col: '#92400e' },
    Cancelled: { bg: '#f3f4f6', col: '#4b5563' },
    Waiting:   { bg: '#e0e7ff', col: '#3730a3' },
  };

  const statusBadge = (raw) => {
    const s = raw || 'Waiting';
    const { bg, col } = STATUS_STYLE[s] || STATUS_STYLE.Waiting;
    return `<span style="background:${bg};color:${col};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:bold">${esc(s)}</span>`;
  };

  let body = '';
  for (const p of plans) {
    body += `
      <div style="border:1px solid #e0e0e0;border-radius:8px;margin-bottom:20px;overflow:hidden;page-break-inside:avoid">
        <div style="background:#4f46e5;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:15px;font-weight:bold">${esc(p.stock_name)}</div>
          <div>${statusBadge(p.execution_status)}</div>
        </div>
        <div style="padding:14px">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;text-align:center;font-size:11px">
            ${[['Timeframe', p.timeframe || '—'], ['Entry', p.entry_price ?? '—'], ['Target', p.target_price ?? '—'], ['Stop Loss', p.stop_loss ?? '—']]
              .map(([label, value]) => `
              <div style="background:#f5f3ff;border-radius:6px;padding:8px">
                <div style="font-size:14px;font-weight:bold;color:#4f46e5">${esc(String(value))}</div>
                <div style="font-size:10px;color:#666;text-transform:uppercase;margin-top:2px">${label}</div>
              </div>`).join('')}
          </div>
          ${includeAnalysis && p.analysis ? `
          <div style="background:#f9fafb;border-radius:6px;padding:10px;font-size:11px;color:#444;margin-bottom:12px;line-height:1.5">
            ${esc(p.analysis)}
          </div>` : ''}
          ${p.chartDataUrl ? `
          <div style="margin-top:10px">
            <img src="${p.chartDataUrl}" style="max-width:100%;max-height:300px;border-radius:6px;border:1px solid #e0e0e0" />
          </div>` : ''}
          <div style="font-size:10px;color:#999;margin-top:10px">
            Created: ${p.created_at ? p.created_at.substring(0, 10) : '—'} &nbsp;·&nbsp;
            Updated: ${p.updated_at ? p.updated_at.substring(0, 10) : '—'}
          </div>
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
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await new Promise((resolve, reject) => {
    win.webContents.once('did-finish-load', resolve);
    win.webContents.once('did-fail-load', (_, __, ___, errDesc) => reject(new Error(errDesc)));
    win.loadFile(tmpPath);
  });

  await new Promise((r) => setTimeout(r, 400));

  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: PDF_FOOTER,
    margins: { top: 0.4, bottom: 0.6, left: 0.4, right: 0.4 },
  });

  win.destroy();
  try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }

  fs.writeFileSync(filePath, pdfBuffer);
}

module.exports = { buildExportData, exportToCSV, exportToPDF, buildSwingExportData, exportSwingToCSV, exportSwingToPDF };
