import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import {
  TRADE_TYPES, TEMPLATE_BIAS_TAGS,
  STOCK_PLAN_BIAS_COLORS, BEHAVIOR_TAGS, BEHAVIOR_TAG_ORDER, deriveBehaviorTag,
} from '../../../shared/constants';
import { BIAS_KEY_MAP } from '../../../shared/i18n';

const TRADE_TYPE_LABEL_KEYS = {
  Intraday: 'tradeTypeIntraday',
  Swing:    'tradeTypeSwing',
  Both:     'tradeTypeBoth',
};

const BEHAVIOR_TAG_OPTIONS = [
  ...BEHAVIOR_TAG_ORDER,
  'Range Bound', 'Neutral',
].filter((v, i, arr) => arr.indexOf(v) === i);

export default function TemplateEditorModal({ template, groups, onSave, onClose }) {
  const { t } = useLanguage();
  const isEdit = !!template.id;
  const isSystem = !!template.is_system;

  const [tradeType, setTradeType]     = useState(template.trade_type || 'Intraday');
  const [groupId, setGroupId]         = useState(template.group_id || '');
  const [name, setName]               = useState(template.name || '');
  const [description, setDescription] = useState(template.description || '');
  const [bias, setBias]               = useState(template.bias || 'Bullish');
  const [behaviorTag, setBehaviorTag] = useState(template.behavior_tag || '');
  const [posSizing, setPosSizing]     = useState(template.position_sizing_note || '');
  const [tags, setTags]               = useState(template.tags || '');
  const [error, setError]             = useState('');

  useEffect(() => {
    setTradeType(template.trade_type || 'Intraday');
    setGroupId(template.group_id || '');
    setName(template.name || '');
    setDescription(template.description || '');
    setBias(template.bias || 'Bullish');
    setBehaviorTag(template.behavior_tag || '');
    setPosSizing(template.position_sizing_note || '');
    setTags(template.tags || '');
    setError('');
  }, [template]);

  const handleSave = () => {
    if (!name.trim()) { setError(t('nameRequired')); return; }
    if (!bias) { setError(t('biasRequired')); return; }
    setError('');
    onSave({
      id: template.id,
      tradeType,
      groupId: groupId === '' ? null : Number(groupId),
      name,
      description: description.trim() || null,
      bias,
      behaviorTag: behaviorTag || null,
      positionSizingNote: posSizing.trim() || null,
      tags: tags.trim() || null,
    });
  };

  const effectiveTag = deriveBehaviorTag(bias, behaviorTag);
  const tagColors = effectiveTag ? BEHAVIOR_TAGS[effectiveTag] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-800 border border-surface-600 rounded-xl w-full max-w-2xl h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-600/50">
          <div>
            <h2 className="text-base font-semibold text-gray-200">
              {isEdit ? t('editTemplate') : t('newTemplate')}
            </h2>
            {isSystem && <p className="text-[11px] text-amber-400 mt-0.5">{t('systemReadOnly')}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <Label>{t('tradeType')}</Label>
            <div className="flex gap-2">
              {TRADE_TYPES.map((tt) => (
                <Chip key={tt} active={tradeType === tt} onClick={() => !isSystem && setTradeType(tt)} disabled={isSystem}>
                  {t(TRADE_TYPE_LABEL_KEYS[tt])}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>{t('groupLabel')}</Label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                disabled={isSystem}
                className="input-field text-sm w-full disabled:opacity-50"
              >
                <option value="">— {t('uncategorized')} —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}{g.is_system ? ' (System)' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('planTitleLabel')} *</Label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSystem}
                placeholder="e.g. Gap-Up Reversal"
                className="input-field text-sm w-full disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <Label>{t('descriptionOptional')}</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSystem}
              rows={2}
              placeholder="What does this plan look like? When do you take it?"
              className="input-field text-sm w-full resize-none disabled:opacity-50"
            />
          </div>

          {/* Bias + behavior tag (single direction) */}
          <div className="bg-surface-900/40 border border-surface-600/30 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300">{t('biasTagLabel')}</span>
              {tagColors && (
                <span className={`text-[10px] px-2 py-0.5 rounded ${tagColors.bg} ${tagColors.text} ${tagColors.border} border`}>
                  {effectiveTag}
                </span>
              )}
            </div>

            <div>
              <Label>{t('biasTagLabel')} *</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_BIAS_TAGS.map((b) => {
                  const c = STOCK_PLAN_BIAS_COLORS[b];
                  const active = bias === b;
                  return (
                    <button
                      key={b}
                      onClick={() => !isSystem && setBias(b)}
                      disabled={isSystem}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all disabled:opacity-50 ${
                        active
                          ? `${c.bg} ${c.text} ${c.border} font-medium`
                          : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
                      }`}
                    >
                      {t(BIAS_KEY_MAP[b])}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>{t('behaviorTag')}</Label>
              <select
                value={behaviorTag}
                onChange={(e) => setBehaviorTag(e.target.value)}
                disabled={isSystem}
                className="input-field text-sm w-full disabled:opacity-50"
              >
                <option value="">{t('autoDerived')} ({bias})</option>
                {BEHAVIOR_TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-600 mt-1">{t('autoDerivedHint')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-surface-600/30">
            <div>
              <Label>{t('positionSizing')}</Label>
              <input
                type="text"
                value={posSizing}
                onChange={(e) => setPosSizing(e.target.value)}
                disabled={isSystem}
                placeholder="e.g. 1% risk, half lot"
                className="input-field text-sm w-full disabled:opacity-50"
              />
            </div>
            <div>
              <Label>{t('tagsLabel')}</Label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isSystem}
                placeholder="gap, reversal, momentum"
                className="input-field text-sm w-full disabled:opacity-50"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 px-1">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-surface-600/50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSystem}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEdit ? t('update') : t('create')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </span>
  );
}

function Chip({ active, onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
        active
          ? 'bg-primary-600/20 border-primary-500/40 text-primary-300 font-medium'
          : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500'
      }`}
    >
      {children}
    </button>
  );
}
