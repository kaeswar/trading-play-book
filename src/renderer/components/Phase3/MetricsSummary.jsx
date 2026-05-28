import React, { useState, useEffect } from 'react';
import { POSSIBILITIES, formatPossibilityCode } from '../../../shared/constants';

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

  const mostPlannedLabel = metrics.mostPlannedPossibility?.code
    ? formatPossibilityCode(metrics.mostPlannedPossibility.code)
    : 'N/A';
  const mostOccurredLabel = metrics.mostOccurredPossibility?.code
    ? formatPossibilityCode(metrics.mostOccurredPossibility.code)
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
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
          value={`${metrics.preparationRate}%`}
          subtitle={`${metrics.preparedDays} of ${metrics.totalDays} days`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />
        <MetricCard
          title="Plan Match Rate"
          value={`${metrics.planMatchRate}%`}
          subtitle="Plans matching verdicts"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="blue"
        />
        <MetricCard
          title="Total Days"
          value={metrics.totalDays}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Possibility Insights */}
        <div className="glass-card p-5">
          <h4 className="section-title mb-4">Default Plan Insights</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">Most Planned</p>
                <p className="text-sm font-medium text-gray-200">{mostPlannedLabel}</p>
              </div>
              <span className="badge bg-primary-500/20 text-primary-400 text-xs">
                {metrics.mostPlannedPossibility?.count || 0} times
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">Most Occurred</p>
                <p className="text-sm font-medium text-gray-200">{mostOccurredLabel}</p>
              </div>
              <span className="badge bg-emerald-500/20 text-emerald-400 text-xs">
                {metrics.mostOccurredPossibility?.count || 0} times
              </span>
            </div>
          </div>
        </div>

        {/* Outcome Distribution */}
        <div className="glass-card p-5">
          <h4 className="section-title mb-4">Outcome Distribution</h4>
          <div className="space-y-3">
            {metrics.outcomeDistribution?.map((item) => {
              const total = metrics.totalDays || 1;
              const pct = Math.round((item.count / total) * 100);
              const colors = {
                Accepted: 'bg-emerald-500',
                Rejected: 'bg-red-500',
              };

              return (
                <div key={item.outcome}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{item.outcome}</span>
                    <span className="text-xs text-gray-500">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[item.outcome] || 'bg-gray-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bias Distribution */}
        <div className="glass-card p-5">
          <h4 className="section-title mb-4">Bias Distribution</h4>
          <div className="space-y-3">
            {metrics.biasDistribution?.map((item) => {
              const total = metrics.totalDays || 1;
              const pct = Math.round((item.count / total) * 100);
              const colors = {
                Bullish: 'bg-blue-500',
                Bearish: 'bg-red-500',
              };

              return (
                <div key={item.bias}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{item.bias}</span>
                    <span className="text-xs text-gray-500">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[item.bias] || 'bg-gray-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
