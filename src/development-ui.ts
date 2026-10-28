import type { Building, CatalogItem, GameState } from './game';
import { translate as t } from './i18n';
import { buildingRoute } from './paving';
import { enableRetail } from './development';
import { repairMarkup, wireRepair, staffMarkup } from './maintenance-ui';

const cash = (n: number) => '$' + n.toLocaleString('en-US');
export class DevelopmentUI {
  private signature = '';
  private tab = 'info';
  private uid = -1;
  constructor(private root: HTMLElement, private changed: () => void, private close: () => void,
    private notify: (text: string) => void, private icon: (name: string) => Promise<string>) {}
  reset() { this.signature = ''; this.uid = -1; this.tab = 'info'; }
  render(state: GameState, b: Building, catalog: CatalogItem[]) {
    if (this.uid !== b.uid) { this.tab = 'info'; this.uid = b.uid; }
    const item = catalog.find(c => c.id === b.type)!;
    const connected = !!buildingRoute(state, catalog, b);
    const retail = item.upgrades?.find(u => u.id === 2);
    const enabled = b.upgrades?.includes(2) ?? false;
    const role = b.type === 'electricianhut' ? 'electrician' : 'mechanic';
    const isHut = ['mechanichut','electricianhut'].includes(b.type);
    const occupancy = state.guests.filter(g => g.target === b.uid && !g.leaving).length;
    const cinemaRows = b.type === 'cinema' ? `<div><span>${t('ID_WEB_TICKET_PRICE')}</span><b>${cash(item.salePrice ?? 0)}</b></div><div><span>${t('ID_INGAME_GENERAL_CAPACITY')}</span><b>${occupancy} / ${item.capacity}</b></div><div><span>${t('ID_WEB_BUSINESS_STATUS')}</span><b>${t(b.broken || b.health <= 0 ? 'ID_WEB_BUSINESS_CLOSED' : 'ID_WEB_BUSINESS_OPEN')}</b></div>` : '';
    const signature = `${b.uid}:${b.type}:${this.tab}:${enabled}:${connected}:${b.income}:${b.visits}:${b.health}:${b.broken}:${occupancy}:${state.cash}:${state.mechanic?.status}:${state.electrician?.status}:${t('ID_WEB_LANGUAGE')}`;
    if (signature === this.signature) return; this.signature = signature;
    this.root.innerHTML = `<div class="hotel-title"><b>${t(item.nameKey, item.name)}</b><button id="development-close">×</button></div>
      <nav class="hotel-tabs"><button id="development-info">${t('ID_WEB_TAB_INFO')}</button>${retail ? `<button id="development-upgrades">${t('ID_WEB_UPGRADES')}</button>` : ''}</nav>
      <div class="hotel-data">${this.tab === 'upgrades' && retail ? `<div class="retail-upgrade"><b>${t(retail.nameKey)}</b><p>${t(retail.descriptionKey)}</p><p>${cash(retail.cost)} · ${cash(retail.runningCost)} ${t('ID_WEB_PER_DAY')}</p><button id="enable-retail" ${enabled || !connected || state.cash < retail.cost ? 'disabled' : ''}>${t(enabled ? 'ID_WEB_ENABLED' : 'ID_WEB_ENABLE_RETAIL')}</button></div>` :
         `<div><span>${t('ID_WEB_ROAD_ACCESS')}</span><b>${t(connected ? 'ID_WEB_CONNECTED' : 'ID_WEB_NOT_CONNECTED')}</b></div><div><span>${t('ID_WEB_DAILY_COSTS')}</span><b>${cash(item.runningCost + item.power + item.water + (enabled ? retail!.runningCost : 0) + (isHut ? state[role]?.wage ?? 0 : 0))}</b></div><div><span>${t('ID_FINANCE_INCOME')}</span><b>${cash(b.income)}</b></div><div><span>${t('ID_INGAME_GENERAL_HEALTH')}</span><b>${Math.round(b.health)}%</b></div><div><span>${t('ID_FINANCE_TOTALVISITS')}</span><b>${b.visits}</b></div>${cinemaRows}`}</div>${isHut ? staffMarkup(state, role) : repairMarkup(state, b, item)}`;
    wireRepair(this.root, state, b, catalog, this.changed, this.notify, this.icon);
    this.root.querySelector<HTMLButtonElement>('#development-close')!.onclick = this.close;
    this.root.querySelector<HTMLButtonElement>('#development-info')!.onclick = () => { this.tab = 'info'; this.render(state, b, catalog); };
    this.root.querySelector<HTMLButtonElement>('#development-upgrades')?.addEventListener('click', () => { this.tab = 'upgrades'; this.render(state, b, catalog); });
    this.root.querySelector<HTMLButtonElement>('#enable-retail')?.addEventListener('click', () => {
      const error = enableRetail(state, catalog, b.uid);
      if (error) this.notify(t(error));
      this.signature = ''; this.changed();
    });
    const button = this.root.querySelector('#development-upgrades');
    if (button) void this.icon('i_upgrade.tga').then(url => { const image = document.createElement('img'); image.src = url; image.alt = ''; button.prepend(image); }).catch(() => {});
  }
}
