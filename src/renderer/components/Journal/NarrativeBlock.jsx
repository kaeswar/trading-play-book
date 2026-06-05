import React from 'react';
import { OTF_SYMPTOMS, BIAS_STYLE } from './journalConstants';

const BIAS_FULL = {
  initiative_long:  'Initiative Long',
  initiative_short: 'Initiative Short',
  responsive_long:  'Responsive Long',
  responsive_short: 'Responsive Short',
  neutral:          'Neutral',
};

const LOCATION_A_FP_TEXT = {
  above_a_vah: 'accepting above A-VAH',
  inside_a_va: 'inside A value area',
  at_a_vah:    'at A-VAH',
  at_a_poc:    'at A-POC',
  below_a_val: 'accepting below A-VAL',
};

const GAP_TEXT = {
  gap_up:    'a Gap Up',
  gap_down:  'a Gap Down',
  inside_va: 'within prior value area — no gap',
  no_gap:    'no gap from prior close',
};

const EXT_TEXT = {
  above_open: 'above the open',
  below_open: 'below the open',
  both:       'on both sides of the open',
  balanced:   'balanced around the open',
};

const POC_MIGRATION_TEXT = { higher: 'migrating higher', lower: 'migrating lower', same: 'unchanged' };

const STRUCT_TEXT = {
  ib_breakout:    'IB Breakout',
  excess:         'Excess',
  failed_auction: 'Failed Auction',
  single_print:   'Single Print',
  tail:           'Tail',
};

// Flat symptom label lookup
const SYMPTOM_LABEL = Object.fromEntries(
  Object.values(OTF_SYMPTOMS).flat().map(s => [s.key, s.label])
);

function n(v) {
  if (v == null || v === '') return null;
  const num = parseFloat(v);
  if (isNaN(num)) return null;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function buildSentences(rt, draft) {
  const out = [];
  const add = (s) => { if (s) out.push(s); };

  if (rt === 'pre_session') {
    const vah = n(draft.prev_vah), poc = n(draft.prev_poc), val = n(draft.prev_val);
    if (vah || poc || val) {
      const lvls = [vah && `VAH ${vah}`, poc && `POC ${poc}`, val && `VAL ${val}`].filter(Boolean);
      add(`Prior session value area — ${lvls.join(', ')}.`);
    }
    if (draft.prev_session_type) add(`Prior session was a ${draft.prev_session_type}.`);
    if (draft.bias) add(`Approaching today with a ${BIAS_FULL[draft.bias]} bias.`);
    if (draft.observation?.trim()) add(draft.observation.trim());
    if (draft.open_question?.trim()) add(`Thesis: ${draft.open_question.trim()}`);
  }

  else if (rt === 'opening') {
    const op = n(draft.opening_price);
    const gap = draft.gap_type ? GAP_TEXT[draft.gap_type] : null;
    if (op) add(`Market opened at ${op}${gap ? ` — ${gap}` : ''}.`);
    if (draft.bias) add(`Opening bias: ${BIAS_FULL[draft.bias]}.`);
    if (draft.observation?.trim()) add(draft.observation.trim());
  }

  else if (rt === 'tpo_a') {
    const ph = n(draft.period_high), pl = n(draft.period_low), pr = n(draft.period_range);
    if (ph || pl) {
      const range = ph && pl ? `between ${pl} and ${ph}` : ph ? `up to ${ph}` : `down to ${pl}`;
      add(`A-period traded ${range}${pr ? `, spanning ${pr} points` : ''}.`);
    }
    if (draft.extension_direction) add(`Initial Balance extended ${EXT_TEXT[draft.extension_direction]}.`);
    const avah = n(draft.a_vah), apoc = n(draft.a_poc), aval = n(draft.a_val);
    if (avah || apoc || aval) {
      const lvls = [avah && `VAH ${avah}`, apoc && `POC ${apoc}`, aval && `VAL ${aval}`].filter(Boolean);
      add(`A-period value area established — ${lvls.join(', ')}.`);
    }
    if (draft.bias) add(`Bias: ${BIAS_FULL[draft.bias]}.`);
    if (draft.observation?.trim()) add(draft.observation.trim());
  }

  else if (rt === 'ib_complete') {
    const ph = n(draft.period_high), pl = n(draft.period_low), pr = n(draft.period_range);
    if (ph || pl) {
      add(`Initial Balance complete — High ${ph ?? '—'}, Low ${pl ?? '—'}${pr ? `, range ${pr} points` : ''}.`);
    }
    if (draft.observation?.trim()) add(draft.observation.trim());
  }

  else if (rt === 'tpo') {
    const ph = n(draft.period_high), pl = n(draft.period_low), pr = n(draft.period_range);
    if (ph || pl) {
      const range = ph && pl ? `between ${pl} and ${ph}` : ph ? `up to ${ph}` : `down to ${pl}`;
      add(`Period traded ${range}${pr ? ` (${pr} pts)` : ''}.`);
    }
    if (draft.location_vs_a_footprint) add(`Relative to A footprint: ${LOCATION_A_FP_TEXT[draft.location_vs_a_footprint]}.`);

    const symptoms = Array.isArray(draft.otf_symptoms) ? draft.otf_symptoms : [];
    if (symptoms.length > 0) {
      const labels = symptoms.map(k => SYMPTOM_LABEL[k]).filter(Boolean);
      if (labels.length) add(`OTF signals observed — ${labels.join(', ')}.`);
    }

    if (draft.va_migration_poc) {
      add(`POC ${POC_MIGRATION_TEXT[draft.va_migration_poc]}.`);
    }

    if (draft.bias) add(`Bias at this stage: ${BIAS_FULL[draft.bias]}.`);
    if (draft.observation?.trim()) add(draft.observation.trim());
    if (draft.open_question?.trim()) add(`Open question: ${draft.open_question.trim()}`);
  }

  else if (rt === 'structure_event') {
    const type  = draft.structure_event_type ? STRUCT_TEXT[draft.structure_event_type] : null;
    const price = n(draft.price_reference);
    const acc   = draft.acceptance;
    if (type || price) {
      add(`${type ?? 'Structure event'}${price ? ` at ${price}` : ''}${acc ? ` — ${acc}` : ''}.`);
    }
    if (draft.bias) add(`Bias: ${BIAS_FULL[draft.bias]}.`);
    if (draft.observation?.trim()) add(draft.observation.trim());
  }

  return out;
}

export default function NarrativeBlock({ draft, entry }) {
  const sentences = buildSentences(entry.row_type, draft);
  if (sentences.length === 0) return null;

  const biasStyle = draft.bias ? BIAS_STYLE[draft.bias] : null;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: '#0d1117', borderColor: '#1f2937' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[9px] uppercase tracking-widest text-gray-600">Narrative</p>
        {biasStyle && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded border font-semibold"
            style={{ background: biasStyle.bg, borderColor: biasStyle.border, color: biasStyle.text }}
          >
            {BIAS_FULL[draft.bias]}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {sentences.map((s, i) => (
          <p key={i} className="text-[12px] leading-relaxed text-gray-400">{s}</p>
        ))}
      </div>
    </div>
  );
}
