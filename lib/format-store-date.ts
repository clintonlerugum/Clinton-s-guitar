import type { StoreSettings } from './store-settings'

export function formatStoreDate(
  date: Date,
  preferences: Pick<StoreSettings, 'timezone' | 'dateFormat'>,
  options: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat(preferences.dateFormat, {
    timeZone: preferences.timezone,
    ...options,
  }).format(date)
}
