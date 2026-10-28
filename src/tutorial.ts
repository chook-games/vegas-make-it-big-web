import type { GameState, CatalogItem } from './game';

export type LotTheme = 'Generic' | 'Greece';
export interface TutorialState {
  scenario: 'welcome';
  lotSelected: boolean;
  lotOwned: boolean;
  theme: LotTheme | null;
  pathConnected?: boolean;
  arrivalTimer?: number;
  financeViewed?: boolean;
  reviewStep?: number;
  statisticsClosed?: boolean;
  cameraReviewed?: boolean;
  officeConnected?: boolean;
  shopConnected?: boolean;
  shopArrivalTimer?: number;
  mechanicConnected?: boolean;
  repairRequested?: boolean;
  repairCompleted?: boolean;
  cinemaConnected?: boolean;
  cinemaArrivalTimer?: number;
  electricianConnected?: boolean;
  filterNoise?: boolean;
  filterSmell?: boolean;
  filterBeauty?: boolean;
}
// Starting cash: Welcome to The Strip/default.lua. Lot price: original Lot 1
// purchase panel in the supplied Untitled7.jpg / Untitled8.jpg references.
export const TUTORIAL_CASH = 250000;
export const LOT_PRICE = 16000;
export function beginTutorial(state: GameState): GameState {
  state.cash = TUTORIAL_CASH;
  state.elapsed = 45; // 09:00 on the prototype's 120-second clock.
  state.tutorial = { scenario: 'welcome', lotSelected: false, lotOwned: false, theme: null };
  return state;
}
export type TutorialStage = 'lot' | 'hotel' | 'paths' | 'guests' | 'finance' | 'review' | 'camera' | 'office' | 'officePaths' | 'retail' | 'shop' | 'shopPaths' | 'mechanic' | 'mechanicPaths' | 'repair' | 'cinema' | 'cinemaPaths' | 'electrician' | 'electricianPaths' | 'filterNoise' | 'filterSmell' | 'filterBeauty' | 'next';
export const OBJECTIVE_KEYS = ['ID_SCENARIO_NWS_OBJ_OBJECTIVE', 'ID_SCENARIO_NWS_OBJ_BUILD', 'ID_SCENARIO_NWS_OBJ_PATHS',
  'ID_SCENARIO_NWS_OBJ_SALES', 'ID_SCENARIO_NWS_OBJ_SALES2', 'ID_SCENARIO_NWS_OBJ_CAMERA', 'ID_SCENARIO_NWS_OBJ_OFFICE',
  'ID_SCENARIO_NWS_OBJ_OFFICE2', 'ID_SCENARIO_NWS_OBJ_MECHANIC', 'ID_SCENARIO_NWS_OBJ_MECHANIC2', 'ID_SCENARIO_NWS_OBJ_ELECTRICIAN',
  'ID_SCENARIO_NWS_OBJ_NOISE', 'ID_SCENARIO_NWS_OBJ_SMELL', 'ID_SCENARIO_NWS_OBJ_FILTERS'];
