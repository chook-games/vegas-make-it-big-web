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
export type TutorialStage = 'lot' | 'hotel' | 'paths' | 'guests' | 'finance' | 'review' | 'next';
export function tutorialStage(state: GameState): TutorialStage {
  if (!state.tutorial?.lotOwned) return 'lot';
  const hotel = state.buildings.find(b => b.type === 'smallhotel');
  if (!hotel) return 'hotel';
  if (!state.tutorial.pathConnected) return 'paths';
  if (!hotel.visits) return 'guests';
  if (!state.tutorial.financeViewed) return 'finance';
  return (state.tutorial.reviewStep ?? 0) < 3 ? 'review' : 'next';
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
    state.buildings.length > 1 || state.buildings.some(b => b.type !== 'smallhotel')) {
    throw new Error('Invalid tutorial save data.');
  }
  for (const value of [tutorial.pathConnected, tutorial.financeViewed]) {
    if (value !== undefined && typeof value !== 'boolean') throw new Error('Invalid tutorial progress.');
  }
  if ((tutorial.arrivalTimer !== undefined && (!Number.isFinite(tutorial.arrivalTimer) || tutorial.arrivalTimer < 0)) ||
    (tutorial.reviewStep !== undefined && (!Number.isInteger(tutorial.reviewStep) || tutorial.reviewStep < 0 || tutorial.reviewStep > 3)) ||
    ((tutorial.financeViewed || tutorial.pathConnected || tutorial.reviewStep) && !state.buildings.length)) throw new Error('Invalid hotel progress.');
}
