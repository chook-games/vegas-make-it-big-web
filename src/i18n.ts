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
  ID_WEB_SELECT_LOT_FIRST: 'Select Lot 1 before buying it.', ID_WEB_SELECT_THEME: 'Select a Theme',
  ID_WEB_NOT_ENOUGH_CASH: 'Not enough money.', ID_WEB_BUY_LOT_FIRST: 'Buy your first Lot before building.',
  ID_WEB_BUILD_SMALL_HOTEL_FIRST: 'Build a Small Hotel for your first guests.',
  ID_WEB_PATHS_NEXT: 'Next objective: connect the hotel to the lot edge with paving.',
  ID_WEB_PROGRESS: 'Progress', ID_WEB_STATUS: 'Status', ID_WEB_LOT_COST: 'Lot price',
  ID_WEB_LOT_ONE: 'Lot 1', ID_WEB_SELECT_LOT: 'Select Lot 1', ID_WEB_BUY_LOT: 'Buy',
  ID_WEB_LOT_FOR_SALE: 'This lot is available to buy for', ID_WEB_BUILD_OBJECTS: 'Build Objects',
  ID_WEB_HOTEL_REQUIRED: 'This hotel is required for the tutorial.',
  ID_WEB_PAVING_BOUNDS: 'Paving must stay inside the lot.', ID_WEB_PAVING_OCCUPIED: 'This cell belongs to a building.',
  ID_WEB_PAVING_EXISTS: 'This cell is already paved.', ID_WEB_WAITING_FOR_GUESTS: 'Waiting for the first hotel guest.',
  ID_WEB_FIRST_HOTEL_READY: 'Your first hotel is open.',
  ID_WEB_POWER_USE: 'Power Use', ID_WEB_WATER_USE: 'Water Use', ID_WEB_ROAD_ACCESS: 'Road Access',
  ID_WEB_CONNECTED: 'Connected', ID_WEB_NOT_CONNECTED: 'No paved route', ID_WEB_ROOM_RATE: 'Room Rate',
  ID_WEB_DAILY_COSTS: 'Daily Costs', ID_WEB_CURRENT_GUESTS: 'Guests / Reserved Rooms', ID_WEB_GUEST_GROUP: 'Guest Type',
  ID_WEB_HARDCORE_GAMBLER: 'Hard-core Gambler', ID_WEB_TOTAL_RECEIPTS: 'Total Receipts',
  ID_WEB_HISTORY_NOTE: 'Statistics', ID_WEB_HISTORY_NOTE_TEXT: 'Totals since construction; daily historical charts are not yet ported.',
  ID_WEB_TAB_INFO: 'Information', ID_WEB_TAB_FINANCE: 'Finance', ID_WEB_TAB_PEOPLE: 'Visitors', ID_WEB_TAB_HISTORY: 'Statistics',
  ID_WEB_PAVING_HINT: 'Click or drag: $10 per cell. Connect the amber hotel entrance to any street edge. Esc cancels.',
  ID_WEB_BUILD_OFFICE_FIRST: 'Build a Head Office first.', ID_WEB_CONNECT_OFFICE: 'Connect the Head Office to a street with paving.',
  ID_WEB_RETAIL_ALREADY_ENABLED: 'Retail Division is already enabled.', ID_WEB_REVIEW_CAMERA_FIRST: 'Review the camera guidance, then select the Lot.',
  ID_WEB_BUILDING_EXISTS: 'This tutorial building has already been constructed.', ID_WEB_ENABLE_RETAIL_FIRST: 'Requires a connected Head Office with Retail Division enabled.',
  ID_WEB_BUILD_OVER_PAVING: 'Keep existing paved routes clear when placing buildings.',
  ID_WEB_UPGRADES: 'Upgrades', ID_WEB_PER_DAY: 'per day', ID_WEB_ENABLED: 'Enabled', ID_WEB_ENABLE_RETAIL: 'Enable Retail Division',
  ID_WEB_OFFICE_PATHS: 'Your Head Office has been constructed. Connect its amber entrance plate to a street edge or the existing paved network. Use Construction → Scenery → Paths.',
  ID_WEB_BUILD_SHOP_GUIDE: 'Retail Division is enabled. You can now build a Souvenir Shop. Select the Lot, open Construction → Retail → Shops, and place the shop. Remember to connect its entrance to a street with paving.',
  ID_WEB_SHOP_PATHS: 'Connect the Souvenir Shop entrance to a street edge with paving. It may share the existing paved network used by your hotel or Head Office.',
  ID_WEB_RETAIL_READY: 'Your retail business is open.',
  ID_WEB_NEED_MECHANIC: 'Build a Mechanics Hut to hire a mechanic.', ID_WEB_MECHANIC_BUSY: 'The mechanic is already assigned to a repair.',
  ID_WEB_CANNOT_REPAIR: 'This building does not use a mechanic.', ID_WEB_NO_REPAIR_NEEDED: 'This building is already at full health.',
  ID_WEB_CONNECT_REPAIR_BUILDINGS: 'Both the hut and target building need paved road access.',
  ID_WEB_REPAIR_PATH_MISSING: 'Join the hut and building with a continuous paved route inside the lot. You can link their paths along the street-edge cells.',
  ID_WEB_FINISH_SHOP_FIRST: 'Connect your Souvenir Shop before building the Mechanics Hut.',
  ID_WEB_MECHANIC: 'Mechanic', ID_WEB_WAGE: 'Wage', ID_WEB_SKILL: 'Skill', ID_WEB_SPEED: 'Speed', ID_WEB_ATTENTION: 'Attention',
  ID_WEB_MECHANIC_IDLE: 'Idle', ID_WEB_MECHANIC_OUTBOUND: 'Walking to repair', ID_WEB_MECHANIC_REPAIRING: 'Repairing', ID_WEB_MECHANIC_RETURNING: 'Returning to hut',
  ID_WEB_MECHANIC_PATHS: 'A mechanic was hired automatically when you built the hut. Connect the hut to a street, and join its paving to the hotel’s path network inside the lot so the worker can reach the repair point.',
  ID_WEB_REPAIR_DISPATCHED: 'The mechanic has been called.',
  ID_WEB_MAINTENANCE_SLICE_END: 'The repair request has been accepted. Keep the simulation running to watch the mechanic walk to the hotel, repair it and return to the hut.\n\nThe original tutorial advances when you press Call Mechanic. The next task in this Steam scenario is to build a Cinema and an Electricians Hut. Those tasks are still being ported; the full scenario is not complete.',
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
