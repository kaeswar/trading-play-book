export const OUTCOMES = ['Accepted', 'Rejected'];

export const BEHAVIOR_TAGS = {
  'Super Bullish':       { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Bullish (Medium)':    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  'Bullish':             { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    border: 'border-cyan-500/30' },
  'Possibly Bullish':    { bg: 'bg-sky-500/15',     text: 'text-sky-300',     border: 'border-sky-500/25' },
  'Range Bound':         { bg: 'bg-slate-500/20',   text: 'text-slate-400',   border: 'border-slate-500/30' },
  'Neutral':             { bg: 'bg-gray-500/20',    text: 'text-gray-300',    border: 'border-gray-500/30' },
  'Double Side Auction': { bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/30' },
  'Possibly Bearish':    { bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/25' },
  'Suspect Bearish':     { bg: 'bg-orange-500/20',  text: 'text-orange-400',  border: 'border-orange-500/30' },
  'Medium Bearish':      { bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/30' },
  'Bearish':             { bg: 'bg-rose-500/20',    text: 'text-rose-400',    border: 'border-rose-500/30' },
  'Super Bearish':       { bg: 'bg-red-700/20',     text: 'text-red-300',     border: 'border-red-700/30' },
};

export const BEHAVIOR_TAG_ORDER = [
  'Super Bullish',
  'Bullish (Medium)',
  'Bullish',
  'Possibly Bullish',
  'Range Bound',
  'Double Side Auction',
  'Possibly Bearish',
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

// Shared 7-tag bias set used by templates, day_plans, and swing plans.
// 'Possibly Bullish' / 'Possibly Bearish' are tentative directional reads (e.g. opens around POC).
export const STOCK_PLAN_BIAS_TAGS = [
  'Super Bullish',
  'Bullish',
  'Possibly Bullish',
  'Range Bound',
  'Possibly Bearish',
  'Bearish',
  'Super Bearish',
];

export const STOCK_PLAN_BIAS_COLORS = {
  'Super Bullish':    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Bullish':          { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    border: 'border-cyan-500/30' },
  'Possibly Bullish': { bg: 'bg-sky-500/15',     text: 'text-sky-300',     border: 'border-sky-500/25' },
  'Range Bound':      { bg: 'bg-slate-500/20',   text: 'text-slate-400',   border: 'border-slate-500/30' },
  'Possibly Bearish': { bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/25' },
  'Bearish':          { bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/30' },
  'Super Bearish':    { bg: 'bg-red-950/60',     text: 'text-red-200',     border: 'border-red-800/70' },
};

// Day-plan execution status (post-market verdict for a single directional plan).
// 'UnPlanned' = the trade played out for reasons outside the prepared target/stop scenario
// (e.g. unexpected news, off-script exit). Tracked separately so it doesn't pollute Successful/Failed stats.
export const DAY_PLAN_STATUSES = ['Waiting', 'Successful', 'Failed', 'Cancelled', 'Cost-to-Cost', 'UnPlanned', 'In-Active'];

export const DAY_PLAN_STATUS_COLORS = {
  'Waiting':      { bg: 'bg-surface-600/40',  text: 'text-gray-400',    border: 'border-surface-500/40' },
  'Successful':   { bg: 'bg-emerald-500/20',  text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Failed':       { bg: 'bg-red-500/20',      text: 'text-red-400',     border: 'border-red-500/30' },
  'Cancelled':    { bg: 'bg-gray-500/20',     text: 'text-gray-400',    border: 'border-gray-500/30' },
  'Cost-to-Cost': { bg: 'bg-amber-500/20',    text: 'text-amber-400',   border: 'border-amber-500/30' },
  'UnPlanned':    { bg: 'bg-violet-500/20',   text: 'text-violet-300',  border: 'border-violet-500/30' },
  'In-Active':    { bg: 'bg-slate-500/20',    text: 'text-slate-400',   border: 'border-slate-500/30' },
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
  Monthly: { bg: 'bg-rose-500/20',   text: 'text-rose-400',   border: 'border-rose-500/30' },
  Weekly:  { bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  Daily:   { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  '4Hrs':  { bg: 'bg-amber-500/20',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  '1Hrs':  { bg: 'bg-teal-500/20',   text: 'text-teal-400',   border: 'border-teal-500/30' },
};

export function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// === Plan Template constants (Phase A) ===

export const TRADE_TYPES = ['Intraday', 'Swing', 'Both'];

export const TRADE_TYPE_COLORS = {
  Intraday: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  Swing:    { bg: 'bg-teal-500/20',   text: 'text-teal-400',   border: 'border-teal-500/30' },
  Both:     { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
};

// Template bias picker uses the same 5-tag set as Swing/Custom plans
export const TEMPLATE_BIAS_TAGS = STOCK_PLAN_BIAS_TAGS;

// Auto-derivation: when an outcome's behavior_tag is NULL, render its bias as the tag.
// Bias values are valid behavior-tag keys (the 5-tag set is a subset of BEHAVIOR_TAGS keys).
export function deriveBehaviorTag(bias, explicit) {
  if (explicit) return explicit;
  return bias || null;
}

// Coarse bullish/bearish grouping used by filters (e.g. "show me anything bullish")
export function isBullishBias(bias) {
  return bias === 'Bullish' || bias === 'Super Bullish';
}
export function isBearishBias(bias) {
  return bias === 'Bearish' || bias === 'Super Bearish';
}

// Seeded by the DB layer; surfaced here so the UI knows the system group's name
export const SYSTEM_TEMPLATE_GROUP = 'Market Profile Openings';
