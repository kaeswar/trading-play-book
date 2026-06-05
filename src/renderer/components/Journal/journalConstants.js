// Dark-theme bias colours — used in sidebar and entry panel
export const BIAS_DARK = {
  initiative_long:  { bg: 'rgba(0,100,200,0.22)',  border: '#1e5fa8', text: '#7ab8e8', label: 'IL' },
  initiative_short: { bg: 'rgba(200,90,0,0.22)',   border: '#a04a00', text: '#e8903a', label: 'IS' },
  responsive_long:  { bg: 'rgba(40,140,40,0.22)',  border: '#1e6e1e', text: '#6ac86a', label: 'RL' },
  responsive_short: { bg: 'rgba(160,40,100,0.22)', border: '#7a1e50', text: '#d870a0', label: 'RS' },
  neutral:          { bg: 'rgba(90,90,100,0.22)',  border: '#484858', text: '#9090a8', label: 'N'  },
};

export const BIAS_OPTIONS = [
  { key: 'initiative_long',  label: 'IL', full: 'Initiative Long',  bg: 'bg-j-il-bg',  border: 'border-j-il-bdr',  text: 'text-j-il-txt'  },
  { key: 'initiative_short', label: 'IS', full: 'Initiative Short', bg: 'bg-j-is-bg',  border: 'border-j-is-bdr',  text: 'text-j-is-txt'  },
  { key: 'responsive_long',  label: 'RL', full: 'Responsive Long',  bg: 'bg-j-rl-bg',  border: 'border-j-rl-bdr',  text: 'text-j-rl-txt'  },
  { key: 'responsive_short', label: 'RS', full: 'Responsive Short', bg: 'bg-j-rs-bg',  border: 'border-j-rs-bdr',  text: 'text-j-rs-txt'  },
  { key: 'neutral',          label: 'N',  full: 'Neutral',          bg: 'bg-j-n-bg',   border: 'border-j-n-bdr',   text: 'text-j-n-txt'   },
];

export const BIAS_STYLE = {
  initiative_long:  { bg: '#D5EAF7', border: '#85B7EB', text: '#0C447C' },
  initiative_short: { bg: '#FDE8C8', border: '#EF9F27', text: '#633806' },
  responsive_long:  { bg: '#E8F4E0', border: '#97C459', text: '#27500A' },
  responsive_short: { bg: '#F5E0F0', border: '#ED93B1', text: '#72243E' },
  neutral:          { bg: '#E8E8E8', border: '#B4B2A9', text: '#444441' },
};

export const OTF_SYMPTOMS = {
  bullish: [
    { key: 'higher_lows',              label: 'Higher Lows' },
    { key: 'extension_held_above_ib',  label: 'Extension above IB held' },
    { key: 'single_prints_body',       label: 'Single prints in body' },
    { key: 'tail_at_base',             label: 'Tail / excess at base' },
    { key: 'poor_low',                 label: 'Poor low (unfinished down)' },
  ],
  bearish: [
    { key: 'lower_highs',              label: 'Lower Highs' },
    { key: 'extension_held_below_ib',  label: 'Extension below IB held' },
    { key: 'single_prints_top',        label: 'Single prints at top' },
    { key: 'tail_at_top',              label: 'Tail / excess at top' },
    { key: 'poor_high',                label: 'Poor high (unfinished up)' },
  ],
  structural: [
    { key: 'one_time_framing_up',         label: 'One-time framing up' },
    { key: 'one_time_framing_down',       label: 'One-time framing down' },
    { key: 'two_time_framing',            label: 'Two-time framing' },
    { key: 'inventory_adjustment_break',  label: 'Inventory adjustment' },
    { key: 'failed_auction_signal',       label: 'Failed auction signal' },
  ],
};

export const LOCATION_VS_PREV_VA = [
  { value: 'above_vah', label: 'Above prior VAH' },
  { value: 'inside_va',  label: 'Inside prior VA' },
  { value: 'below_val',  label: 'Below prior VAL' },
  { value: 'at_poc',     label: 'At prior POC' },
  { value: 'at_vah',     label: 'At prior VAH' },
  { value: 'at_val',     label: 'At prior VAL' },
];

export const LOCATION_VS_A_FOOTPRINT = [
  { value: 'above_a_vah',  label: 'Above A-VAH' },
  { value: 'inside_a_va',  label: 'Inside A-VA' },
  { value: 'at_a_vah',     label: 'At A-VAH' },
  { value: 'at_a_poc',     label: 'At A-POC' },
  { value: 'below_a_val',  label: 'Below A-VAL' },
];

export const EXTENSION_DIRECTIONS = [
  { value: 'above_open', label: 'Above open' },
  { value: 'below_open', label: 'Below open' },
  { value: 'both',       label: 'Both sides' },
  { value: 'balanced',   label: 'Balanced' },
];

export const VA_MIGRATION_POC = [
  { value: 'higher', label: 'Higher' },
  { value: 'lower',  label: 'Lower' },
  { value: 'same',   label: 'Same' },
];

export const VA_MIGRATION_WIDTH = [
  { value: 'expanding',   label: 'Expanding' },
  { value: 'contracting', label: 'Contracting' },
  { value: 'stable',      label: 'Stable' },
];

export const PREV_SESSION_TYPES = [
  'Trend', 'Balanced', 'P-shape', 'b-shape', 'D-shape', 'I-shape', 'Double Distribution',
];

export const GAP_TYPES = [
  { value: 'gap_up',    label: 'Gap Up' },
  { value: 'gap_down',  label: 'Gap Down' },
  { value: 'inside_va', label: 'Inside VA' },
  { value: 'no_gap',    label: 'No Gap' },
];

export const STRUCTURE_EVENT_TYPES = [
  { value: 'ib_breakout',     label: 'IB Breakout' },
  { value: 'excess',          label: 'Excess' },
  { value: 'failed_auction',  label: 'Failed Auction' },
  { value: 'single_print',    label: 'Single Print' },
  { value: 'tail',            label: 'Tail' },
];

export const ACCEPTANCE = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export const ROW_TYPE_LABEL = {
  pre_session:     'Pre-Session',
  opening:         'Opening',
  tpo_a:           'TPO A  ·  Footprint',
  ib_complete:     'IB Complete',
  tpo:             'TPO',
  structure_event: 'Structure Event',
};

// Which tpo_labels are C or later (eligible for OTF symptoms)
export function isOtfEligible(entry) {
  return entry.row_type === 'tpo';
}

export function fmt(val) {
  if (val == null || val === '') return '—';
  const n = parseFloat(val);
  return isNaN(n) ? '—' : n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
