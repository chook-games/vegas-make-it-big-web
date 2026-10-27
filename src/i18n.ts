import english from './locales/en.json';
import greek from './locales/el.json';

export type Locale = 'en' | 'el';
const catalog: Record<Locale, Record<string, string>> = {
  en: english as Record<string, string>,
  el: greek as Record<string, string>,
};
const customEnglish: Record<string, string> = {
  ID_WEB_LANGUAGE: 'Language', ID_WEB_UI_LAYOUT: 'The status controls, time/cash panel and construction toolbox follow the original in-game layout.',
  ID_WEB_SFX_VOLUME: 'Interface and game effects', ID_WEB_AMBIENCE_VOLUME: 'Casino ambience', ID_WEB_CONTROLS: 'Controls',
  ID_WEB_CONTROLS_BUILD: 'Choose a major group, category tab and thumbnail to select an object for construction.',
  ID_WEB_CONTROLS_CAMERA: 'Right mouse drag rotates the camera · mouse wheel zooms · left mouse drag pans.',
  ID_WEB_CONTROLS_SELECT: 'Select an object in the world to view information and sell it.', ID_WEB_PORT_STATUS: 'Port Status',
  ID_WEB_PORT_STATUS_TEXT: 'Original object templates, UI sprites and selected sounds are imported. 3D models and game simulation are being ported incrementally.',
  ID_WEB_SOURCE_FILES: 'Source data and formats', ID_WEB_LOCKED: 'LOCKED', ID_WEB_PLACE_HINT: 'Click to place · Space to rotate · Esc to cancel',
  ID_WEB_SELECTED_OBJECT: 'Selected Object', ID_WEB_FOOTPRINT: 'Footprint', ID_WEB_OBJECT_SOLD: 'Object sold.',
  ID_WEB_GOAL_COMPLETE: 'Objective complete!', ID_GENERAL_DAILY_COST: 'Daily Costs', ID_GENERAL_VISITORS: 'visitors',
  ID_WEB_GAME_SAVED: 'Game saved in this browser.', ID_WEB_SAVE_UNAVAILABLE: 'Browser storage is unavailable.',
  ID_WEB_NO_SAVE: 'No saved game was found.', ID_WEB_GAME_LOADED: 'Saved game loaded.', ID_WEB_LOAD_FAILED: 'Could not load the saved game.',
  ID_WEB_NEW_CASINO: 'New casino. Good luck!', ID_WEB_EXAMPLE_LAYOUT: 'Example layout loaded. Visitors are arriving!',
  ID_WEB_SIMULATION_RUNNING: 'Simulation Running', ID_WEB_PLACE_OBJECT: 'Place object', ID_WEB_SELECT_BUILD_OBJECT: 'Select an object first.',
  ID_WEB_MULTI_BUILD_ON: 'Multiple placement enabled.', ID_WEB_MULTI_BUILD_OFF: 'Multiple placement disabled.',
  ID_WEB_WANDER_CAMERA: 'Wander camera', ID_WEB_ORBIT_CAMERA: 'Orbit camera', ID_WEB_IN_CASINO: 'in the casino.',
  ID_WEB_FILTERS_NOT_READY: 'Noise, beauty and staff coverage filters are being ported.',
  ID_WEB_WORLD_VIEW_NOT_READY: 'The outside world view will arrive with the original map port.',
  ID_WEB_OBJECT_PLACED: 'placed', ID_WEB_WELCOME_TO_CASINO: 'Welcome! Choose an object to build or load the example layout.',
  ID_WEB_CLOSE_TAB_TO_QUIT: 'Close this browser tab to quit the game.',
  ID_WEB_EMPTY_CASINO: 'Welcome to your casino.', ID_WEB_EMPTY_CASINO_HINT: 'Choose an object from the construction toolbox.',
  ID_WEB_BUILD_SLOT: 'Build a Slot', ID_WEB_LOAD_EXAMPLE_LAYOUT: 'Load Example Layout',
  ID_WEB_NEW_GAME: 'New Game', ID_WEB_NEW_CASINO_CONFIRM: 'Start a new casino?',
  ID_WEB_NEW_CASINO_CONFIRM_TEXT: 'Your current progress and saved game will be replaced.',
  ID_FRONTEND_OBJECTIVES: 'Objectives', ID_INGAME_SAVEGAME_TITLE: 'Save Game', ID_IG_QUIT_TO_MAINMENU: 'Return to Main Menu',
  ID_WEB_CAMPAIGN_PENDING: 'The original scenario objectives and maps are not playable yet. Use Sandbox to play the current prototype.',
};
let active: Locale = 'en';
try { active = localStorage.getItem('vegas-language') === 'el' ? 'el' : 'en'; } catch { /* English remains the default. */ }

export function language(): Locale { return active; }
export function setLanguage(locale: string): Locale {
  active = locale === 'el' ? 'el' : 'en';
  try { localStorage.setItem('vegas-language', active); } catch { /* Session language still works. */ }
  document.documentElement.lang = active;
  return active;
}
export function translate(key: string | undefined, fallback?: string): string {
  if (!key) return fallback ?? '';
  return catalog[active][key] ?? catalog.en[key] ?? customEnglish[key] ?? fallback ?? key;
}
export function localizeDocument(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    element.textContent = translate(element.dataset.i18n, element.textContent ?? '');
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(element => {
    element.title = translate(element.dataset.i18nTitle, element.title);
  });
  document.documentElement.lang = active;
}
