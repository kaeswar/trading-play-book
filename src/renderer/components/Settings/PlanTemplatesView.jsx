import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useApp } from '../../store/appStore';
import {
  TRADE_TYPES, TRADE_TYPE_COLORS,
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, deriveBehaviorTag,
} from '../../../shared/constants';
import TemplateEditorModal from './TemplateEditorModal';
import GroupEditorModal from './GroupEditorModal';
import BiasMultiSelect from '../shared/BiasMultiSelect';

const TRADE_TYPE_LABEL_KEYS = {
  Intraday: 'tradeTypeIntraday',
  Swing:    'tradeTypeSwing',
  Both:     'tradeTypeBoth',
};

export default function PlanTemplatesView() {
  const { t } = useLanguage();
  const { showNotification } = useApp();

  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [activeGroup, setActiveGroup] = useState('all');           // 'all' | 'uncategorized' | number
  const [tradeType, setTradeType] = useState('');                  // '' = all
  const [biasSet, setBiasSet] = useState(() => new Set());         // empty = all biases
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal state
  const [editingTemplate, setEditingTemplate] = useState(null);    // template object or {} for new
  const [editingGroup, setEditingGroup] = useState(null);          // group object or {} for new

  const loadGroups = useCallback(async () => {
    const list = await window.api.planGroup.list();
    setGroups(list);
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        tradeType: tradeType || undefined,
        groupId: activeGroup === 'all' ? undefined : activeGroup,
        biases: biasSet.size > 0 ? [...biasSet] : undefined,
        search: search.trim() || undefined,
        includeArchived: showArchived,
      };
      const list = await window.api.planTemplate.list(filters);
      setTemplates(list);
    } finally {
      setLoading(false);
    }
  }, [tradeType, activeGroup, biasSet, search, showArchived]);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleSaveTemplate = async (payload) => {
    const fn = payload.id
      ? () => window.api.planTemplate.update(payload.id, payload)
      : () => window.api.planTemplate.create(payload);
    const res = await fn();
    if (res.success) {
      showNotification(payload.id ? 'Template updated' : 'Template created', 'success');
      setEditingTemplate(null);
      await loadTemplates();
    } else {
      showNotification(res.error || 'Save failed', 'error');
    }
  };

  const handleDeleteTemplate = async (tpl) => {
    if (!window.confirm(t('confirmDeleteTemplate'))) return;
    const res = await window.api.planTemplate.delete(tpl.id);
    if (res.success) {
      showNotification('Template deleted', 'info');
      await loadTemplates();
    } else {
      showNotification(res.error || 'Delete failed', 'error');
    }
  };

  const handleArchiveTemplate = async (tpl) => {
    const res = await window.api.planTemplate.archive(tpl.id, !tpl.is_archived);
    if (res.success) {
      showNotification(tpl.is_archived ? 'Template restored' : 'Template archived', 'info');
      await loadTemplates();
    } else {
      showNotification(res.error || 'Failed', 'error');
    }
  };

  const handleClone = async (tpl) => {
    const res = await window.api.planTemplate.clone(tpl.id);
    if (res.success) {
      showNotification('Template cloned', 'success');
      await loadTemplates();
      setEditingTemplate(res.template);
    } else {
      showNotification(res.error || 'Clone failed', 'error');
    }
  };

  const handleSaveGroup = async (payload) => {
    const fn = payload.id
      ? () => window.api.planGroup.update(payload.id, payload)
      : () => window.api.planGroup.create(payload);
    const res = await fn();
    if (res.success) {
      showNotification(payload.id ? 'Group updated' : 'Group created', 'success');
      setEditingGroup(null);
      await loadGroups();
    } else {
      showNotification(res.error || 'Save failed', 'error');
    }
  };

  const handleDeleteGroup = async (grp) => {
    if (!window.confirm(t('confirmDeleteGroup'))) return;
    const res = await window.api.planGroup.delete(grp.id);
    if (res.success) {
      showNotification('Group deleted', 'info');
      if (activeGroup === grp.id) setActiveGroup('all');
      await loadGroups();
      await loadTemplates();
    } else {
      showNotification(res.error || 'Delete failed', 'error');
    }
  };

  const totalUngrouped = useMemo(
    () => templates.filter((tp) => tp.group_id == null).length,
    [templates]
  );

  return (
    <div className="flex gap-5 min-h-[600px]">
      {/* === Groups sidebar === */}
      <aside className="w-56 flex-shrink-0">
        <div className="glass-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('planGroups')}
            </span>
            <button
              onClick={() => setEditingGroup({})}
              className="text-[11px] text-primary-400 hover:text-primary-300"
              title={t('newGroup')}
            >
              {t('addGroupInline')}
            </button>
          </div>

          <div className="space-y-0.5">
            <GroupButton
              active={activeGroup === 'all'}
              onClick={() => setActiveGroup('all')}
              label={t('allGroups')}
            />
            <GroupButton
              active={activeGroup === 'uncategorized'}
              onClick={() => setActiveGroup('uncategorized')}
              label={t('uncategorized')}
            />
            <div className="my-2 border-t border-surface-600/30" />
            {groups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                active={activeGroup === g.id}
                onClick={() => setActiveGroup(g.id)}
                onEdit={() => setEditingGroup(g)}
                onDelete={() => handleDeleteGroup(g)}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* === Templates main panel === */}
      <section className="flex-1 min-w-0 space-y-4">
        {/* Header + filters */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-gray-200">{t('planTemplates')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('planTemplatesSub')}</p>
            </div>
            <button
              onClick={() => setEditingTemplate({})}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600/20 border border-primary-500/30 text-primary-300 hover:bg-primary-600/30 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('newTemplate')}
            </button>
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchTemplates')}
              className="input-field text-sm"
            />
            <select
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">{t('allTradeTypes')}</option>
              {TRADE_TYPES.map((tt) => (
                <option key={tt} value={tt}>{t(TRADE_TYPE_LABEL_KEYS[tt])}</option>
              ))}
            </select>
            <BiasMultiSelect selected={biasSet} onChange={setBiasSet} />
            <label className="flex items-center gap-2 text-xs text-gray-400 px-2">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded"
              />
              <span>{t('archived')}</span>
            </label>
          </div>
        </div>

        {/* Template grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-gray-500">{t('noTemplatesFound')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {templates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onEdit={() => setEditingTemplate(tpl)}
                onClone={() => handleClone(tpl)}
                onArchive={() => handleArchiveTemplate(tpl)}
                onDelete={() => handleDeleteTemplate(tpl)}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      {/* === Modals === */}
      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          groups={groups}
          onSave={handleSaveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
      {editingGroup && (
        <GroupEditorModal
          group={editingGroup}
          onSave={handleSaveGroup}
          onClose={() => setEditingGroup(null)}
        />
      )}
    </div>
  );
}

function GroupButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'text-primary-300 bg-primary-600/10'
          : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/40'
      }`}
    >
      {label}
    </button>
  );
}

function GroupRow({ group, active, onClick, onEdit, onDelete }) {
  return (
    <div
      className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
        active
          ? 'text-primary-300 bg-primary-600/10'
          : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/40'
      }`}
    >
      <button onClick={onClick} className="flex-1 text-left font-medium truncate flex items-center gap-1.5">
        <span className="truncate">{group.name}</span>
        {group.is_system === 1 && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">SYS</span>
        )}
      </button>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-600">{group.template_count}</span>
        {group.is_system !== 1 && (
          <>
            <button
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-primary-400 transition-opacity p-0.5"
              title="Edit"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity p-0.5"
              title="Delete"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, onEdit, onClone, onArchive, onDelete, t }) {
  const ttColors = TRADE_TYPE_COLORS[template.trade_type];
  const tag = deriveBehaviorTag(template.bias, template.behavior_tag);
  const tagColors = tag ? BEHAVIOR_TAGS[tag] : null;
  const biasColors = template.bias ? STOCK_PLAN_BIAS_COLORS[template.bias] : null;

  return (
    <div className={`glass-card p-3 space-y-3 transition-opacity ${template.is_archived ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-200 truncate">{template.name}</h3>
            {template.is_system && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {t('systemTemplate')}
              </span>
            )}
            {template.is_archived && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">
                {t('archived')}
              </span>
            )}
          </div>
          {template.group_name && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{template.group_name}</p>
          )}
        </div>
      </div>

      {/* Trade-type + bias + behavior tag chips */}
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
        {ttColors && (
          <span className={`text-[10px] px-2 py-0.5 rounded ${ttColors.bg} ${ttColors.text} ${ttColors.border} border`}>
            {template.trade_type}
          </span>
        )}
      </div>

      {template.description && (
        <p className="text-[11px] text-gray-500 line-clamp-2">{template.description}</p>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-600/30">
        <span className="text-[10px] text-gray-600">
          {template.usage_count} {t('usageCountLabel')}
        </span>
        <div className="flex items-center gap-2">
          <ActionBtn onClick={onClone} title={t('cloneTemplate')}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </ActionBtn>
          {!template.is_system && (
            <>
              <ActionBtn onClick={onEdit} title={t('edit')}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </ActionBtn>
              <ActionBtn onClick={onArchive} title={template.is_archived ? t('unarchive') : t('archive')}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </ActionBtn>
              <ActionBtn onClick={onDelete} title={t('delete')} danger>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </ActionBtn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function ActionBtn({ onClick, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors ${
        danger
          ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
          : 'text-gray-500 hover:text-primary-400 hover:bg-surface-700/40'
      }`}
    >
      {children}
    </button>
  );
}
