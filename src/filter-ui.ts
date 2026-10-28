import { translate as t } from './i18n';
import { INFLUENCE_TYPES, type InfluenceType } from './influence';

const ICONS: Record<InfluenceType, string> = {
  noise: 'inf_noise.tga', smell: 'inf_smell.tga', beauty: 'inf_beauty.tga', calming: 'inf_calming.tga',
};
export class FilterUI {
  private dialog: HTMLDialogElement;
  private list: HTMLElement;
  current: InfluenceType | null = null;
  private signature = '';
  constructor(private onSelect: (type: InfluenceType | null) => void,
    private icon: (file: string) => Promise<string>) {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'filter-dialog';
    this.dialog.className = 'original-dialog filter-dialog';
    this.dialog.innerHTML = `<h2 id="filter-title"></h2>
      <div class="filter-mode"><span id="filter-mode-label"></span><button id="filter-mode-influences" class="active"></button></div>
      <div class="filter-types" id="filter-types"></div>
      <div class="filter-legend" id="filter-legend"></div>
      <footer><button id="filter-clear">×</button><button id="filter-close">✓</button></footer>`;
    document.body.append(this.dialog);
    this.list = this.dialog.querySelector('#filter-types')!;
    this.dialog.querySelector<HTMLButtonElement>('#filter-clear')!.onclick = () => this.select(null);
    this.dialog.querySelector<HTMLButtonElement>('#filter-close')!.onclick = () => this.dialog.close();
    this.dialog.addEventListener('close', () => { if (this.current) this.select(null); });
    this.render();
  }
  get open() { return this.dialog.open; }
  show() { if (!this.dialog.open) this.dialog.showModal(); this.render(); }
  close() { if (this.dialog.open) this.dialog.close(); }
  select(type: InfluenceType | null) {
    this.current = type; this.signature = '';
    this.onSelect(type); this.render();
  }
  render() {
    const signature = `${t('ID_WEB_LANGUAGE')}:${this.current}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.dialog.querySelector('#filter-title')!.textContent = t('ID_WEB_FILTERS_TITLE');
    this.dialog.querySelector('#filter-mode-label')!.textContent = t('ID_WEB_FILTER_MODE');
    this.dialog.querySelector('#filter-mode-influences')!.textContent = t('ID_WEB_INFLUENCES');
    this.list.innerHTML = INFLUENCE_TYPES.map(type => `<button data-filter="${type}" class="${this.current === type ? 'selected' : ''}">${t('ID_INFLUENCE_' + type.toUpperCase())}</button>`).join('');
    this.list.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.onclick = () => {
      this.select(button.dataset.filter as InfluenceType);
    });
    for (const button of Array.from(this.list.querySelectorAll<HTMLButtonElement>('[data-filter]'))) {
      void this.icon(ICONS[button.dataset.filter as InfluenceType]).then(url => {
        const image = document.createElement('img'); image.src = url; image.alt = ''; button.prepend(image);
      }).catch(() => {});
    }
    this.dialog.querySelector('#filter-legend')!.textContent = t('ID_WEB_FILTER_LEGEND');
  }
}
