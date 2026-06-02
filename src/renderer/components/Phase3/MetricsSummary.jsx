import React, { useState, useEffect } from 'react';

export default function MetricsSummary({ symbolId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await window.api.query.getMetrics(symbolId);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [symbolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-500">No metrics available</p>
      </div>
    );
  }

  const preparationRate = metrics.totalDays > 0
    ? Math.round((metrics.preparedDays / metrics.totalDays) * 100)
    : 0;
  const closedPlans = (metrics.successfulPlans || 0) + (metrics.failedPlans || 0) + (metrics.costToCostPlans || 0);
  const passRate = closedPlans > 0
    ? Math.round((metrics.successfulPlans / closedPlans) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Days"
          value={metrics.totalDays}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="primary"
        />
        <MetricCard
          title="Preparation Rate"
          value={`${preparationRate}%`}
          subtitle={`${metrics.preparedDays} of ${metrics.totalDays} days`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />
        <MetricCard
          title="Total Plans"
          value={metrics.totalPlans}
          subtitle={`${closedPlans} closed`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          color="blue"
        />
        <MetricCard
          title="Pass Rate"
          value={`${passRate}%`}
          subtitle={`${metrics.successfulPlans} successful · ${metrics.failedPlans} failed`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="purple"
        />
      </div>

      <div className="glass-card p-5">
        <h4 className="section-title mb-4">Plan Status Breakdown</h4>
        <div className="space-y-3">
          {[
            { label: 'Successful',   count: metrics.successfulPlans,  color: 'bg-emerald-500' },
            { label: 'Failed',       count: metrics.failedPlans,      color: 'bg-red-500' },
            { label: 'Cost-to-Cost', count: metrics.costToCostPlans,  color: 'bg-amber-500' },
            { label: 'UnPlanned',    count: metrics.unplannedPlans,   color: 'bg-violet-500' },
            { label: 'Cancelled',    count: metrics.cancelledPlans,   color: 'bg-gray-500' },
            { label: 'Waiting',      count: metrics.waitingPlans,     color: 'bg-amber-400' },
          ].map(row => {
            const total = metrics.totalPlans || 1;
            const pct = Math.round((row.count / total) * 100);
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{row.label}</span>
                  <span className="text-xs text-gray-500">{row.count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className={`glass-card p-4 border ${colorClasses[color] || colorClasses.primary}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]?.split(' ')[0]}`}>
          {icon}
        </div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
