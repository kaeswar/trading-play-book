import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import {
  STOCK_PLAN_BIAS_COLORS,
  BEHAVIOR_TAGS, deriveBehaviorTag,
} from '../../../shared/constants';
import BiasMultiSelect from '../shared/BiasMultiSelect';

// Pick template(s) from the Plan Store.
// Props:
//   tradeType  — 'Intraday' | 'Swing' (filter; Both templates appear in either)
//   singlePick — when true, selecting a template replaces the prior selection (radio-like)
//   onConfirm(templateIds) — called with array of selected IDs
export default function PlanStorePicker({ tradingDay, onConfirm, onClose, tradeType = 'Intraday', singlePick = false, confirmLabel }) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const [activeGroup, setActiveGroup] = useState('all');
  const [biasSet, setBiasSet]         = useState(() => new Set());
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [grps, tpls] = await Promise.all([
      window.api.planGroup.list(),
      window.api.planTemplate.list({
        tradeType,                                        // returns tradeType + Both
        groupId: activeGroup === 'all' ? undefined : activeGroup,
        biases: biasSet.size > 0 ? [...biasSet] : undefined,
        search: search.trim() || undefined,
        includeArchived: false,
      }),
    ]);
    setGroups(grps);
    setTemplates(tpls);
  }, [tradeType, activeGroup, biasSet, search]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => {
    if (singlePick) {
      // Replace selection — radio-like
      setSelected(selected.has(id) ? new Set() : new Set([id]));
    } else {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelected(next);
    }
  };

  const handleConfirm = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await onConfirm(ids);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-800 border border-surface-600 rounded-xl w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-600/50">
          <div>
            <h2 className="text-base font-semibold text-gray-200">{t('pickPlansTitle')}</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">{t('pickPlansSub')}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: groups sidebar + grid */}
        <div className="flex-1 overflow-hidden flex">
          {/* Groups sidebar */}
          <aside className="w-52 flex-shrink-0 border-r border-surface-600/50 overflow-y-auto p-3 space-y-0.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1 block">
              {t('planGroups')}
            </span>
            <GroupBtn active={activeGroup === 'all'} onClick={() => setActiveGroup('all')}>
              {t('allGroups')}
            </GroupBtn>
            <GroupBtn active={activeGroup === 'uncategorized'} onClick={() => setActiveGroup('uncategorized')}>
              {t('uncategorized')}
            </GroupBtn>
            <div className="my-2 border-t border-surface-600/30" />
            {groups.map((g) => (
              <GroupBtn key={g.id} active={activeGroup === g.id} onClick={() => setActiveGroup(g.id)}>
                <span className="flex items-center gap-1.5">
                  <span className="truncate flex-1">{g.name}</span>
                  {g.is_system === 1 && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">SYS</span>
                  )}
                </span>
              </GroupBtn>
            ))}
          </aside>

          {/* Right pane */}
          <section className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
            {/* Filter row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchTemplates')}
                className="input-field text-sm"
              />
              <BiasMultiSelect selected={biasSet} onChange={setBiasSet} />
            </div>

            {/* Grid */}
            {templates.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-sm text-gray-500">{t('noTemplatesFound')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((tpl) => (
                  <PickerCard
                    key={tpl.id}
                    template={tpl}
                    selected={selected.has(tpl.id)}
                    onToggle={() => toggle(tpl.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-600/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {t('selectedCount').replace('{n}', selected.size)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-5 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirmLabel || t('addToDay')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'text-primary-300 bg-primary-600/10'
          : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/40'
      }`}
    >
      {children}
    </button>
  );
}

function PickerCard({ template, selected, onToggle }) {
  const tag = deriveBehaviorTag(template.bias, template.behavior_tag);
  const tagColors = tag ? BEHAVIOR_TAGS[tag] : null;
  const biasColors = template.bias ? STOCK_PLAN_BIAS_COLORS[template.bias] : null;

  return (
    <button
      onClick={onToggle}
      className={`text-left glass-card p-3 space-y-2 transition-all border ${
        selected
          ? 'border-primary-500/60 ring-1 ring-primary-500/40'
          : 'hover:border-primary-500/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-gray-200 truncate">{template.name}</h3>
            {(template.screenshot_path || template.description) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.api.planTemplate.openViewer(template);
                }}
                title="View template reference"
                className="flex-shrink-0 text-teal-400 hover:text-teal-300 transition-colors p-0.5 rounded"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            )}
          </div>
          {template.group_name && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{template.group_name}</p>
          )}
        </div>
        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
          selected ? 'bg-primary-500 border-primary-500' : 'border-surface-500'
        }`}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {biasColors && (
          <span className={`text-[10px] px-2 py-0.5 rounded ${biasColors.bg} ${biasColors.text} ${biasColors.border} border`}>
            {template.bias}
          </span>
        )}
        {tagColors && tag !== template.bias && (
          <span className={`text-[10px] px-2 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
            {tag}
          </span>
        )}
        {template.trade_type === 'Both' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Both
          </span>
        )}
      </div>

      {template.description && (
        <p className="text-[10px] text-gray-500 line-clamp-2">{template.description}</p>
      )}
    </button>
  );
}

