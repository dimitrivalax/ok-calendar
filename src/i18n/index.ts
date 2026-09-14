import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import enCommon from './locales/en/common.json';
import enCalendar from './locales/en/calendar.json';
import enEvent from './locales/en/event.json';
import enSettings from './locales/en/settings.json';
import enNotifications from './locales/en/notifications.json';
import frCommon from './locales/fr/common.json';
import frCalendar from './locales/fr/calendar.json';
import frEvent from './locales/fr/event.json';
import frSettings from './locales/fr/settings.json';
import frNotifications from './locales/fr/notifications.json';

export const resources = {
  en: {
    common: enCommon,
    calendar: enCalendar,
    event: enEvent,
    settings: enSettings,
    notifications: enNotifications,
  },
  fr: {
    common: frCommon,
    calendar: frCalendar,
    event: frEvent,
    settings: frSettings,
    notifications: frNotifications,
  },
} as const;

export type AppLocale = 'en' | 'fr';

function deviceLocale(): AppLocale {
  const code = Localization.getLocales()[0]?.languageCode;
  if (code === 'fr' || code === 'en') return code;
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLocale(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'calendar', 'event', 'settings', 'notifications'],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function setAppLocale(locale: AppLocale) {
  await i18n.changeLanguage(locale);
}

export default i18n;
