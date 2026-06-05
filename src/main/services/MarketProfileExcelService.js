const XLSX = require('xlsx');

const EXCEL_PATH = 'D:\\Learning\\Python\\MarketProfile_Data_Collector\\market_profile_log.xlsx';
const SHEET_NAME = 'Daily Log';

function toDateStr(val) {
  if (val == null) return null;
  if (typeof val === 'number') {
    // Excel date serial number
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim().substring(0, 10);
  return s.match(/^\d{4}-\d{2}-\d{2}$/) ? s : null;
}

function mapConviction(conviction) {
  if (!conviction) return null;
  const c = conviction.toLowerCase();
  if (c.includes('strong buyer') || c.includes('initiative buyer'))    return 'initiative_long';
  if (c.includes('strong seller') || c.includes('initiative seller'))   return 'initiative_short';
  if (c.includes('moderate buyer') || c.includes('responsive buyer'))   return 'responsive_long';
  if (c.includes('moderate seller') || c.includes('responsive seller')) return 'responsive_short';
  if (c.includes('neutral'))                                            return 'neutral';
  return null;
}

module.exports = {
  getPresessionData() {
    let wb;
    try {
      wb = XLSX.readFile(EXCEL_PATH);
    } catch (err) {
      if (err.code === 'ENOENT') return { error: 'Excel file not found at the configured path. Fill manually.' };
      return { error: 'Could not open Excel file: ' + err.message };
    }

    const ws = wb.Sheets[SHEET_NAME];
    if (!ws) return { error: `Sheet "${SHEET_NAME}" not found in the Excel file.` };

    // Row 0 = file title, Row 1 = column headers, Rows 2+ = data
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 3) return { error: 'No data rows found in the Daily Log sheet.' };

    const headers = rows[1];
    const col = {};
    headers.forEach((h, i) => { if (h) col[String(h).trim()] = i; });

    // Today in YYYY-MM-DD
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Most recent row whose date is strictly before today (handles weekends + holidays)
    let prevRow = null;
    let prevDate = null;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const dateStr = toDateStr(row[col['Date']]);
      if (dateStr && dateStr < todayStr) {
        if (!prevDate || dateStr > prevDate) {
          prevDate = dateStr;
          prevRow = row;
        }
      }
    }

    if (!prevRow) return { error: `No entry found before today (${todayStr}) in the Excel.` };

    const get = (header) => {
      const idx = col[header];
      return idx != null ? (prevRow[idx] ?? null) : null;
    };

    return {
      date:              prevDate,
      prev_vah:          get('VAH'),
      prev_poc:          get('POC'),
      prev_val:          get('VAL'),
      prev_session_type: get('Day Type') || null,
      observation:       get('Profile Story') || null,
      open_question:     get("Tomorrow's Thesis") || null,
      bias:              mapConviction(get('Conviction')),
      _conviction_raw:   get('Conviction'),
    };
  },
};
