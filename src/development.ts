import type { GameState, CatalogItem } from './game';
import { buildingRoute } from './paving.ts';

export function enableRetail(state: GameState, catalog: CatalogItem[], uid: number): string | null {
  const office = state.buildings.find(b => b.uid === uid && b.type === 'headoffice');
  if (!office || !state.tutorial?.cameraReviewed) return 'ID_WEB_BUILD_OFFICE_FIRST';
  if (!buildingRoute(state, catalog, office)) return 'ID_WEB_CONNECT_OFFICE';
  if (office.upgrades?.includes(2)) return 'ID_WEB_RETAIL_ALREADY_ENABLED';
  const upgrade = catalog.find(c => c.id === 'headoffice')!.upgrades!.find(u => u.id === 2)!;
  if (state.cash < upgrade.cost) return 'ID_WEB_NOT_ENOUGH_CASH';
  state.tutorial.officeConnected = true;
  state.cash -= upgrade.cost; (office.upgrades ??= []).push(2);
  return null;
}