export function objectiveIndex(stage: TutorialStage) {
  return { lot:0, hotel:1, paths:2, guests:3, finance:3, review:4, camera:5, office:6, officePaths:6, retail:7, shop:7, shopPaths:7,
    mechanic:8, mechanicPaths:8, repair:9, cinema:10, cinemaPaths:10, electrician:10, electricianPaths:10,
    filterNoise:11, filterSmell:12, filterBeauty:12, next:13 }[stage];
}
export function tutorialTask(stage: TutorialStage) {
  return stage === 'guests' ? 'ID_WEB_WAITING_FOR_GUESTS' : OBJECTIVE_KEYS[objectiveIndex(stage)] + '_NAME';
}
export function tutorialStage(state: GameState): TutorialStage {
  if (!state.tutorial?.lotOwned) return 'lot';
  const hotel = state.buildings.find(b => b.type === 'smallhotel');
  if (!hotel) return 'hotel';
  if (!state.tutorial.pathConnected) return 'paths';
  if (!hotel.visits) return 'guests';
  if (!state.tutorial.financeViewed) return 'finance';
  if ((state.tutorial.reviewStep ?? 0) < 3 || !state.tutorial.statisticsClosed) return 'review';
  if (!state.tutorial.cameraReviewed) return 'camera';
  const office = state.buildings.find(b => b.type === 'headoffice');
  if (!office) return 'office';
  if (!state.tutorial.officeConnected) return 'officePaths';
  if (!office.upgrades?.includes(2)) return 'retail';
  if (!state.buildings.some(b => b.type === 'souvenirshop')) return 'shop';
  if (!state.tutorial.shopConnected) return 'shopPaths';
  if (!state.buildings.some(b => b.type === 'mechanichut')) return 'mechanic';
  if (!state.tutorial.mechanicConnected) return 'mechanicPaths';
  if (!state.tutorial.repairRequested) return 'repair';
  if (!state.buildings.some(b => b.type === 'cinema')) return 'cinema';
  if (!state.tutorial.cinemaConnected) return 'cinemaPaths';
  if (!state.buildings.some(b => b.type === 'electricianhut')) return 'electrician';
  if (!state.tutorial.electricianConnected) return 'electricianPaths';
  if (!state.tutorial.filterNoise) return 'filterNoise';
  if (!state.tutorial.filterSmell) return 'filterSmell';
  return state.tutorial.filterBeauty ? 'next' : 'filterBeauty';
}
export function purchaseLot(state: GameState, theme: string): string | null {
  const tutorial = state.tutorial;
  if (!tutorial || !tutorial.lotSelected || tutorial.lotOwned) return 'ID_WEB_SELECT_LOT_FIRST';
  if (theme !== 'Generic' && theme !== 'Greece') return 'ID_WEB_SELECT_THEME';
  if (state.cash < LOT_PRICE) return 'ID_WEB_NOT_ENOUGH_CASH';
  state.cash -= LOT_PRICE;
  tutorial.lotOwned = true; tutorial.theme = theme;
  return null;
}
export function tutorialBuildError(state: GameState, item: CatalogItem): string | null {
  if (!state.tutorial) return null;
  if (!state.tutorial.lotOwned) return 'ID_WEB_BUY_LOT_FIRST';
  if (item.id === 'path-1' && state.buildings.some(b => b.type === 'smallhotel')) return null;
  if (item.id === 'headoffice') {
    if (!state.tutorial.cameraReviewed) return 'ID_WEB_REVIEW_CAMERA_FIRST';
    return state.buildings.some(b => b.type === item.id) ? 'ID_WEB_BUILDING_EXISTS' : null;
  }
  if (item.id === 'souvenirshop') {
    const office = state.buildings.find(b => b.type === 'headoffice');
    if (!state.tutorial.officeConnected || !office?.upgrades?.includes(2)) return 'ID_WEB_ENABLE_RETAIL_FIRST';
    return state.buildings.some(b => b.type === item.id) ? 'ID_WEB_BUILDING_EXISTS' : null;
  }
  if (item.id === 'mechanichut') {
    if (!state.tutorial.shopConnected) return 'ID_WEB_FINISH_SHOP_FIRST';
    return state.buildings.some(b => b.type === item.id) ? 'ID_WEB_BUILDING_EXISTS' : null;
  }
  if (item.id === 'cinema' || item.id === 'electricianhut') {
    if (!state.tutorial.repairRequested) return 'ID_WEB_CALL_MECHANIC_FIRST';
    if (item.id === 'electricianhut' && !state.tutorial.cinemaConnected) return 'ID_WEB_CONNECT_CINEMA_FIRST';
    return state.buildings.some(b => b.type === item.id) ? 'ID_WEB_BUILDING_EXISTS' : null;
  }
  if (item.id !== 'smallhotel') return 'ID_WEB_BUILD_SMALL_HOTEL_FIRST';
  if (state.buildings.some(b => b.type === 'smallhotel')) return 'ID_WEB_PATHS_NEXT';
  return null;
}
export function validateTutorial(state: GameState) {
  const tutorial = state.tutorial;
  if (tutorial === undefined) return;
  if (!tutorial || tutorial.scenario !== 'welcome' || typeof tutorial.lotSelected !== 'boolean' ||
    typeof tutorial.lotOwned !== 'boolean' || ![null, 'Generic', 'Greece'].includes(tutorial.theme) ||
    tutorial.lotOwned !== (tutorial.theme !== null) ||
    (tutorial.lotOwned && !tutorial.lotSelected) ||
    (!tutorial.lotOwned && state.buildings.length > 0) ||
    state.buildings.length > 6 || new Set(state.buildings.map(b => b.type)).size !== state.buildings.length ||
    state.buildings.some(b => !['smallhotel','headoffice','souvenirshop','mechanichut','cinema','electricianhut'].includes(b.type))) {
    throw new Error('Invalid tutorial save data.');
  }
  for (const value of [tutorial.pathConnected, tutorial.financeViewed, tutorial.statisticsClosed, tutorial.cameraReviewed, tutorial.officeConnected, tutorial.shopConnected, tutorial.mechanicConnected, tutorial.repairRequested, tutorial.repairCompleted, tutorial.cinemaConnected, tutorial.electricianConnected, tutorial.filterNoise, tutorial.filterSmell, tutorial.filterBeauty]) {
    if (value !== undefined && typeof value !== 'boolean') throw new Error('Invalid tutorial progress.');
  }
  if ((tutorial.filterNoise || tutorial.filterSmell || tutorial.filterBeauty) && !tutorial.electricianConnected) throw new Error('Invalid filter progress.');
  if ((tutorial.filterBeauty && !tutorial.filterSmell) || (tutorial.filterSmell && !tutorial.filterNoise)) throw new Error('Invalid filter order.');
  if ((tutorial.arrivalTimer !== undefined && (!Number.isFinite(tutorial.arrivalTimer) || tutorial.arrivalTimer < 0)) ||
    (tutorial.shopArrivalTimer !== undefined && (!Number.isFinite(tutorial.shopArrivalTimer) || tutorial.shopArrivalTimer < 0)) ||
    (tutorial.cinemaArrivalTimer !== undefined && (!Number.isFinite(tutorial.cinemaArrivalTimer) || tutorial.cinemaArrivalTimer < 0)) ||
    (tutorial.reviewStep !== undefined && (!Number.isInteger(tutorial.reviewStep) || tutorial.reviewStep < 0 || tutorial.reviewStep > 3)) ||
    ((tutorial.financeViewed || tutorial.pathConnected || tutorial.reviewStep) && !state.buildings.length)) throw new Error('Invalid hotel progress.');
  if ((tutorial.statisticsClosed && tutorial.reviewStep !== 3) ||
    (tutorial.cameraReviewed && (!tutorial.statisticsClosed || !tutorial.financeViewed)) ||
    (state.buildings.some(b => b.type === 'headoffice') && !tutorial.cameraReviewed) ||
    (state.buildings.some(b => b.type === 'mechanichut') && !tutorial.shopConnected) ||
    ((tutorial.mechanicConnected || tutorial.repairRequested || tutorial.repairCompleted) && !state.buildings.some(b => b.type === 'mechanichut')) ||
    (tutorial.repairCompleted && !tutorial.repairRequested) ||
    (state.buildings.some(b => b.type === 'cinema') && !tutorial.repairRequested) ||
    (tutorial.cinemaConnected && !state.buildings.some(b => b.type === 'cinema')) ||
    (state.buildings.some(b => b.type === 'electricianhut') && !tutorial.cinemaConnected) ||
    (tutorial.electricianConnected && !state.buildings.some(b => b.type === 'electricianhut'))) throw new Error('Invalid development progress.');
}
