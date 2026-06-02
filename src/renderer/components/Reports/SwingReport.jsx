import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell,
} from 'recharts';

// ── Theme constants ───────────────────────────────────────────────────────────
const GRID = '#1f2937';
const AXIS = '#6b7280';
const TT   = { backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', padding: '8px 12px' };

const C = {
  Successful:    '#10b981',
  Failed:        '#ef4444',
  'Cost-to-Cost':'#f59e0b',
  UnPlanned:     '#8b5cf6',
  Cancelled:     '#6b7280',
  Waiting:       '#6366f1',
};

const STATUS_ORDER = ['Successful', 'Failed', 'Cost-to-Cost', 'UnPlanned', 'Cancelled', 'Waiting'];
const TF_ORDER     = ['Monthly', 'Weekly', 'Daily', '4Hrs', '1Hrs'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(num, den) {
  if (!den) return 0;
  return Math.round(((num || 0) / den) * 100);
}

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
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <span className="text-sm">{msg}</span>
    </div>
  );
}

function StatusTooltip({ active, payload }) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div style={TT} className="text-xs">
      <span className="text-gray-400">{payload[0].name}: </span>
      <span className="text-gray-200 font-semibold">{payload[0].value} {t('plansUnit')}</span>
    </div>
  );
}

function TFTooltip({ active, payload, label }) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  const closedKeys = ['Successful', 'Failed', 'Cost-to-Cost'];
  const closed = payload
    .filter((p) => closedKeys.includes(p.dataKey))
    .reduce((s, p) => s + (p.value || 0), 0);
  const successVal = payload.find((p) => p.dataKey === 'Successful')?.value || 0;
  return (
    <div style={TT} className="text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-gray-200 mb-1.5">{label}</p>
      {payload.map((p) => p.value > 0 && (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-gray-200 font-medium ml-auto pl-2">{p.value}</span>
        </div>
      ))}
      {closed > 0 && (
        <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between">
          <span className="text-gray-500">{t('winRate')}:</span>
          <span className="text-emerald-400 font-semibold">{pct(successVal, closed)}%</span>
        </div>
      )}
    </div>
  );
}

function WinRateLabel({ x, y, width, height, value }) {
  if (!value) return null;
  return (
    <text x={x + width + 6} y={y + height / 2 + 4} fill="#9ca3af" fontSize={10}>
      {value}%
    </text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SwingReport() {
  const { t } = useLanguage();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    window.api.report.swing()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message || 'Failed to load report'); setLoading(false); });
  }, []);

  // ── Derived data ──
  const statusMap = {};
  (data?.statusBreakdown || []).forEach((r) => { statusMap[r.status] = r.count; });

  const donutSlices = STATUS_ORDER
    .map((s) => ({ name: s, value: statusMap[s] || 0, color: C[s], key: s }))
    .filter((s) => s.value > 0);

  const totalPlans = donutSlices.reduce((s, d) => s + d.value, 0);

  const tfMap = {};
  (data?.byTimeframe || []).forEach((r) => { tfMap[r.timeframe] = r; });

  const tfData = TF_ORDER.filter((tf) => tfMap[tf]).map((tf) => {
    const r = tfMap[tf];
    const closed = (r.successful || 0) + (r.failed || 0) + (r.costToCost || 0);
    return {
      timeframe:      tf,
      Successful:     r.successful || 0,
      'Cost-to-Cost': r.costToCost || 0,
      Failed:         r.failed     || 0,
      UnPlanned:      r.unplanned  || 0,
      Cancelled:      r.cancelled  || 0,
      Waiting:        r.waiting    || 0,
      winRate:        pct(r.successful || 0, closed),
    };
  });

  const totals = data?.totals || {};
  const closedTotal = (totals.successful || 0) + (totals.failed || 0) + (totals.costToCost || 0);
  const overallWin  = pct(totals.successful || 0, closedTotal);

  if (loading) return <div className="flex items-center justify-center py-32 text-gray-500 text-sm">{t('loadingReport')}</div>;
  if (error)   return <div className="flex items-center justify-center py-32 text-red-400 text-sm">{error}</div>;

  return (
    <div className="space-y-6">

      {/* ── Row 1: Donut + KPIs ── */}
      <div className="grid grid-cols-5 gap-5">

        {/* Donut */}
        <div className="col-span-2 glass-card p-5">
          <h4 className="text-sm font-semibold text-gray-200">{t('executionOverview')}</h4>
          <ChartQuestion text='"How are my swing trades resolving overall?"' />
          {donutSlices.length === 0
            ? <Empty msg="No swing plans yet" />
            : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donutSlices} cx="50%" cy="45%" innerRadius={62} outerRadius={88} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                      {donutSlices.map((s, i) => <Cell key={i} fill={s.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip content={<StatusTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ top: '20%', pointerEvents: 'none' }}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-100">{totalPlans}</div>
                    <div className="text-xs text-gray-500">{t('plansUnit')}</div>
                  </div>
                </div>
              </div>
            )
          }
        </div>

        {/* KPI cards */}
        <div className="col-span-3 grid grid-rows-3 gap-4">
          <KPICard
            label={t('totalSwingPlans')}
            value={totals.total || 0}
            sub="plans created across all timeframes"
          />
          <KPICard
            label={t('overallWinRate')}
            value={`${overallWin}%`}
            sub="Successful ÷ (Successful + Failed + Cost-to-Cost)"
            color={overallWin >= 60 ? 'text-emerald-400' : overallWin >= 40 ? 'text-amber-400' : 'text-red-400'}
          />
          <KPICard
            label={t('stillOpen')}
            value={statusMap['Waiting'] || 0}
            sub="plans currently in Waiting status"
            color="text-primary-400"
          />
        </div>
      </div>

      {/* ── Chart 2: Timeframe Performance ── */}
      <div className="glass-card p-5">
        <h4 className="text-sm font-semibold text-gray-200">{t('performanceByTF')}</h4>
        <ChartQuestion text='"Which timeframe do I execute best in?"' />
        {tfData.length === 0
          ? <Empty msg="No timeframe data yet" />
          : (
            <ResponsiveContainer width="100%" height={Math.max(200, tfData.length * 68)}>
              <BarChart data={tfData} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="timeframe" tick={{ fill: '#d1d5db', fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<TFTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(v) => <span style={{ color: '#9ca3af' }}>{v}</span>} />
                <Bar dataKey="Successful"     stackId="s" fill={C.Successful}      maxBarSize={22} radius={0} />
                <Bar dataKey="Cost-to-Cost"   stackId="s" fill={C['Cost-to-Cost']} maxBarSize={22} radius={0} />
                <Bar dataKey="Failed"         stackId="s" fill={C.Failed}          maxBarSize={22} radius={0} />
                <Bar dataKey="UnPlanned"      stackId="s" fill={C.UnPlanned}       maxBarSize={22} radius={0} />
                <Bar dataKey="Cancelled"      stackId="s" fill={C.Cancelled}       maxBarSize={22} radius={0} />
                <Bar dataKey="Waiting"        stackId="s" fill={C.Waiting}         maxBarSize={22} radius={[0,4,4,0]}>
                  <LabelList dataKey="winRate" content={WinRateLabel} position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>

    </div>
  );
}
