import { translate as t } from './i18n';
import type { GameState } from './game';
import { LOT_PRICE, purchaseLot, tutorialStage, objectiveIndex, OBJECTIVE_KEYS, tutorialTask, type LotTheme } from './tutorial';

const cash = (value: number) => '$' + value.toLocaleString('en-US');
export class TutorialUI {
  private signature = '';
  private previousStage = '';
  private theme: LotTheme | null = null;
  private root: HTMLElement;
  private modal: HTMLDialogElement;
  private objective: HTMLDialogElement;
  private themeDialog: HTMLDialogElement;
  constructor(private getState: () => GameState, private buildHotel: () => void,
    private changed: () => void, private notify: (text: string) => void,
    private getIcon: (file: string) => Promise<string>, private inspectHotel: (type?: string) => void,
    private openFilters: () => void) {
    this.root = document.createElement('section'); this.root.className = 'lot-control'; this.root.hidden = true;
    document.querySelector('.classic-ui')!.append(this.root);
    this.modal = this.dialog('tutorial-event');
    this.objective = this.dialog('objectives-dialog');
    this.themeDialog = this.dialog('theme-dialog');
  }
  private dialog(id: string) {
    const dialog = document.createElement('dialog'); dialog.id = id; dialog.className = 'original-dialog';
    document.body.append(dialog); return dialog;
  }
  get paused() { return this.modal.open || this.objective.open || this.themeDialog.open; }
  close() {
    for (const dialog of [this.modal, this.objective, this.themeDialog]) if (dialog.open) dialog.close();
  }
  start() {
    this.close(); this.previousStage = ''; this.signature = '';
    this.render();
    if (this.getState().tutorial) {
      const stage = tutorialStage(this.getState());
      const prompts = {
        lot: ['ID_SCENARIO_NWS_WELCOME_NAME', 'ID_SCENARIO_NWS_WELCOME_DESC'],
        hotel: ['ID_SCENARIO_NWS_BUILDING_NAME', 'ID_SCENARIO_NWS_BUILDING_DESC'],
        paths: ['ID_SCENARIO_NWS_PATHS_NAME', 'ID_SCENARIO_NWS_PATHS_DESC'],
        guests: ['ID_WEB_FIRST_HOTEL_READY', 'ID_WEB_WAITING_FOR_GUESTS'],
        finance: ['ID_SCENARIO_NWS_BUILDINGINFOA_NAME', 'ID_SCENARIO_NWS_BUILDINGINFOA_DESC'],
        review: ['ID_SCENARIO_NWS_BUILDINGINFO_NAME', 'ID_SCENARIO_NWS_BUILDINGINFO_DESC'],
        camera: ['ID_SCENARIO_NWS_CAMERA_NAME', 'ID_SCENARIO_NWS_CAMERA_DESC'],
        office: ['ID_SCENARIO_NWS_TREESTRUCTURE_NAME', 'ID_SCENARIO_NWS_TREESTRUCTURE_DESC'],
        officePaths: ['ID_SCENARIO_NWS_TREESTRUCTURE_NAME', 'ID_WEB_OFFICE_PATHS'],
        retail: ['ID_SCENARIO_NWS_TREESTRUCTURE2_NAME', 'ID_SCENARIO_NWS_TREESTRUCTURE2_DESC'],
        shop: ['ID_SCENARIO_NWS_TREESTRUCTURE2_NAME', 'ID_WEB_BUILD_SHOP_GUIDE'],
        shopPaths: ['ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_SHOP_PATHS'],
        mechanic: ['ID_SCENARIO_NWS_MECHANIC_NAME', 'ID_SCENARIO_NWS_MECHANIC_DESC'],
        mechanicPaths: ['ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_MECHANIC_PATHS'],
        repair: ['ID_SCENARIO_NWS_MECHANIC2_NAME', 'ID_SCENARIO_NWS_MECHANIC2_DESC'],
        cinema: ['ID_SCENARIO_NWS_ELECTRICIAN_NAME', 'ID_SCENARIO_NWS_ELECTRICIAN_DESC'],
        cinemaPaths: ['ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_CINEMA_PATHS'],
        electrician: ['ID_SCENARIO_NWS_ELECTRICIAN_NAME', 'ID_WEB_BUILD_ELECTRICIAN'],
        electricianPaths: ['ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_ELECTRICIAN_PATHS'],
        filterNoise: ['ID_SCENARIO_NWS_FILTERS_NAME', 'ID_SCENARIO_NWS_FILTERS_DESC'],
        filterSmell: ['ID_SCENARIO_NWS_FILTERS4_NAME', 'ID_SCENARIO_NWS_FILTERS4_DESC'],
        filterBeauty: ['ID_SCENARIO_NWS_FILTERS4_NAME', 'ID_SCENARIO_NWS_FILTERS4_DESC'],
        tree: ['ID_SCENARIO_NWS_FILTERS6_NAME', 'ID_SCENARIO_NWS_FILTERS6_DESC'],
        repairFilter: ['ID_SCENARIO_NWS_FILTERS7_NAME', 'ID_SCENARIO_NWS_FILTERS7_DESC'],
        next: ['ID_SCENARIO_NWS_FILTERS8_NAME', 'ID_WEB_FILTERS_SLICE_END'],
      };
      this.message(...prompts[stage] as [string, string]);
    }
  }
  message(title: string, text: string) {
    this.modal.innerHTML = '<h2></h2><div class="original-text"></div><footer><button id="event-accept">✓</button></footer>';
    this.modal.querySelector('h2')!.textContent = t(title);
    const content = this.modal.querySelector('.original-text')!;
    const parts = t(text).split(/(<image filename [^>]+>)/g);
    for (const part of parts) {
      const match = part.match(/^<image filename ([^>]+)>$/);
      if (match) {
        const icon = document.createElement('img'); icon.className = 'inline-game-icon'; icon.alt = '';
        content.append(icon);
        void this.getIcon(match[1].trim()).then(url => { icon.src = url; }).catch(() => icon.remove());
      } else content.append(document.createTextNode(part.replace(/<[^>]*>/g, '')));
    }
    const accept = this.modal.querySelector<HTMLButtonElement>('button')!;
    accept.title = t('ID_GENERAL_ACCEPT'); accept.onclick = () => this.modal.close();
    if (!this.modal.open) this.modal.showModal();
  }
  selectLot() {
    const state = this.getState(); if (!state.tutorial) return;
    const first = !state.tutorial.lotSelected;
    if (tutorialStage(state) === 'camera') state.tutorial.cameraReviewed = true;
    state.tutorial.lotSelected = true; this.render();
    if (first && !state.tutorial.lotOwned) this.message('ID_SCENARIO_NWS_LOTPURCHASE_NAME', 'ID_SCENARIO_NWS_LOTPURCHASE_DESC');
    this.changed();
  }
  objectives() {
    const state = this.getState(); if (!state.tutorial) return;
    const stage = tutorialStage(state);
    const keys = OBJECTIVE_KEYS;
    const active = objectiveIndex(stage);
    this.objective.innerHTML = `<h2>${t('ID_SCENARIO_NWS_WELCOME_NAME')}</h2><table class="objective-table"><thead><tr><th>${t('ID_OBJECTIVESINGLE_TITLE')}</th><th>${t('ID_WEB_PROGRESS')}</th><th>${t('ID_WEB_STATUS')}</th><th>${t('ID_OBJECTIVE_LINK')}</th></tr></thead><tbody>${keys.slice(0, active + 1).map((key,index) => `<tr><td>${t(key + '_NAME')}</td><td><meter min="0" max="1" value="${index < active ? 1 : 0}"></meter></td><td>${index < active ? '✓' : '×'}</td><td><button data-objective="${key}">i</button></td></tr>`).join('')}</tbody></table><footer><button id="objectives-close">✓</button></footer>`;
    this.objective.querySelectorAll<HTMLButtonElement>('[data-objective]').forEach(button => button.onclick = () => {
      this.message('ID_OBJECTIVE_TITLE_CAP', button.dataset.objective + '_DESC');
    });
    this.objective.querySelector<HTMLButtonElement>('#objectives-close')!.onclick = () => this.objective.close();
    if (!this.objective.open) this.objective.showModal();
  }
  private chooseTheme() {
    this.theme = null;
    this.themeDialog.innerHTML = `<h2>${t('ID_WEB_SELECT_THEME')}</h2><div class="theme-grid">${(['Generic','Greece'] as const).map(theme => `<button data-theme="${theme}"><span>${theme === 'Generic' ? '⚄ ⚂' : '♜'}</span>${t(theme === 'Generic' ? 'ID_THEME_DICENCARDS_NAME' : 'ID_THEME_GREECE_NAME')}</button>`).join('')}</div><p>${t('ID_WEB_LOT_COST')}: ${cash(LOT_PRICE)}</p><footer><button id="theme-cancel">×</button><button id="theme-accept" disabled>✓</button></footer>`;
    for (const [theme, file] of [['Generic','th_dice.tga'], ['Greece','th_Greek.tga']]) {
      const span = this.themeDialog.querySelector(`[data-theme="${theme}"] span`)!;
      void this.getIcon(file).then(url => { const img = document.createElement('img'); img.src = url; img.alt = ''; span.replaceChildren(img); }).catch(() => {});
    }
    this.themeDialog.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button => button.onclick = () => {
      this.theme = button.dataset.theme as LotTheme;
      this.themeDialog.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('selected', b === button));
      this.themeDialog.querySelector<HTMLButtonElement>('#theme-accept')!.disabled = false;
    });
    this.themeDialog.querySelector<HTMLButtonElement>('#theme-cancel')!.onclick = () => this.themeDialog.close();
    this.themeDialog.querySelector<HTMLButtonElement>('#theme-accept')!.onclick = () => {
      if (!this.theme) return;
      const error = purchaseLot(this.getState(), this.theme);
      if (error) return this.notify(t(error));
      this.themeDialog.close(); this.changed(); this.render();
    };
    this.themeDialog.showModal();
  }
  render() {
    const state = this.getState(); const tutorial = state.tutorial;
    document.querySelector('.classic-ui')!.classList.toggle('tutorial-mode', !!tutorial);
    this.root.hidden = !tutorial;
    if (!tutorial) { this.signature = ''; this.previousStage = ''; return; }
    const stage = tutorialStage(state);
    const previous = this.previousStage; this.previousStage = stage;
    if (previous && stage !== previous) {
      document.querySelector('.classic-ui')!.classList.remove('tutorial-building');
      if (stage === 'hotel') this.message('ID_SCENARIO_NWS_BUILDING_NAME', 'ID_SCENARIO_NWS_BUILDING_DESC');
      else if (stage === 'paths') this.message('ID_SCENARIO_NWS_PATHS_NAME', 'ID_SCENARIO_NWS_PATHS_DESC');
      else if (stage === 'finance') {
        this.inspectHotel(); this.message('ID_SCENARIO_NWS_BUILDINGINFOA_NAME', 'ID_SCENARIO_NWS_BUILDINGINFOA_DESC');
      } else if (stage === 'review') this.message('ID_SCENARIO_NWS_BUILDINGINFO_NAME', 'ID_SCENARIO_NWS_BUILDINGINFO_DESC');
      else if (stage === 'camera') this.message('ID_SCENARIO_NWS_CAMERA_NAME', 'ID_SCENARIO_NWS_CAMERA_DESC');
      else if (stage === 'office') this.message('ID_SCENARIO_NWS_TREESTRUCTURE_NAME', 'ID_SCENARIO_NWS_TREESTRUCTURE_DESC');
      else if (stage === 'officePaths') this.message('ID_SCENARIO_NWS_TREESTRUCTURE_NAME', 'ID_WEB_OFFICE_PATHS');
      else if (stage === 'retail') { this.inspectHotel('headoffice'); this.message('ID_SCENARIO_NWS_TREESTRUCTURE2_NAME', 'ID_SCENARIO_NWS_TREESTRUCTURE2_DESC'); }
      else if (stage === 'shop') this.message('ID_SCENARIO_NWS_TREESTRUCTURE2_NAME', 'ID_WEB_BUILD_SHOP_GUIDE');
      else if (stage === 'shopPaths') this.message('ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_SHOP_PATHS');
      else if (stage === 'mechanic') this.message('ID_SCENARIO_NWS_MECHANIC_NAME', 'ID_SCENARIO_NWS_MECHANIC_DESC');
      else if (stage === 'mechanicPaths') this.message('ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_MECHANIC_PATHS');
      else if (stage === 'repair') { this.inspectHotel(); this.message('ID_SCENARIO_NWS_MECHANIC2_NAME', 'ID_SCENARIO_NWS_MECHANIC2_DESC'); }
      else if (stage === 'cinema') this.message('ID_SCENARIO_NWS_ELECTRICIAN_NAME', 'ID_SCENARIO_NWS_ELECTRICIAN_DESC');
      else if (stage === 'cinemaPaths') this.message('ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_CINEMA_PATHS');
      else if (stage === 'electrician') this.message('ID_SCENARIO_NWS_ELECTRICIAN_NAME', 'ID_WEB_BUILD_ELECTRICIAN');
      else if (stage === 'electricianPaths') this.message('ID_SCENARIO_NWS_PATHS_NAME', 'ID_WEB_ELECTRICIAN_PATHS');
      else if (stage === 'filterNoise') this.message('ID_SCENARIO_NWS_FILTERS_NAME', 'ID_SCENARIO_NWS_FILTERS_DESC');
      else if (stage === 'filterSmell' || stage === 'filterBeauty') this.message('ID_SCENARIO_NWS_FILTERS4_NAME', 'ID_SCENARIO_NWS_FILTERS4_DESC');
      else if (stage === 'tree') this.message('ID_SCENARIO_NWS_FILTERS6_NAME', 'ID_SCENARIO_NWS_FILTERS6_DESC');
      else if (stage === 'repairFilter') this.message('ID_SCENARIO_NWS_FILTERS7_NAME', 'ID_SCENARIO_NWS_FILTERS7_DESC');
      else if (stage === 'next') this.message('ID_SCENARIO_NWS_FILTERS8_NAME', 'ID_WEB_FILTERS_SLICE_END');
    }
    const signature = `${tutorial.lotSelected}:${tutorial.lotOwned}:${stage}:${tutorial.theme}:${tutorial.filterNoise}:${tutorial.filterSmell}:${tutorial.filterBeauty}:${tutorial.repairFilter}`;
    if (signature === this.signature) return;
    this.signature = signature;
    const task = tutorialTask(stage);
    this.root.innerHTML = `<div class="lot-heading">${t('ID_WEB_LOT_ONE')}</div><div class="lot-content">${!tutorial.lotSelected ? `<p>${t('ID_SCENARIO_NWS_OBJ_OBJECTIVE_NAME')}</p><button id="select-lot">${t('ID_WEB_SELECT_LOT')}</button>` : !tutorial.lotOwned ? `<p>${t('ID_WEB_LOT_FOR_SALE')} ${cash(LOT_PRICE)}</p><button id="buy-lot">${t('ID_WEB_BUY_LOT')}</button>` : `<p>${t(tutorial.theme === 'Generic' ? 'ID_THEME_DICENCARDS_NAME' : 'ID_THEME_GREECE_NAME')}</p><p>${t(task)}</p><button id="lot-build">${t('ID_WEB_BUILD_OBJECTS')}</button>${stage !== 'hotel' ? `<button id="lot-hotel">${t('ID_BUILDING_TYPE_SMALLHOTEL_NAME')}</button>` : ''}`}
      ${stage === 'camera' ? `<button id="camera-select-lot">${t('ID_WEB_SELECT_LOT')}</button>` : ''}
      ${state.buildings.some(b => b.type === 'headoffice') ? `<button id="lot-office">${t('ID_BUILDING_TYPE_HEADOFFICE_NAME')}</button>` : ''}
      ${state.buildings.some(b => b.type === 'souvenirshop') ? `<button id="lot-shop">${t('ID_BUILDING_TYPE_SOUVENIRSHOP_NAME')}</button>` : ''}
      ${state.buildings.some(b => b.type === 'mechanichut') ? `<button id="lot-mechanic">${t('ID_BUILDING_TYPE_MECHANICHUT_NAME')}</button>` : ''}
      ${state.buildings.some(b => b.type === 'cinema') ? `<button id="lot-cinema">${t('ID_BUILDING_TYPE_CINEMA_NAME')}</button>` : ''}
      ${state.buildings.some(b => b.type === 'electricianhut') ? `<button id="lot-electrician">${t('ID_BUILDING_TYPE_ELECTRICIANHUT_NAME')}</button>` : ''}
      ${['filterNoise','filterSmell','filterBeauty','repairFilter'].includes(stage) ? `<button id="lot-filters">${t('ID_WEB_OPEN_FILTERS')}</button>` : ''}
      <button id="lot-objectives">${t('ID_OBJECTIVE_TITLE')}</button></div>`;
    this.root.querySelector<HTMLButtonElement>('#select-lot')?.addEventListener('click', () => this.selectLot());
    this.root.querySelector<HTMLButtonElement>('#buy-lot')?.addEventListener('click', () => this.chooseTheme());
    this.root.querySelector<HTMLButtonElement>('#lot-build')?.addEventListener('click', () => {
      document.querySelector('.classic-ui')!.classList.add('tutorial-building'); this.buildHotel();
    });
    this.root.querySelector<HTMLButtonElement>('#lot-objectives')!.onclick = () => this.objectives();
    this.root.querySelector<HTMLButtonElement>('#lot-hotel')?.addEventListener('click', () => this.inspectHotel());
    this.root.querySelector<HTMLButtonElement>('#camera-select-lot')?.addEventListener('click', () => this.selectLot());
    this.root.querySelector<HTMLButtonElement>('#lot-office')?.addEventListener('click', () => this.inspectHotel('headoffice'));
    this.root.querySelector<HTMLButtonElement>('#lot-shop')?.addEventListener('click', () => this.inspectHotel('souvenirshop'));
    this.root.querySelector<HTMLButtonElement>('#lot-mechanic')?.addEventListener('click', () => this.inspectHotel('mechanichut'));
    this.root.querySelector<HTMLButtonElement>('#lot-cinema')?.addEventListener('click', () => this.inspectHotel('cinema'));
    this.root.querySelector<HTMLButtonElement>('#lot-electrician')?.addEventListener('click', () => this.inspectHotel('electricianhut'));
    this.root.querySelector<HTMLButtonElement>('#lot-filters')?.addEventListener('click', () => this.openFilters());
  }
}
