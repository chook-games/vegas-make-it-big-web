import { translate as t } from './i18n';
import { INFLUENCE_TYPES, type InfluenceType } from './influence';

export type FilterSelection = InfluenceType | 'repair';
type FilterMode = 'influences' | 'objects';
const ICONS: Record<FilterSelection, string> = {
  noise: 'inf_noise.tga', smell: 'inf_smell.tga', beauty: 'inf_beauty.tga', calming: 'inf_calming.tga',
  repair: 'i_building_health.tga',
};
export class FilterUI {
  private dialog: HTMLDialogElement;
  private list: HTMLElement;
  current: FilterSelection | null = null;
  private mode: FilterMode = 'influences';
  private signature = '';
  constructor(private onSelect: (type: FilterSelection | null) => void,
    private icon: (file: string) => Promise<string>) {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'filter-dialog';
    this.dialog.className = 'original-dialog filter-dialog';
    this.dialog.innerHTML = `<h2 id="filter-title"></h2>
      <div class="filter-mode"><span id="filter-mode-label"></span>
        <button id="filter-mode-influences" class="active"></button>
        <button id="filter-mode-objects"></button></div>
      <div class="filter-types" id="filter-types"></div>
      <div class="filter-legend" id="filter-legend"></div>
      <footer><button id="filter-clear">×</button><button id="filter-close">✓</button></footer>`;
    document.body.append(this.dialog);
    this.list = this.dialog.querySelector('#filter-types')!;
    this.dialog.querySelector<HTMLButtonElement>('#filter-mode-influences')!.onclick = () => this.setMode('influences');
    this.dialog.querySelector<HTMLButtonElement>('#filter-mode-objects')!.onclick = () => this.setMode('objects');
    this.dialog.querySelector<HTMLButtonElement>('#filter-clear')!.onclick = () => this.select(null);
    this.dialog.querySelector<HTMLButtonElement>('#filter-close')!.onclick = () => this.dialog.close();
    this.dialog.addEventListener('close', () => { if (this.current) this.select(null); });
    this.render();
  }
  get open() { return this.dialog.open; }
  show() { if (!this.dialog.open) this.dialog.showModal(); this.render(); }
  close() { if (this.dialog.open) this.dialog.close(); }
  private setMode(mode: FilterMode) {
    this.mode = mode; this.signature = '';
    if (mode === 'objects' && this.current && this.current !== 'repair') this.select(null);
    this.render();
  }
  select(type: FilterSelection | null) {
    this.current = type; this.signature = '';
    this.onSelect(type); this.render();
  }
  render() {
    const signature = `${t('ID_WEB_LANGUAGE')}:${this.mode}:${this.current}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.dialog.querySelector('#filter-title')!.textContent = t('ID_WEB_FILTERS_TITLE');
    this.dialog.querySelector('#filter-mode-label')!.textContent = t('ID_WEB_FILTER_MODE');
    const influences = this.dialog.querySelector<HTMLButtonElement>('#filter-mode-influences')!;
    const objects = this.dialog.querySelector<HTMLButtonElement>('#filter-mode-objects')!;
    influences.textContent = t('ID_WEB_INFLUENCES');
    objects.textContent = t('ID_WEB_OBJECTS');
    influences.classList.toggle('active', this.mode === 'influences');
    objects.classList.toggle('active', this.mode === 'objects');
    const items: FilterSelection[] = this.mode === 'influences' ? INFLUENCE_TYPES : ['repair'];
    this.list.innerHTML = items.map(type => `<button data-filter="${type}" class="${this.current === type ? 'selected' : ''}">${t(type === 'repair' ? 'ID_INGAME_GENERAL_STATEOFREPAIR' : 'ID_INFLUENCE_' + type.toUpperCase())}</button>`).join('');
    this.list.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.onclick = () => {
      this.select(button.dataset.filter as FilterSelection);
    });
    for (const button of Array.from(this.list.querySelectorAll<HTMLButtonElement>('[data-filter]'))) {
      void this.icon(ICONS[button.dataset.filter as FilterSelection]).then(url => {
        const image = document.createElement('img'); image.src = url; image.alt = ''; button.prepend(image);
      }).catch(() => {});
    }
    this.dialog.querySelector('#filter-legend')!.textContent =
      t(this.mode === 'influences' ? 'ID_WEB_FILTER_LEGEND' : 'ID_WEB_REPAIR_LEGEND');
  }
}
