import type { Building, CatalogItem, GameState } from './game';
import { translate as t } from './i18n';
import { requestRepair } from './maintenance';

export function repairMarkup(state: GameState, building: Building, item: CatalogItem) {
  if (item.repairStaff !== 'MECHANIC') return '';
  const worker = state.mechanic;
  return `<div class="maintenance-actions"><button id="request-repair" ${!worker || worker.status !== 'idle' || building.health >= 100 ? 'disabled' : ''} title="${t(worker ? 'ID_STAFF_HANDYMAN_CALLMECHANIC' : 'ID_WEB_NEED_MECHANIC')}">${t('ID_STAFF_HANDYMAN_CALLMECHANIC')}</button>
    <span id="mechanic-status">${worker ? t('ID_WEB_MECHANIC_' + worker.status.toUpperCase()) : t('ID_WEB_NEED_MECHANIC')}</span></div>`;
}
export function wireRepair(root: HTMLElement, state: GameState, building: Building, catalog: CatalogItem[], changed: () => void,
  notify: (text: string) => void, icon: (name: string) => Promise<string>) {
  const button = root.querySelector<HTMLButtonElement>('#request-repair'); if (!button) return;
  button.onclick = () => {
    const error = requestRepair(state, catalog, building.uid);
    if (error) notify(t(error));
    changed();
  };
  void icon('i_mechanic.tga').then(url => { const img = document.createElement('img'); img.src = url; img.alt = ''; button.prepend(img); }).catch(() => {});
}
export function staffMarkup(state: GameState) {
  const worker = state.mechanic; if (!worker) return '';
  return `<div class="hotel-data staff-data"><div><span>${t('ID_WEB_MECHANIC')}</span><b>1 / 1</b></div>
    <div><span>${t('ID_WEB_WAGE')}</span><b>$${worker.wage} ${t('ID_WEB_PER_DAY')}</b></div>
    <div><span>${t('ID_WEB_STATUS')}</span><b id="mechanic-status">${t('ID_WEB_MECHANIC_' + worker.status.toUpperCase())}</b></div>
    <div><span>${t('ID_WEB_SKILL')}</span><b>${Math.round(worker.skill)}</b></div>
    <div><span>${t('ID_WEB_SPEED')}</span><b>${Math.round(worker.speed)}</b></div>
    <div><span>${t('ID_WEB_ATTENTION')}</span><b>${Math.round(worker.attention)}</b></div></div>`;
}
