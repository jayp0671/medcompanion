import localforage from 'localforage'
localforage.config({ name: 'medcompanion' })

export const KEYS = {
  meds: 'meds',
  schedules: 'schedules',
  doseLogs: 'doseLogs',
  symptomLogs: 'symptomLogs',
  vitalsLogs: 'vitalsLogs',
  settings: 'settings',
}

export const store = {
  get: (k) => localforage.getItem(k),
  set: (k, v) => localforage.setItem(k, v),
  remove: (k) => localforage.removeItem(k),
}

export async function initDefaults() {
  if (!(await store.get(KEYS.settings))) {
    await store.set(KEYS.settings, { tz: 'America/New_York', notify: false, aiEnabled: false })
  }
  for (const k of [KEYS.meds, KEYS.schedules, KEYS.doseLogs, KEYS.symptomLogs, KEYS.vitalsLogs]) {
    if (!(await store.get(k))) await store.set(k, [])
  }
}
