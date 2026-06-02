import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import { useLanguage } from '../../hooks/useLanguage';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// ── Theme constants ───────────────────────────────────────────────────────────
const GRID  = '#1f2937';
const AXIS  = '#6b7280';
const TT    = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', padding: '8px 12px' };

const C = {
  total:      '#374151',
  planned:    '#6366f1',
  planRate:   '#a78bfa',
  successful: '#10b981',
  failed:     '#ef4444',
  costToCost: '#f59e0b',
  unplanned:  '#8b5cf6',
  cancelled:  '#6b7280',
  waiting:    '#fbbf24',
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function fmtMonth(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleString('en', { month: 'short' }) + " '" + y.slice(2);
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round(((num || 0) / den) * 100);
}

// ── Shared tiny components ────────────────────────────────────────────────────
function ChartQuestion({ text }) {
  return (
    <div className="flex items-start gap-2 mt-1 mb-4">
      <div className="w-0.5 self-stretch bg-primary-500/50 rounded-full flex-shrink-0 min-h-[1.2rem]" />
      <p className="text-xs text-primary-300/75 italic leading-relaxed">{text}</p>
    </div>
  );
}

function KPICard({ label, value, sub, color = 'text-gray-100' }) {
  return (
    <div className="glass-card p-4 space-y-1">
      <span className="block text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`block text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="block text-xs text-gray-600 leading-relaxed">{sub}</span>}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-2">
      <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span className="text-sm">{msg}</span>
    </div>
  );
}

// ── Custom tooltips ───────────────────────────────────────────────────────────
function MonthTooltip({ active, payload, label }) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div style={TT} className="text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-gray-200 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-gray-200 font-medium ml-auto pl-2">
            {p.dataKey === 'planRate' ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutTooltip({ active, payload }) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div style={TT} className="text-xs">
      <span className="text-gray-400">{payload[0].name}: </span>
      <span className="text-gray-200 font-semibold">{payload[0].value} {t('daysUnit')}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntradayReport() {
  const { symbols } = useApp();
  const { t } = useLanguage();
  const [symbolId, setSymbolId] = useState(null);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Default to Nifty once symbols load
  useEffect(() => {
    if (symbols.length > 0 && symbolId === null) {
      const nifty = symbols.find((s) => s.name.toLowerCase() === 'nifty') || symbols[0];
      setSymbolId(nifty.id);
    }
  }, [symbols]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    window.api.report.intraday(symbolId)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message || 'Failed to load report'); setLoading(false); });
  }, [symbolId]);

  // ── Derived data ──
  const monthly = (data?.monthly || []).map((r) => ({
    ...r,
    label:    fmtMonth(r.month),
    planRate: pct(r.plannedDays, r.totalDays),
  }));

  const bd = data?.breakdown || {};
  const totalDays   = bd.totalDays  || 0;
  const prepRate    = pct(bd.plannedDays, bd.totalDays);
  const closedPlans = (bd.successful || 0) + (bd.failed || 0) + (bd.costToCost || 0);
  const successRate = pct(bd.successful, closedPlans);

  const donutSlices = [
    { name: 'Successful',   value: bd.successful || 0, color: C.successful },
    { name: 'Failed',       value: bd.failed     || 0, color: C.failed     },
    { name: 'Cost-to-Cost', value: bd.costToCost || 0, color: C.costToCost },
    { name: 'UnPlanned',    value: bd.unplanned  || 0, color: C.unplanned  },
    { name: t('cancelled'), value: bd.cancelled  || 0, color: C.cancelled  },
    { name: t('waiting'),   value: bd.waiting    || 0, color: C.waiting    },
  ].filter((s) => s.value > 0);

  const xInterval = monthly.length > 12 ? Math.floor(monthly.length / 10) : 0;

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-500 text-sm">{t('loadingReport')}</div>;
  if (error)   return <div className="flex items-center justify-center py-32 text-red-400 text-sm">{error}</div>;

  return (
    <div className="space-y-6">

      {/* Symbol filter */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-gray-500">{t('symbol')}</span>
        <select
          value={symbolId || ''}
          onChange={(e) => setSymbolId(e.target.value ? Number(e.target.value) : null)}
          className="input-field text-xs py-1 w-auto"
        >
          <option value="">{t('allSymbols')}</option>
          {symbols.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* ── Chart 1: Monthly Activity ── */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-gray-200">{t('monthlyActivity')}</h4>
        <ChartQuestion text='"Am I showing up prepared, and is it improving over time?"' />
        {monthly.length === 0
          ? <Empty msg="No trading days logged yet" />
          : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthly} margin={{ top: 4, right: 44, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis yAxisId="left"  tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: C.planRate, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                <Bar yAxisId="left" dataKey="totalDays"   name={t('totalDaysBar')}  fill={C.total}   radius={[3,3,0,0]} maxBarSize={28} />
                <Bar yAxisId="left" dataKey="plannedDays" name={t('daysWithPlan')}  fill={C.planned} radius={[3,3,0,0]} maxBarSize={28} />
                <Line yAxisId="right" type="monotone" dataKey="planRate" name={t('planRateLine')} stroke={C.planRate} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* ── Row 2: Donut + KPIs ── */}
      <div className="grid grid-cols-5 gap-5">

        {/* Donut with CSS-overlay center label */}
        <div className="col-span-2 glass-card p-5">
          <h4 className="text-sm font-semibold text-gray-200">{t('verdictBreakdown')}</h4>
          <ChartQuestion text='"What is my actual win rate across all logged days?"' />
          {donutSlices.length === 0
            ? <Empty msg="No verdicts recorded yet" />
            : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donutSlices} cx="50%" cy="45%" innerRadius={62} outerRadius={88} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                      {donutSlices.map((s, i) => <Cell key={i} fill={s.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label overlay */}
                <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ top: '20%', pointerEvents: 'none' }}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-100">{totalDays}</div>
                    <div className="text-xs text-gray-500">{t('daysUnit')}</div>
                  </div>
                </div>
              </div>
            )
          }
        </div>

        {/* KPI cards */}
        <div className="col-span-3 grid grid-rows-3 gap-4">
          <KPICard
            label={t('totalDaysLogged')}
            value={totalDays}
            sub="trading days recorded in the journal"
          />
          <KPICard
            label={t('preparationRate')}
            value={`${prepRate}%`}
            sub="of reviewed days had a prepared plan"
            color={prepRate >= 70 ? 'text-emerald-400' : prepRate >= 40 ? 'text-amber-400' : 'text-red-400'}
          />
          <KPICard
            label={t('passRate')}
            value={`${successRate}%`}
            sub={`${bd.successful || 0} successful / ${closedPlans} closed plans`}
            color={successRate >= 60 ? 'text-emerald-400' : successRate >= 40 ? 'text-amber-400' : 'text-red-400'}
          />
        </div>

      </div>
    </div>
  );
}
