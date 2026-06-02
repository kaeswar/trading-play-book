import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';

export default function GroupEditorModal({ group, onSave, onClose }) {
  const { t } = useLanguage();
  const isEdit = !!group.id;
  const isSystem = !!group.is_system;

  const [name, setName]               = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [error, setError]             = useState('');

  useEffect(() => {
    setName(group.name || '');
    setDescription(group.description || '');
    setError('');
  }, [group]);

  const handleSave = () => {
    if (!name.trim()) { setError(t('nameRequired')); return; }
    setError('');
    onSave({
      id: group.id,
      name,
      description: description.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-800 border border-surface-600 rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-600/50">
          <h2 className="text-base font-semibold text-gray-200">
            {isEdit ? `${t('edit')} ${t('groupLabel')}` : t('newGroup')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
              {t('groupName')} *
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSystem}
              placeholder="e.g. Opening Range Breakouts"
              className="input-field text-sm w-full disabled:opacity-50"
              autoFocus
            />
          </div>

          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
              {t('groupDescription')}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSystem}
              rows={3}
              placeholder="When are templates in this group used?"
              className="input-field text-sm w-full resize-none disabled:opacity-50"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-surface-600/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
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
