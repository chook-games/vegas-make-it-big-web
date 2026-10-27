import type { Building, CatalogItem, GameState } from './game';
import { translate as t } from './i18n';
import { hotelRoute } from './paving';

export type HotelTab = 'info' | 'finance' | 'people' | 'history';
const cash = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
export class HotelUI {
  private tab: HotelTab = 'info';
  private id = -1;
  private signature = '';
  constructor(private root: HTMLElement, private changed: () => void, private close: () => void,
    private icon: (file: string) => Promise<string>) {}
  reset() { this.id = -1; this.signature = ''; this.tab = 'info'; }
  render(state: GameState, b: Building, catalog: CatalogItem[]) {
    if (this.id !== b.uid) { this.id = b.uid; this.tab = 'info'; }
    const item = catalog.find(c => c.id === b.type)!;
    const connected = !!hotelRoute(state, catalog);
    const guests = state.guests.filter(g => g.target === b.uid && !g.leaving);
    const cost = item.runningCost + item.power + item.water;
    const signature = `${this.id}:${this.tab}:${b.income}:${b.visits}:${guests.length}:${connected}:${b.health}:${state.tutorial?.reviewStep}:${t('ID_WEB_LANGUAGE')}`;
    if (signature === this.signature) return;
    this.signature = signature;
    const rows: Record<HotelTab, [string, string][]> = {
      info: [['ID_INGAME_GENERAL_CAPACITY', `${guests.length} / ${item.capacity}`], ['ID_INGAME_GENERAL_HEALTH', `${Math.round(b.health)}%`],
        ['ID_WEB_POWER_USE', String(item.power)], ['ID_WEB_WATER_USE', String(item.water)],
        ['ID_WEB_ROAD_ACCESS', t(connected ? 'ID_WEB_CONNECTED' : 'ID_WEB_NOT_CONNECTED')], ['ID_WEB_ROOM_RATE', cash(item.roomPrice ?? 25)]],
      finance: [['ID_FINANCE_INCOME', cash(b.income)], ['ID_WEB_DAILY_COSTS', cash(cost)],
        ['ID_FINANCE_TOTALVISITS', String(b.visits)], ['ID_WEB_ROOM_RATE', cash(item.roomPrice ?? 25)]],
      people: [['ID_WEB_CURRENT_GUESTS', String(guests.length)], ['ID_FINANCE_TOTALVISITS', String(b.visits)],
        ['ID_WEB_GUEST_GROUP', t('ID_WEB_HARDCORE_GAMBLER')]],
      history: [['ID_FINANCE_TOTALVISITS', String(b.visits)], ['ID_WEB_TOTAL_RECEIPTS', cash(b.income)],
        ['ID_WEB_HISTORY_NOTE', t('ID_WEB_HISTORY_NOTE_TEXT')]],
    };
    this.root.innerHTML = `<div class="hotel-title"><b>${t(item.nameKey, item.name)}</b><button id="hotel-close" title="${t('ID_GENERAL_CLOSE')}">×</button></div>
      <nav class="hotel-tabs">${(['info','finance','people','history'] as HotelTab[]).map(tab => `<button data-hotel-tab="${tab}" class="${this.tab === tab ? 'active' : ''}">${t('ID_WEB_TAB_' + tab.toUpperCase())}</button>`).join('')}</nav>
      <div class="hotel-data">${rows[this.tab].map(([key,value]) => `<div><span>${t(key)}</span><b>${value}</b></div>`).join('')}</div>`;
    this.root.querySelector<HTMLButtonElement>('#hotel-close')!.onclick = this.close;
    this.root.querySelectorAll<HTMLButtonElement>('[data-hotel-tab]').forEach(button => button.onclick = () => {
      this.tab = button.dataset.hotelTab as HotelTab;
      if (state.tutorial && b.visits > 0) {
        if (this.tab === 'finance') state.tutorial.financeViewed = true;
        const sequence: HotelTab[] = ['info','people','history'];
        const step = state.tutorial.reviewStep ?? 0;
        if (state.tutorial.financeViewed && sequence[step] === this.tab) state.tutorial.reviewStep = step + 1;
      }
      this.signature = ''; this.render(state, b, catalog); this.changed();
    });
    const icons = { info:'i_info.tga', finance:'i_finance.tga', people:'i_people.tga', history:'i_charts_bar.tga' };
    this.root.querySelectorAll<HTMLButtonElement>('[data-hotel-tab]').forEach(button => {
      void this.icon(icons[button.dataset.hotelTab as HotelTab]).then(url => {
        const img = document.createElement('img'); img.src = url; img.alt = ''; button.prepend(img);
      }).catch(() => {});
    });
  }
}
