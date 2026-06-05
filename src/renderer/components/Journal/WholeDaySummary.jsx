import React, { useCallback } from 'react';
import { BIAS_DARK, fmt } from './journalConstants';
import { buildSentences } from './NarrativeBlock';

const PERIOD_META = {
  pre_session:     { short: 'P',  full: 'Pre-Session' },
  opening:         { short: 'O',  full: 'Opening' },
  tpo_a:           { short: 'A',  full: 'TPO A  ·  Footprint' },
  ib_complete:     { short: 'IB', full: 'IB Complete' },
  tpo:             { short: '',   full: 'TPO' },
  structure_event: { short: '!',  full: 'Structure Event' },
};

const BIAS_FULL = {
  initiative_long:  'Initiative Long',
  initiative_short: 'Initiative Short',
  responsive_long:  'Responsive Long',
  responsive_short: 'Responsive Short',
  neutral:          'Neutral',
};

function computeDayRange(entries) {
  const highs  = entries.map(e => parseFloat(e.period_high)).filter(v => !isNaN(v));
  const lows   = entries.map(e => parseFloat(e.period_low)).filter(v => !isNaN(v));
  const closes = [...entries].reverse().map(e => parseFloat(e.period_close)).filter(v => !isNaN(v));
  return {
    dayHigh:  highs.length  ? Math.max(...highs)  : null,
    dayLow:   lows.length   ? Math.min(...lows)   : null,
    dayClose: closes.length ? closes[0]           : null,
  };
}

