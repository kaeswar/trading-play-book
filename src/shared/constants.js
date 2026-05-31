export const POSSIBILITIES = [
  { code: 'Open_Abv_PDR', bias: 'Bullish', label: 'Open above Previous Day Range' },
  { code: 'Open_Abv_VAH_IR', bias: 'Bullish', label: 'Open above VAH and Inside Range' },
  { code: 'Open_Abv_POC_IV', bias: 'Bullish', label: 'Open above POC and Inside VAH' },
  { code: 'Open_Bel_POC_IV', bias: 'Bearish', label: 'Open below POC Inside VA' },
  { code: 'Open_Bel_VAL_IR', bias: 'Bearish', label: 'Open below VAL and Inside Range' },
  { code: 'Open_Bel_PDR', bias: 'Bearish', label: 'Open below Previous Day Range' },
];

export const OUTCOMES = ['Accepted', 'Rejected'];

export const OUTCOME_COLORS = {
  Accepted: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

export const BIAS_COLORS = {
  Bullish: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', accent: 'from-blue-500 to-cyan-500' },
  Bearish: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', accent: 'from-red-500 to-orange-500' },
};

export function formatPossibilityCode(code) {
  return code.replace(/_/g, ' ');
}

// Market Behavior mapping: possibility_code + outcome → behavior tag
export const BEHAVIOR_MAPPING = {
  'Open_Abv_PDR_Accepted': 'Super Bullish',
  'Open_Abv_PDR_Rejected': 'Bearish',
  'Open_Abv_VAH_IR_Accepted': 'Bullish (Medium)',
  'Open_Abv_VAH_IR_Rejected': 'Double Side Auction',
  'Open_Abv_POC_IV_Accepted': 'Double Side Auction',
  'Open_Abv_POC_IV_Rejected': 'Bullish (Medium)',
  'Open_Bel_POC_IV_Accepted': 'Suspect Bearish',
  'Open_Bel_POC_IV_Rejected': 'Bullish (Medium)',
  'Open_Bel_VAL_IR_Accepted': 'Medium Bearish',
  'Open_Bel_VAL_IR_Rejected': 'Double Side Auction',
  'Open_Bel_PDR_Accepted': 'Super Bearish',
  'Open_Bel_PDR_Rejected': 'Bullish',
};

export function getBehaviorTag(possibilityCode, outcome) {
  return BEHAVIOR_MAPPING[`${possibilityCode}_${outcome}`] || null;
}

// Returns green for bullish results, red for bearish results regardless of Accepted/Rejected label
export function getOutcomeColors(outcome, bias) {
  if (!outcome || !bias) return OUTCOME_COLORS[outcome] || OUTCOME_COLORS.Accepted;
  const isBullishResult =
    (bias === 'Bullish' && outcome === 'Accepted') ||
    (bias === 'Bearish' && outcome === 'Rejected');
  return isBullishResult ? OUTCOME_COLORS.Accepted : OUTCOME_COLORS.Rejected;
}

export const BEHAVIOR_TAGS = {
  'Super Bullish': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Bullish (Medium)': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Bullish': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'Neutral': { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
  'Double Side Auction': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Suspect Bearish': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  'Medium Bearish': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  'Bearish': { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  'Super Bearish': { bg: 'bg-red-700/20', text: 'text-red-300', border: 'border-red-700/30' },
};

export const BEHAVIOR_TAG_ORDER = [
  'Super Bullish',
  'Bullish (Medium)',
  'Bullish',
  'Double Side Auction',
  'Suspect Bearish',
  'Medium Bearish',
  'Bearish',
  'Super Bearish',
];

export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Stock Plan bias tags
export const STOCK_PLAN_BIAS_TAGS = ['Super Bullish', 'Bullish', 'Bearish', 'Super Bearish'];

export const STOCK_PLAN_BIAS_COLORS = {
  'Super Bullish': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Bullish':       { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    border: 'border-cyan-500/30' },
  'Bearish':       { bg: 'bg-rose-500/20',    text: 'text-rose-400',    border: 'border-rose-500/30' },
  'Super Bearish': { bg: 'bg-red-700/20',     text: 'text-red-300',     border: 'border-red-700/30' },
};

// Stock Plan constants
export const EXECUTION_STATUSES = ['Pass', 'Fail', 'Partial', 'Cancelled', 'Waiting'];

export const EXECUTION_STATUS_COLORS = {
  Pass: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Fail: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  Partial: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  Cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  Waiting: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
};

// Custom Plan bias tags
export const CUSTOM_PLAN_BIAS_TAGS = [
  'Super Bullish',
  'Bullish',
  'Neutral',
  'Bearish',
  'Super Bearish',
];

// Custom Plan verdict statuses
export const CUSTOM_VERDICT_STATUSES = ['Pass', 'Fail', 'Partial', 'Cancelled'];

export const CUSTOM_VERDICT_COLORS = {
  Pass: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Fail: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  Partial: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  Cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

export const TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', '4Hrs', '1Hrs'];

// Intraday Note statuses (ordered bullish → bearish)
export const INTRADAY_STATUSES = [
  'Super-Bullish', 'Bullish', 'Mild-Bullish', 'Neutral',
  'Medium-Bearish', 'Bearish', 'Super-Bearish', 'Not-Known',
];

// Keyboard shortcuts: 1-8 map to statuses in order
export const INTRADAY_STATUS_KEYS = {
  '1': 'Super-Bullish',
  '2': 'Bullish',
  '3': 'Mild-Bullish',
  '4': 'Neutral',
  '5': 'Medium-Bearish',
  '6': 'Bearish',
  '7': 'Super-Bearish',
  '8': 'Not-Known',
};

export const INTRADAY_STATUS_COLORS = {
  'Super-Bullish':  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Bullish':        { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    border: 'border-cyan-500/30' },
  'Mild-Bullish':   { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  'Neutral':        { bg: 'bg-gray-500/20',     text: 'text-gray-400',    border: 'border-gray-500/30' },
  'Medium-Bearish': { bg: 'bg-orange-500/20',   text: 'text-orange-400',  border: 'border-orange-500/30' },
  'Bearish':        { bg: 'bg-rose-500/20',     text: 'text-rose-400',    border: 'border-rose-500/30' },
  'Super-Bearish':  { bg: 'bg-red-700/20',      text: 'text-red-300',     border: 'border-red-700/30' },
  'Not-Known':      { bg: 'bg-surface-600/40',  text: 'text-gray-500',    border: 'border-surface-500/30' },
};

// Indian market hours: 09:15 to 15:30, 5-min intervals
export const INTRADAY_TIME_OPTIONS = (() => {
  const times = [];
  for (let h = 9; h <= 15; h++) {
    const startMin = h === 9 ? 15 : 0;
    const endMin = h === 15 ? 30 : 59;
    for (let m = startMin; m <= endMin; m += 5) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
})();

export const TIMEFRAME_COLORS = {
  Weekly: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  Daily: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
};

export function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
