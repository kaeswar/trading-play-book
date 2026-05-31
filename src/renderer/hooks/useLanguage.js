import { useApp } from '../store/appStore';
import { t as translate } from '../../shared/i18n';

export function useLanguage() {
  const { language, setLanguage } = useApp();
  const t = (key) => translate(language, key);
  return { t, language, setLanguage };
}