function buildMarkdown(session, sections, entries) {
  const lines = [];
  const { dayHigh, dayLow, dayClose } = computeDayRange(entries);

  lines.push(`# Whole Day Narrative — ${session.session_date} · ${session.instrument}`);
  lines.push('');

  const hasPrev    = session.prev_vah || session.prev_poc || session.prev_val;
  const hasCurrent =
    session.opening_price ||
    session.a_vah || session.a_poc || session.a_val ||
    session.ib_high || session.ib_low ||
    dayHigh != null || dayLow != null || dayClose != null;

  if (hasPrev || hasCurrent) {
    lines.push('## Key Reference Points');
    lines.push('');

    if (hasPrev) {
      lines.push('### Previous');
      const type  = session.prev_session_type ? ` (${session.prev_session_type})` : '';
      const parts = [
        session.prev_vah && `VAH ${fmt(session.prev_vah)}`,
        session.prev_poc && `POC ${fmt(session.prev_poc)}`,
        session.prev_val && `VAL ${fmt(session.prev_val)}`,
      ].filter(Boolean);
      lines.push(`**Value Area**${type}: ${parts.join(' · ')}`);
      lines.push('');
    }

    if (hasCurrent) {
      lines.push('### Current');
      if (session.opening_price) {
        const gap = session.gap_type ? ` (${session.gap_type.replace(/_/g, ' ')})` : '';
        lines.push(`**Opening**: ${fmt(session.opening_price)}${gap}`);
      }
      if (session.a_vah || session.a_poc || session.a_val) {
        const parts = [
          session.a_vah && `VAH ${fmt(session.a_vah)}`,
          session.a_poc && `POC ${fmt(session.a_poc)}`,
          session.a_val && `VAL ${fmt(session.a_val)}`,
        ].filter(Boolean);
        lines.push(`**A-Footprint**: ${parts.join(' · ')}`);
      }
      if (session.ib_high || session.ib_low) {
        const parts = [
          session.ib_high  && `High ${fmt(session.ib_high)}`,
          session.ib_low   && `Low ${fmt(session.ib_low)}`,
          session.ib_range && `Range ${fmt(session.ib_range)} pts`,
        ].filter(Boolean);
        lines.push(`**Initial Balance**: ${parts.join(' · ')}`);
      }
      if (dayHigh != null || dayLow != null || dayClose != null) {
        const parts = [
          dayHigh  != null && `High ${fmt(dayHigh)}`,
          dayLow   != null && `Low ${fmt(dayLow)}`,
          dayClose != null && `Close ${fmt(dayClose)}`,
        ].filter(Boolean);
        lines.push(`**Day Range**: ${parts.join(' · ')}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Narrative sections
  for (const { entry, draft, sentences } of sections) {
    const meta    = PERIOD_META[entry.row_type] || { full: entry.tpo_label };
    const fullLbl = entry.row_type === 'tpo' ? `TPO ${entry.tpo_label}` : meta.full;
    const time    = entry.time_from
      ? ` · ${entry.time_from}${entry.time_to ? `–${entry.time_to}` : ''}`
      : '';
    const bias    = draft.bias ? ` · ${BIAS_FULL[draft.bias] ?? draft.bias}` : '';

    lines.push(`## ${fullLbl}${time}${bias}`);
    lines.push('');
    for (const s of sentences) lines.push(s);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

async function downloadMarkdown(session, sections, entries) {
  const md       = buildMarkdown(session, sections, entries);
  const filename = `journal-${session.session_date}-${session.instrument}.md`;
  await window.api.journal.exportMarkdown(md, filename);
}

function buildEntryDraft(entry, session) {
  const d = { ...entry };
  if (entry.row_type === 'pre_session') {
    d.prev_vah          = session.prev_vah;
    d.prev_poc          = session.prev_poc;
    d.prev_val          = session.prev_val;
    d.prev_session_type = session.prev_session_type;
  }
  if (entry.row_type === 'opening') {
    d.opening_price = session.opening_price;
    d.gap_type      = session.gap_type;
  }
  if (entry.row_type === 'tpo_a') {
    d.a_vah = session.a_vah;
    d.a_poc = session.a_poc;
    d.a_val = session.a_val;
  }
  return d;
}

function RefChip({ label, value, color }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[9px] uppercase tracking-wider" style={{ color: '#4b5563' }}>{label}</span>
      <span className="text-[12px] font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

export default function WholeDaySummary({ session, onSelectEntry }) {
  const entries = session.entries ?? [];

  const sections = entries.map(entry => {
    const draft     = buildEntryDraft(entry, session);
    const sentences = buildSentences(entry.row_type, draft);
    return { entry, draft, sentences };
  }).filter(({ sentences }) => sentences.length > 0);

  const { dayHigh, dayLow, dayClose } = computeDayRange(entries);

  const hasPrev    = session.prev_vah || session.prev_poc || session.prev_val;
  const hasCurrent =
    session.opening_price ||
    session.a_vah || session.a_poc || session.a_val ||
    session.ib_high || session.ib_low ||
    dayHigh != null || dayLow != null || dayClose != null;
  const hasRefPoints = hasPrev || hasCurrent;

  const handleDownload = useCallback(() => {
    downloadMarkdown(session, sections, entries);
  }, [session, sections, entries]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden border-l-4"
      style={{ borderLeftColor: '#1e3a4a' }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ background: '#0d1117', borderColor: '#1f2937' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#4b5563' }}>
            Whole Day Narrative
          </p>
          <p className="text-[13px] font-semibold text-gray-200 truncate">
            {session.session_date}&nbsp;&middot;&nbsp;{session.instrument}
          </p>
        </div>
        <div
          className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold border"
          style={{
            background: 'rgba(0,119,187,0.12)',
            borderColor: 'rgba(0,119,187,0.35)',
            color: '#7ab8e8',
          }}
        >
          {sections.length} period{sections.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={handleDownload}
          disabled={sections.length === 0}
          title="Download as Markdown"
          className="shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium border transition-colors disabled:opacity-30"
          style={{
            background: 'rgba(20,40,20,0.6)',
            borderColor: 'rgba(52,211,153,0.3)',
            color: '#34d399',
          }}
          onMouseEnter={e => { if (sections.length > 0) e.currentTarget.style.background = 'rgba(20,40,20,0.9)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(20,40,20,0.6)'; }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          .md
        </button>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-5"
        style={{ background: '#080c12' }}
      >
        {/* Key Reference Points */}
        {hasRefPoints && (
          <div
            className="rounded-lg border p-4 space-y-4"
            style={{ background: '#0d1117', borderColor: '#1f2937' }}
          >
            <p className="text-[9px] uppercase tracking-widest" style={{ color: '#4b5563' }}>
              Key Reference Points
            </p>

            <div className="flex gap-0 min-w-0">
              {/* ── PREVIOUS ── */}
              {hasPrev && (
                <div className="space-y-2 shrink-0 pr-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(100,60,10,0.4)', color: '#d97706' }}
                    >
                      Previous
                    </span>
                    {session.prev_session_type && (
                      <span className="text-[9px]" style={{ color: '#4b5563' }}>{session.prev_session_type}</span>
                    )}
                  </div>
                  <div
                    className="pl-3 border-l-2 space-y-1.5"
                    style={{ borderColor: 'rgba(217,119,6,0.25)' }}
                  >
                    {(session.prev_vah || session.prev_poc || session.prev_val) && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-widest" style={{ color: '#374151' }}>Value Area</p>
                        <div className="flex gap-4 flex-wrap">
                          {session.prev_vah && <RefChip label="VAH" value={fmt(session.prev_vah)} color="#34d399" />}
                          {session.prev_poc && <RefChip label="POC" value={fmt(session.prev_poc)} color="#fbbf24" />}
                          {session.prev_val && <RefChip label="VAL" value={fmt(session.prev_val)} color="#f87171" />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vertical divider */}
              {hasPrev && hasCurrent && (
                <div className="self-stretch w-px shrink-0 mx-1" style={{ background: '#1f2937' }} />
              )}

              {/* ── CURRENT ── */}
              {hasCurrent && (
                <div className="space-y-2 flex-1 min-w-0 pl-5">
                  <span
                    className="inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(0,80,160,0.35)', color: '#7ab8e8' }}
                  >
                    Current
                  </span>
                  <div
                    className="pl-3 border-l-2"
                    style={{ borderColor: 'rgba(0,119,187,0.25)' }}
                  >
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {session.opening_price && (
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest" style={{ color: '#374151' }}>Opening</p>
                          <div className="flex gap-3 flex-wrap items-baseline">
                            <RefChip label="Open" value={fmt(session.opening_price)} color="#a78bfa" />
                            {session.gap_type && (
                              <span className="text-[9px]" style={{ color: '#4b5563' }}>
                                {session.gap_type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {(session.a_vah || session.a_poc || session.a_val) && (
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest" style={{ color: '#374151' }}>A-Footprint</p>
                          <div className="flex gap-3 flex-wrap">
                            {session.a_vah && <RefChip label="VAH" value={fmt(session.a_vah)} color="#34d399" />}
                            {session.a_poc && <RefChip label="POC" value={fmt(session.a_poc)} color="#fbbf24" />}
                            {session.a_val && <RefChip label="VAL" value={fmt(session.a_val)} color="#f87171" />}
                          </div>
                        </div>
                      )}
                      {(session.ib_high || session.ib_low) && (
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest" style={{ color: '#374151' }}>Initial Balance</p>
                          <div className="flex gap-3 flex-wrap">
                            {session.ib_high  && <RefChip label="High" value={fmt(session.ib_high)}  color="#34d399" />}
                            {session.ib_low   && <RefChip label="Low"  value={fmt(session.ib_low)}   color="#f87171" />}
                            {session.ib_range && <RefChip label="Rng"  value={fmt(session.ib_range)} color="#9ca3af" />}
                          </div>
                        </div>
                      )}
                      {(dayHigh != null || dayLow != null || dayClose != null) && (
                        <div className="space-y-1">
                          <p className="text-[9px] uppercase tracking-widest" style={{ color: '#374151' }}>Day Range</p>
                          <div className="flex gap-3 flex-wrap">
                            {dayHigh  != null && <RefChip label="High"  value={fmt(dayHigh)}  color="#34d399" />}
                            {dayLow   != null && <RefChip label="Low"   value={fmt(dayLow)}   color="#f87171" />}
                            {dayClose != null && <RefChip label="Close" value={fmt(dayClose)} color="#e2e8f0" />}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Narrative timeline */}
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <p className="text-sm" style={{ color: '#4b5563' }}>No narrative data yet.</p>
            <p className="text-xs" style={{ color: '#374151' }}>
              Fill in the individual TPO periods to generate the whole-day narrative.
            </p>
          </div>
        ) : (
          <div>
            {sections.map(({ entry, draft, sentences }, idx) => {
              const meta      = PERIOD_META[entry.row_type] || { short: entry.tpo_label, full: entry.tpo_label };
              const shortLbl  = entry.row_type === 'tpo' ? entry.tpo_label : meta.short;
              const fullLbl   = entry.row_type === 'tpo' ? `TPO ${entry.tpo_label}` : meta.full;
              const isStruct  = entry.row_type === 'structure_event';
              const biasTheme = draft.bias ? BIAS_DARK[draft.bias] : null;
              const isLast    = idx === sections.length - 1;

              return (
                <div key={entry.id} className="relative flex gap-3 pb-5">
                  {/* Vertical connector */}
                  {!isLast && (
                    <div
                      className="absolute left-[18px] top-[38px] bottom-0 w-px"
                      style={{ background: '#1f2937' }}
                    />
                  )}

                  {/* Period badge */}
                  <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold border mt-0.5"
                    style={isStruct
                      ? { background: '#2a1510', borderColor: '#712B13', color: '#e87060' }
                      : { background: '#1e2130', borderColor: '#2e3348', color: '#a5b4fc' }}
                  >
                    {shortLbl}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onSelectEntry(entry)}
                        className="text-[11px] font-semibold transition-colors"
                        style={{ color: '#9ca3af' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e5e7eb'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
                        title="Go to this period"
                      >
                        {fullLbl}
                      </button>
                      {entry.time_from && (
                        <span className="text-[9px]" style={{ color: '#374151' }}>
                          {entry.time_from}{entry.time_to ? `–${entry.time_to}` : ''}
                        </span>
                      )}
                      {biasTheme && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded border font-semibold"
                          style={{
                            background:  biasTheme.bg,
                            borderColor: biasTheme.border,
                            color:       biasTheme.text,
                          }}
                        >
                          {biasTheme.label}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {sentences.map((s, i) => (
                        <p key={i} className="text-[12px] leading-relaxed" style={{ color: '#9ca3af' }}>
                          {s}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
