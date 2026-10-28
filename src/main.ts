import './style.css';
import { CasinoScene } from './scene';
import { language, localizeDocument, setLanguage, translate as t } from './i18n';
import { beginTutorial, tutorialStage, tutorialBuildError, tutorialTask, objectiveIndex, OBJECTIVE_KEYS, TREE_ITEM } from './tutorial';
import { TutorialUI } from './tutorial-ui';
import { HotelUI } from './hotel-ui';
import { DevelopmentUI } from './development-ui';
import { FilterUI } from './filter-ui';
import { influenceMap, repairMap } from './influence';
import { Simulation, createGame, canPlace, place, sell, restore, serialize, SAVE_KEY,
  DAY_SECONDS, type CatalogItem, type GameState } from './game';

const app = document.querySelector<HTMLDivElement>('#app')!;
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const campaignKeys: Record<string, string> = {
  'Welcome to The Strip': 'ID_SCENARIO_NWS_WELCOME_NAME', 'King of the Hill': 'ID_SCENARIO_KING_OF_THE_HILL_TITLE',
  'Top of the Heap': 'ID_SCENARIO_TOP_OF_THE_HEAP_TITLE', 'Big Spenders': 'ID_SCENARIO_BIG_SPENDERS_TITLE',
  'Convention Season': 'ID_SCENARIO_CONVENTION_SEASON_TITLE', 'High Hopes': 'ID_SCENARIO_HIGH_HOPES_TITLE',
  'All Shook Up': 'ID_SCENARIO_ALL_SHOOK_UP_TITLE', 'Shop til you Drop': 'ID_SCENARIO_SHOP_TIL_YOU_DROP_TITLE',
  'The Ace of Clubs': 'ID_SCENARIO_ACE_OF_CLUBS_TITLE', 'Viva Las Vegas': 'ID_SCENARIO_VIVA_LAS_VEGAS_TITLE',
};

async function start() {
  const response = await fetch(`${import.meta.env.BASE_URL}assets/game-data.json`);
  if (!response.ok) throw new Error('Could not load game data.');
  const data: { catalog: CatalogItem[]; campaign: string[]; formats: Record<string, { count: number; bytes: number }>; uiSprites: { name: string; file: string }[]; sounds: { id: string; file: string }[] } = await response.json();
  const catalog = data.catalog;
  let major = 4, minor = '';
  let multiBuild = false, panelVisible = true, wandering = false;
  let inGame = false, selectedScenario: string | null = null;
  let state = createGame();
  let sim = new Simulation(state, catalog);
  let speed = 1, selected: number | null = null, build: CatalogItem | null = null;
  let staffSelection: 'mechanic' | 'electrician' | null = null;
  let rotation = 0, pointer = { x: 0, z: 0 }, hasPointer = false;
  const images = new Map<string, string>();
  const pendingImages = new Set<string>();
  const spriteNames = ['i_options','i_objectives','i_players','i_camera','i_wander','i_normal','i_slow','i_fast','i_pause','i_filter','i_world','i_hidebar','i_cross','i_multibuild','i_build','i_savegame','i_load','i_infrastructure_big','i_entertainment_big','i_retail_big','i_scenery_big','i_games_big','i_internalbuildings_big','i_internalscenery_big','I_fe_campaign','I_fe_sandbox','I_fe_loadgame','I_fe_options','I_fe_credits','I_ig_quit_to_mainmenu','t_accom','t_office','t_staff','t_rest','t_facilities_A','t_trans','t_gaming','t_activities','t_shows','t_shops','t_services','t_fooddrink','t_path','t_grass','t_furniture','t_gardens','t_signs','t_slots','t_tables','t_intfac','t_intfac_A','t_intmech_A','t_furniture'];
  app.innerHTML = `
    <main class="play-area classic-ui" aria-label="Casino game">
        <div id="viewport"></div>
        <div class="classic-top-left"><button id="help" data-ui="i_options" data-i18n-title="ID_OPTIONS_CONFIG" title="Configuration">⚙</button><button id="objective-button" data-ui="i_objectives" data-i18n-title="ID_FRONTEND_OBJECTIVES" title="Objectives">♜</button><button id="players-button" data-ui="i_players" data-i18n-title="ID_TOOLTIP_TOPSTATUS_PLAYERINFO" title="Player Information">♟</button><button data-ui="i_camera" id="screenshot" data-i18n-title="ID_GENERAL_SCREENSHOT" title="Take Screenshot">◉</button><button id="wander" data-ui="i_wander" data-i18n-title="ID_TOOLTIP_TOPSTATUS_WANDERMODE" title="Wander Camera">◌</button><span class="speed-pack"><button data-speed="1" data-ui="i_normal" data-i18n-title="ID_INGAME_GAMESPEED" title="Normal Speed">1</button><button data-speed="2" data-ui="i_slow" data-i18n-title="ID_INGAME_GAMESPEED" title="2× Speed">2</button><button data-speed="3" data-ui="i_fast" data-i18n-title="ID_INGAME_GAMESPEED" title="3× Speed">3</button></span><button data-speed="0" data-ui="i_pause" data-i18n-title="ID_GENERAL_PAUSE" title="Pause">Ⅱ</button></div>
        <div class="classic-top-right"><div id="game-clock">12:00</div><div><span>DAY </span><b id="day">01</b></div><div class="classic-cash"><span>§</span><b id="cash">$50,000</b></div></div>
        <div class="classic-left-tools"><button id="filter-button" data-ui="i_filter" title="World Filters">F</button><button id="world-button" data-ui="i_world" title="World View">◉</button><button id="hide-panel" data-ui="i_hidebar" title="Hide Info Panel">⌄</button></div>
        <div class="classic-objectives"><b id="objective-title">Welcome to the Strip</b><span id="objective-count">0 / 50 visitors</span><div class="progress"><i id="progress"></i></div></div>
        <div id="empty-hint"><span>♠</span><h2 data-i18n="ID_WEB_EMPTY_CASINO">Welcome to your casino.</h2><p data-i18n="ID_WEB_EMPTY_CASINO_HINT">Select the build button and choose an object, just like in the original game.</p><button id="first-slot" class="primary" data-i18n="ID_WEB_BUILD_SLOT">BUILD A SLOT</button><button id="demo" class="text-button" data-i18n="ID_WEB_LOAD_EXAMPLE_LAYOUT">Load Example Layout</button></div>
        <aside class="lot-summary" id="lot-summary" aria-label="Lot summary">
          <div class="lot-summary-title"><span>i</span><b>Lot 1</b></div>
          <div class="lot-summary-grid">
            <div data-i18n-title="ID_FINANCE_INCOME"><span>$</span><b id="lot-summary-cash">$0</b></div>
            <div data-i18n-title="ID_WEB_REPUTATION"><img data-menu-ui="i_star" alt="" /><b id="lot-summary-rating">0</b></div>
            <div data-i18n-title="ID_GENERAL_VISITORS"><img data-menu-ui="i_people" alt="" /><b id="lot-summary-people">0</b></div>
            <div data-i18n-title="ID_WEB_OBJECTS"><img data-menu-ui="i_build" alt="" /><b id="lot-summary-buildings">0</b></div>
            <div class="lot-meters" data-i18n-title="ID_WEB_POWER_WATER"><img data-menu-ui="i_power" alt="" /><b id="lot-summary-power">0</b><img data-menu-ui="i_water" alt="" /><b id="lot-summary-water">0</b></div>
          </div>
        </aside>
        <section class="classic-build" aria-label="Construction Toolbox">
          <div class="build-topline"><div id="panel-title">Casino Interior — Build Objects <small id="object-count"></small></div><div class="build-head-actions"><button id="build-context" title="Switch between casino interior and outside lot building">LOT / CASINO</button><button id="cancel-build" data-ui="i_cross" title="Cancel Build">×</button></div></div>
          <div class="build-layout"><div class="major-groups" id="major-groups"></div><div class="minor-tabs" id="minor-tabs"></div><div class="catalog" id="catalog"></div><div class="build-controls"><button id="multi-build" data-ui="i_multibuild" title="Multiple Placement">⇉</button><button id="build-confirm" data-ui="i_build" title="Build Selected Object">✓</button></div></div>
          <div class="build-status"><span id="selection-status">Select an object to build</span><span id="simulation-label">Simulation Running</span><span id="daily-cost">Daily Costs $0</span><span id="visitors">0 visitors</span><span id="income">$0</span></div>
        </section>
        <div id="placement" class="placement" hidden></div>
        <div id="inspector" class="inspector" hidden></div>
        <div class="scene-footer"><span>Right mouse: rotate camera · Wheel: zoom · Left mouse: pan</span><span>Space: rotate object · Esc: cancel</span></div>
        <div class="classic-actions"><button id="toggle-open">CASINO OPEN</button><button id="save" data-ui="i_savegame" data-i18n-title="ID_INGAME_SAVEGAME_TITLE" title="Save Game">▣</button><button id="load" data-ui="i_load" data-i18n-title="ID_FRONTEND_MAINMENU_LOADGAME" title="Load Game">↥</button><button id="return-menu" data-ui="I_ig_quit_to_mainmenu" data-i18n-title="ID_IG_QUIT_TO_MAINMENU" title="Return to Main Menu">⌂</button><button id="new-game" data-i18n-title="ID_WEB_NEW_GAME" title="New Game">↻</button><button id="help-alt" aria-label="Configuration">?</button></div>
        <section id="frontend" class="frontend" aria-label="Main menu">
          <div class="frontend-brand"><strong>VEGAS</strong><span>MAKE IT BIG!</span><small>LAS VEGAS · NEVADA</small></div>
          <div id="main-menu" class="frontend-panel main-menu">
            <h1 data-i18n="ID_FRONTEND_MAINMENU_TITLE">Main Menu</h1>
            <div class="frontend-menu-items">
              <button id="menu-campaign" class="frontend-menu-item"><span data-i18n="ID_FRONTEND_MAINMENU_CAMPAIGN">Campaign</span><img data-menu-ui="I_fe_campaign" alt="" /></button>
              <button id="menu-sandbox" class="frontend-menu-item"><span data-i18n="ID_FRONTEND_MAINMENU_SANDBOX">Sandbox</span><img data-menu-ui="I_fe_sandbox" alt="" /></button>
              <button id="menu-load" class="frontend-menu-item"><span data-i18n="ID_FRONTEND_MAINMENU_LOADGAME">Load Game</span><img data-menu-ui="I_fe_loadgame" alt="" /></button>
              <button id="menu-options" class="frontend-menu-item"><span data-i18n="ID_OPTIONS_CONFIG">Configuration</span><img data-menu-ui="I_fe_options" alt="" /></button>
              <button id="menu-credits" class="frontend-menu-item"><span data-i18n="ID_FRONTEND_MAINMENU_CREDITS">Credits</span><img data-menu-ui="i_fe_credits" alt="" /></button>
              <button id="menu-quit" class="frontend-menu-item"><span data-i18n="ID_FRONTEND_MAINMENU_QUITGAME">Quit</span><img data-menu-ui="I_ig_quit_to_mainmenu" alt="" /></button>
            </div>
            <label class="language-picker"><span data-i18n="ID_WEB_LANGUAGE">Language</span><select id="language-select" aria-label="Language"><option value="en">English</option><option value="el">Ελληνικά</option></select></label>
          </div>
          <div id="campaign-menu" class="frontend-panel campaign-menu" hidden>
            <h2 data-i18n="ID_CAMPAIGN_TITLE">Campaign</h2>
            <div class="campaign-list" id="campaign-list"></div>
            <div class="campaign-description" id="campaign-description" data-i18n="ID_CAMPAIGN_SELECT">Select a campaign</div>
            <div class="campaign-actions"><button id="campaign-cancel" data-i18n="ID_GENERAL_CLOSE">Close</button><button id="campaign-accept" class="accept-button" data-i18n="ID_GENERAL_ACCEPT" disabled>Accept</button></div>
          </div>
          <div id="credits-panel" class="frontend-panel credits-panel" hidden><h2 data-i18n="ID_FRONTEND_MAINMENU_CREDITS">Credits</h2><p>Vegas: Make It Big!</p><p>Original game by Deep Red Games<br>Published by Empire Interactive</p><button id="credits-close" data-i18n="ID_GENERAL_CLOSE">Close</button></div>
        </section>
    </main>
    <div id="toast" role="status" aria-live="polite"></div>
    <dialog id="help-dialog"><div class="dialog-heading"><span class="eyebrow">VEGAS: MAKE IT BIG! · CONFIGURATION</span><button id="close-help" class="icon-button" aria-label="Close">×</button></div><h2 data-i18n="ID_OPTIONS_CONFIG">Configuration</h2><p data-i18n="ID_WEB_UI_LAYOUT">The status controls, time/cash panel and construction toolbox follow the original in-game layout.</p><h3 data-i18n="ID_GENERAL_SOUND">Sound</h3><label class="option-row"><span data-i18n="ID_WEB_SFX_VOLUME">Interface and game effects</span><input id="sfx-volume" type="range" min="0" max="1" step="0.05" value="0.65" /></label><label class="option-row"><span data-i18n="ID_WEB_AMBIENCE_VOLUME">Casino ambience</span><input id="ambient-volume" type="range" min="0" max="1" step="0.05" value="0.16" /></label><h3 data-i18n="ID_WEB_CONTROLS">Controls</h3><ul><li data-i18n="ID_WEB_CONTROLS_BUILD">Choose a major group, category tab and thumbnail to select an object for construction.</li><li><b>Space</b>: rotate · <b>Shift + click</b>: multiple placement · <b>Esc</b>: cancel.</li><li data-i18n="ID_WEB_CONTROLS_CAMERA">Right mouse drag rotates the camera · mouse wheel zooms · left mouse drag pans.</li><li data-i18n="ID_WEB_CONTROLS_SELECT">Select an object in the world to view information and sell it.</li></ul><h3 data-i18n="ID_WEB_PORT_STATUS">Port Status</h3><p data-i18n="ID_WEB_PORT_STATUS_TEXT">Original object templates, UI sprites and selected sounds are imported. 3D models and game simulation are being ported incrementally.</p><details><summary data-i18n="ID_WEB_SOURCE_FILES">Source data and formats</summary><div id="inventory"></div><p>Campaign order: ${data.campaign.map(name => t(campaignKeys[name], name)).join(' · ')}.</p></details><button id="play" class="primary" data-i18n="ID_GENERAL_ACCEPT">Accept</button></dialog>
    <dialog id="tutorial-dialog"><div class="dialog-heading"><span id="tutorial-title"></span><button id="tutorial-close" class="icon-button" aria-label="Close">×</button></div><p id="tutorial-text"></p><button id="tutorial-accept" class="primary">Accept</button></dialog>
    <dialog id="confirm-dialog"><h2 data-i18n="ID_WEB_NEW_CASINO_CONFIRM">Start a new casino?</h2><p data-i18n="ID_WEB_NEW_CASINO_CONFIRM_TEXT">Your current progress and saved game will be replaced.</p><div class="dialog-actions"><button id="cancel-new" data-i18n="ID_GENERAL_CANCEL">Cancel</button><button id="confirm-new" class="primary" data-i18n="ID_WEB_NEW_GAME">New Game</button></div></dialog>`;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const world = new CasinoScene($('viewport'));
  const getIcon = async (file: string) => {
    const key = `ui:${file}`;
    if (!images.has(key)) images.set(key, await world.sprite(file));
    return images.get(key)!;
  };
  const hotelUI = new HotelUI($('inspector'), () => updateHud(), () => { selected = null; updateInspector(); }, getIcon, message => toast(message));
  const developmentUI = new DevelopmentUI($('inspector'), () => { renderCatalog(); updateHud(); }, () => { selected = null; updateInspector(); }, message => toast(message), getIcon);
  const inspectHotel = (type = 'smallhotel') => {
    build = null; staffSelection = null; world.controls.enablePan = true; updatePreview();
    if (type === 'smallhotel') hotelUI.reset();
    selected = state.buildings.find(b => b.type === type)?.uid ?? null; updateInspector();
  };
  const filterValues = (type: 'noise'|'smell'|'beauty'|'calming'|'repair' | null) =>
    type === 'repair' ? repairMap(state, catalog) : type ? influenceMap(state, catalog, type) : null;
  const filterUI = new FilterUI(type => {
    world.setFilter(type, filterValues(type));
    if (type && state.tutorial) {
      if (type === 'noise') state.tutorial.filterNoise = true;
      if (type === 'smell') state.tutorial.filterSmell = true;
      if (type === 'beauty') state.tutorial.filterBeauty = true;
      if (type === 'repair') state.tutorial.repairFilter = true;
      updateHud(); tutorialUI.render();
    }
  }, getIcon);
  const tutorialUI = new TutorialUI(() => state, () => {
    const stage = tutorialStage(state);
    if (stage === 'hotel') { major = 0; minor = 'BUILDING_MINOR_GROUP_EXT_HOTELS'; }
    else if (stage === 'office') { major = 0; minor = 'BUILDING_MINOR_GROUP_EXT_OFFICES'; }
    else if (stage === 'shop' || stage === 'retail') { major = 2; minor = 'BUILDING_MINOR_GROUP_EXT_SHOPS'; }
    else if (stage === 'mechanic') { major = 0; minor = 'BUILDING_MINOR_GROUP_EXT_MAINTENANCESTAFF'; }
    else if (stage === 'cinema') { major = 1; minor = 'BUILDING_MINOR_GROUP_EXT_ENTERTAINMENT'; }
    else if (stage === 'electrician') { major = 0; minor = 'BUILDING_MINOR_GROUP_EXT_MAINTENANCESTAFF'; }
    else if (stage === 'tree') { major = 3; minor = 'BUILDING_MINOR_GROUP_EXT_PLANTS_FOUNTAINS'; }
    else { major = 3; minor = 'BUILDING_MINOR_GROUP_EXT_PATHS'; }
    choose(null); renderGroups(); renderMinors(); renderCatalog();
  }, () => { renderCatalog(); updateHud(); }, message => toast(message), getIcon, inspectHotel, () => filterUI.show());
  document.querySelector('.classic-ui')!.classList.add('game-hidden');
  $<HTMLSelectElement>('language-select').value = language();
  localizeDocument(app);
  try { $('menu-load').toggleAttribute('disabled', !localStorage.getItem(SAVE_KEY)); } catch { $('menu-load').setAttribute('disabled', ''); }
  let toastTimeout: ReturnType<typeof setTimeout>;
  function toast(message: string) {
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 3500);
  }
  function choose(item: CatalogItem | null) {
    build = item; selected = null; staffSelection = null; rotation = 0;
    world.controls.enablePan = item?.id !== 'path-1';
    renderCatalog(); updatePreview(); updateHud();
  }
  function imageMarkup(name: string) {
    return images.has(`ui:${name}`) ? `<img src="${images.get(`ui:${name}`)}" alt="" />` : '';
  }
  const minorNames: Record<string, string> = {
    gaming: 'Gaming', service: 'Casino facilities', staff: 'Staff', decor: 'Scenery',
    BUILDING_MINOR_GROUP_EXT_HOTELS: 'Hotels', BUILDING_MINOR_GROUP_EXT_OFFICES: 'Offices',
    BUILDING_MINOR_GROUP_EXT_MAINTENANCESTAFF: 'Maintenance', BUILDING_MINOR_GROUP_EXT_RESTROOMS: 'Restrooms',
    BUILDING_MINOR_GROUP_EXT_POWER_WATER: 'Power & water', BUILDING_MINOR_GROUP_EXT_TRANSPORT: 'Transport',
    BUILDING_MINOR_GROUP_EXT_CASINOS: 'Casinos', BUILDING_MINOR_GROUP_EXT_ACTIVITIES: 'Activities',
    BUILDING_MINOR_GROUP_EXT_ENTERTAINMENT: 'Entertainment', BUILDING_MINOR_GROUP_EXT_SHOPS: 'Shops',
    BUILDING_MINOR_GROUP_EXT_SERVICES: 'Services', BUILDING_MINOR_GROUP_EXT_FOOD_DRINK: 'Food & drink',
    BUILDING_MINOR_GROUP_EXT_PATHS: 'Paths', BUILDING_MINOR_GROUP_EXT_GRASS_WATER: 'Grass & water',
    BUILDING_MINOR_GROUP_EXT_BINS_FURNITURE_LIGHTS: 'Furniture & lights', BUILDING_MINOR_GROUP_EXT_PLANTS_FOUNTAINS: 'Plants & fountains',
    BUILDING_MINOR_GROUP_EXT_STATUES_SIGNS_DISPLAYS: 'Statues & signs',
    BUILDING_MINOR_GROUP_INT_MAINTENANCESTAFF: 'Maintenance', BUILDING_MINOR_GROUP_INT_CASINOSTAFF_FACILITIES: 'Casino facilities',
    BUILDING_MINOR_GROUP_INT_SHOPS: 'Casino shops', BUILDING_MINOR_GROUP_INT_SERVICES: 'Casino services',
    BUILDING_MINOR_GROUP_INT_RESTROOMS: 'Restrooms', BUILDING_MINOR_GROUP_INT_FOOD_DRINK: 'Food & drink',
    BUILDING_MINOR_GROUP_INT_SLOTS: 'Slots & video', BUILDING_MINOR_GROUP_INT_TABLES: 'Gaming tables',
    BUILDING_MINOR_GROUP_INT_LOUNGES: 'Lounges', BUILDING_MINOR_GROUP_INT_BINS_FURNITURE_LIGHTS: 'Furniture & lights',
    BUILDING_MINOR_GROUP_INT_FLOWERS_PLANTS_FOUNTAINS: 'Plants & fountains', BUILDING_MINOR_GROUP_INT_STATUES: 'Statues',
    BUILDING_MINOR_GROUP_INT_STAIRS: 'Stairs',
  };
  function renderGroups() {
    const groups: [number, string, string][] = [
      [0, 'ID_BUILDING_MAJOR_GROUP_HOTELS_MAINTENANCESTAFF_FACILITIES', 'i_infrastructure_big'],
      [1, 'ID_BUILDING_MAJOR_GROUP_CASINO_ACTIVITIES_ENTERTAINMENT', 'i_entertainment_big'],
      [2, 'ID_BUILDING_MAJOR_GROUP_SHOPS_SERVICES_FOOD_DRINK', 'i_retail_big'],
      [3, 'ID_BUILDING_MAJOR_GROUP_PATHS_SCENERY_FURNITURE', 'i_scenery_big'],
      [4, 'ID_BUILDING_MAJOR_GROUP_GAMBLING', 'i_games_big'],
      [5, 'ID_BUILDING_MAJOR_GROUP_MAINTENANCESTAFF_OFFICES_FACILITIES', 'i_internalbuildings_big'],
      [6, 'ID_BUILDING_MAJOR_GROUP_CASINO_RETAIL', 'i_retail_big'],
      [7, 'ID_BUILDING_MAJOR_GROUP_SCENERY_LIGHTS_STAIRS_FURNITURE', 'i_internalscenery_big'],
    ];
    const contextGroups = groups.filter(([index]) => major < 4 ? index < 4 : index >= 4);
    $('major-groups').innerHTML = contextGroups.map(([index, name, sprite]) =>
      `<button class="major-group ${major === index ? 'active' : ''}" data-major="${index}" title="${t(name)}">${imageMarkup(sprite)}<small>${t(name)}</small></button>`).join('');
    $('major-groups').querySelectorAll<HTMLButtonElement>('[data-major]').forEach(button => button.onclick = () => {
      major = Number(button.dataset.major); minor = ''; choose(null); renderMinors(); renderCatalog();
    });
  }
  function renderMinors() {
    const available = [...new Set(catalog.filter(c => c.major === major).map(c => c.minor ?? c.category))];
    if (!minor && available.length) minor = available[0];
    $('minor-tabs').innerHTML = available.map((key, index) => {
      const sprite = ['t_accom','t_office','t_staff','t_rest','t_facilities_A','t_trans','t_gaming','t_activities','t_shows','t_shops','t_services','t_fooddrink','t_path','t_grass','t_furniture','t_gardens','t_signs','t_slots','t_tables','t_intfac','t_intfac_A','t_intmech_A'][index % 22];
      const image = images.get(`ui:${sprite}`);
      const label = minorLabel(key);
      return `<button class="minor-tab ${minor === key ? 'active' : ''}" data-minor="${key}" title="${label}">${image ? `<img src="${image}" alt="" />` : ''}<span>${label}</span></button>`;
    }).join('');
    $('minor-tabs').querySelectorAll<HTMLButtonElement>('[data-minor]').forEach(button => button.onclick = () => {
      minor = button.dataset.minor!; choose(null); renderMinors(); renderCatalog();
    });
  }
  function renderCampaigns() {
    $('campaign-list').innerHTML = data.campaign.map((scenario, index) => {
      const key = campaignKeys[scenario];
      const title = t(key, scenario);
      const locked = index > 2;
      return `<button class="campaign-item ${selectedScenario === scenario ? 'selected' : ''}" data-scenario="${scenario}" ${locked ? 'disabled' : ''}><span>${title}</span>${locked ? `<small>${t('ID_WEB_LOCKED')}</small>` : ''}</button>`;
    }).join('');
    $('campaign-list').querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button => button.onclick = () => {
      selectedScenario = button.dataset.scenario!;
      renderCampaigns();
      $('campaign-accept').removeAttribute('disabled');
      $('campaign-description').textContent = selectedScenario === data.campaign[0]
        ? t('ID_SCENARIO_NWS_WELCOME_DESC', 'This tutorial introduces the original game controls and your first objective.').replace(/<[^>]*>/g, '').replaceAll('  ', ' ')
        : t(campaignKeys[selectedScenario], selectedScenario);
    });
  }
  function showMainMenu() {
    tutorialUI.close(); filterUI.close();
    $('main-menu').hidden = false; $('campaign-menu').hidden = true; $('credits-panel').hidden = true;
    $('frontend').hidden = false; document.querySelector('.classic-ui')!.classList.add('game-hidden');
    inGame = false; speed = 0;
    try { $('menu-load').toggleAttribute('disabled', !localStorage.getItem(SAVE_KEY)); } catch { $('menu-load').setAttribute('disabled', ''); }
  }
  function startGame(scenario: string | null, restored?: GameState) {
    hotelUI.reset();
    developmentUI.reset();
    staffSelection = null;
    state = restored ?? (scenario === data.campaign[0] ? beginTutorial(createGame()) : createGame());
    sim = new Simulation(state, catalog); inGame = true; speed = 1;
    $('frontend').hidden = true; document.querySelector('.classic-ui')!.classList.remove('game-hidden');
    major = state.tutorial ? 0 : 4; minor = ''; choose(null); world.sync(state.buildings, state.guests, catalog, null);
    world.setExterior(!!state.tutorial); world.setFilter(null, null); filterUI.current = null;
    tutorialUI.start();
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button => button.classList.toggle('active', Number(button.dataset.speed) === speed));
    updateHud();
  }
  localizeDocument(app);
  renderCampaigns();
  function minorLabel(key: string) {
    const suffix = key.replace(/^BUILDING_MINOR_GROUP_(?:EXT|INT)_/, '');
    return t(`ID_BUILDING_MINOR_GROUP_${suffix}`, minorNames[key] ?? key);
  }
  function renderCatalog() {
    const visible = catalog.filter(c => c.major === major && (minor === '' || (c.minor ?? c.category) === minor) &&
      (!state.tutorial || ['smallhotel','path-1','headoffice','souvenirshop','mechanichut','cinema','electricianhut',TREE_ITEM].includes(c.id)));
    $('object-count').textContent = `${visible.length} objects`;
    const missing = visible.filter(item => item.thumbnail && !images.has(item.id) && !pendingImages.has(item.id));
    for (const item of missing) pendingImages.add(item.id);
    if (missing.length) void Promise.all(missing.map(async item => {
      try { images.set(item.id, await world.thumbnail(item)); } catch { /* keep objects usable without a thumbnail */ }
      // Record attempted IDs so failed assets cannot trigger a retry loop.
    })).then(() => renderCatalog());
    $('catalog').innerHTML = visible.map(item => {
      const error = tutorialBuildError(state, item);
      return `<button class="catalog-item ${build?.id === item.id ? 'selected' : ''}" data-item="${item.id}" ${error ? 'disabled' : ''} title="${error ? t(error) : `${item.width} × ${item.depth} · ${t('ID_BUILDING_TYPE_CAPACITY', 'Capacity')} ${item.capacity}`}">
      <div class="item-image">${images.has(item.id) ? `<img src="${images.get(item.id)}" alt="" />` : item.id === 'path-1' ? imageMarkup('t_path') : '<span>♠</span>'}</div>
      <div><strong>${t(item.nameKey, item.name)}</strong><small>${item.width} × ${item.depth} cells</small><b>${money(item.cost)}</b></div><span class="item-add">+</span></button>`;
    }).join('');
    $('catalog').querySelectorAll<HTMLButtonElement>('[data-item]').forEach(button => {
      button.onclick = () => choose(catalog.find(c => c.id === button.dataset.item)!);
    });
  }
  function updatePreview() {
    const error = build ? canPlace(state, build, pointer.x, pointer.z, rotation, catalog) : null;
    world.preview(hasPointer ? build : null, pointer.x, pointer.z, rotation, !error);
    $('placement').hidden = !build;
    if (build) {
      $('placement').classList.toggle('invalid', !!error && hasPointer);
      $('placement').innerHTML = `<span>${t(build.nameKey, build.name)} <b>${money(build.cost)}</b></span><small>${hasPointer && error ? t(error, error) : t(build.id === 'path-1' ? 'ID_WEB_PAVING_HINT' : 'ID_WEB_PLACE_HINT')}</small>`;
    }
  }
  function updateInspector() {
    if (staffSelection) {
      const worker = state[staffSelection];
      if (!worker) { staffSelection = null; }
      else {
        const roleLabel = t(staffSelection === 'mechanic' ? 'ID_WEB_MECHANIC' : 'ID_WEB_ELECTRICIAN');
        const target = state.buildings.find(b => b.uid === worker.target);
        const targetName = target ? t(catalog.find(c => c.id === target.type)!.nameKey, catalog.find(c => c.id === target.type)!.name) : t('ID_WEB_NONE');
        $('inspector').hidden = false;
        $('inspector').innerHTML = `<div class="section-heading"><span class="eyebrow">${t('ID_WEB_STAFF_SELECTED')}</span><button id="staff-close" class="text-button" aria-label="${t('ID_GENERAL_CLOSE')}">×</button></div>
          <h2>${roleLabel}</h2>
          <div class="inspector-grid">
            <span>${t('ID_WEB_STATUS')} <b>${t('ID_WEB_MECHANIC_' + worker.status.toUpperCase())}</b></span>
            <span>${t('ID_WEB_WAGE')} <b>$${worker.wage} ${t('ID_WEB_PER_DAY')}</b></span>
            <span>${t('ID_WEB_SKILL')} <b>${Math.round(worker.skill)}</b></span>
            <span>${t('ID_WEB_SPEED')} <b>${Math.round(worker.speed)}</b></span>
            <span>${t('ID_WEB_ATTENTION')} <b>${Math.round(worker.attention)}</b></span>
            <span>${t('ID_WEB_ASSIGNED_TO')} <b>${targetName}</b></span>
          </div>
          <button id="staff-locate" class="sell-button">${t('ID_WEB_LOCATE')}</button>`;
        $('staff-close').onclick = () => { staffSelection = null; updateInspector(); };
        $('staff-locate').onclick = () => world.focusStaff(staffSelection!);
        return;
      }
    }
    const b = state.buildings.find(b => b.uid === selected);
    $('inspector').hidden = !b;
    if (!b) return;
    const item = catalog.find(c => c.id === b.type)!;
    if (state.tutorial && b.type === 'smallhotel') { hotelUI.render(state, b, catalog); return; }
    if (state.tutorial && ['headoffice','souvenirshop','mechanichut','cinema','electricianhut'].includes(b.type)) { developmentUI.render(state, b, catalog); return; }
    $('inspector').innerHTML = `<div class="section-heading"><span class="eyebrow">${t('ID_WEB_SELECTED_OBJECT')}</span><button id="deselect" class="text-button" aria-label="${t('ID_GENERAL_CLOSE')}">×</button></div><h2>${t(item.nameKey, item.name)}</h2><div class="inspector-grid"><span>${t('ID_BUILDING_TYPE_HEALTH', 'Health')} <b>${Math.round(b.health)}%</b></span><span>${t('ID_BUILDING_TYPE_TOTALVISITS', 'Visits')} <b>${b.visits}</b></span><span>${t('ID_GENERAL_INCOME', 'Income')} <b>${money(b.income)}</b></span><span>${t('ID_GENERAL_RUNNINGCOSTS', 'Daily Costs')} <b>${money(item.runningCost + item.power + item.water)}</b></span></div><small class="muted">${t('ID_WEB_FOOTPRINT')}: ${item.width} × ${item.depth} · ${t('ID_BUILDING_TYPE_CAPACITY', 'Capacity')} ${item.capacity}</small><button id="sell" class="sell-button">${t('ID_BUILDING_TYPE_SELL', 'Sell')} · +${money(item.resale)}</button>`;
    $('sell').onclick = () => { sell(state, b.uid, catalog); selected = null; updateInspector(); toast(t('ID_WEB_OBJECT_SOLD')); };
    if (state.tutorial) { ($('sell') as HTMLButtonElement).disabled = true; $('sell').title = t('ID_WEB_HOTEL_REQUIRED'); }
    $('deselect').onclick = () => { selected = null; updateInspector(); };
  }
  function updateHud() {
    $('cash').textContent = money(state.cash); $('cash').classList.toggle('negative', state.cash < 0);
    $('visitors').textContent = String(state.guests.length);
    $('income').textContent = money(state.income);
    $('day').textContent = String(Math.floor(state.elapsed / DAY_SECONDS) + 1).padStart(2, '0');
    $('daily-cost').textContent = `${t('ID_GENERAL_DAILY_COST', 'Daily Costs')} ${money(sim.dailyCost())}`;
    $('empty-hint').hidden = !!state.tutorial || state.buildings.length > 0 || !!build;
    $('objective-count').textContent = `${state.totalVisitors} / 50 ${t('ID_GENERAL_VISITORS', 'visitors')} · ${money(state.income)} / $1,000`;
    $('progress').style.width = `${Math.min(100, Math.max(0, Math.min(state.totalVisitors / 50, state.income / 1000)) * 100)}%`;
    $('objective-title').textContent = state.completed ? t('ID_WEB_GOAL_COMPLETE') : t('ID_SCENARIO_NWS_WELCOME_NAME', 'Welcome to the Strip!');
    if (state.tutorial) {
      const stage = tutorialStage(state);
      $('objective-count').textContent = t(tutorialTask(stage));
      $('progress').style.width = `${objectiveIndex(stage) / OBJECTIVE_KEYS.length * 100}%`;
    }
    $('toggle-open').textContent = state.open ? 'CASINO OPEN' : 'CASINO CLOSED';
    $('game-clock').textContent = `${String(Math.floor((state.elapsed % DAY_SECONDS) / DAY_SECONDS * 24)).padStart(2, '0')}:00`;
    const power = state.buildings.reduce((sum, b) => sum + (catalog.find(c => c.id === b.type)?.power ?? 0), 0);
    const water = state.buildings.reduce((sum, b) => sum + (catalog.find(c => c.id === b.type)?.water ?? 0), 0);
    const rating = state.guests.length ? state.guests.reduce((sum, g) => sum + g.happiness, 0) / state.guests.length : 0;
    $('lot-summary-cash').textContent = money(state.income);
    $('lot-summary-rating').textContent = String(Math.round(rating));
    $('lot-summary-people').textContent = String(state.guests.length);
    $('lot-summary-buildings').textContent = String(state.buildings.length);
    $('lot-summary-power').textContent = String(power);
    $('lot-summary-water').textContent = String(water);
    updateInspector();
    tutorialUI.render();
    if (filterUI.open && filterUI.current) world.setFilter(filterUI.current, filterValues(filterUI.current));
  }
  function changeState(next: GameState) {
    hotelUI.reset();
    developmentUI.reset();
    staffSelection = null;
    state = next; sim = new Simulation(state, catalog); choose(null); world.sync(state.buildings, [], catalog, null); updateHud();
    world.setExterior(!!state.tutorial); world.setFilter(null, null); filterUI.current = null; tutorialUI.start();
  }
  function save(automatic = false) {
    try { localStorage.setItem(SAVE_KEY, serialize(state)); if (!automatic) toast(t('ID_WEB_GAME_SAVED')); }
    catch { if (!automatic) toast(t('ID_WEB_SAVE_UNAVAILABLE')); }
  }
  $('save').onclick = () => save();
  $('load').onclick = () => {
    try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return toast(t('ID_WEB_NO_SAVE')); changeState(restore(raw, catalog)); toast(t('ID_WEB_GAME_LOADED')); }
    catch { toast(t('ID_WEB_LOAD_FAILED')); }
  };
  const helpDialog = $<HTMLDialogElement>('help-dialog');
  $('help').onclick = $('help-alt').onclick = () => helpDialog.showModal();
  $('close-help').onclick = $('play').onclick = () => helpDialog.close();
  $('menu-campaign').onclick = () => {
    selectedScenario = null; renderCampaigns();
    $('campaign-accept').setAttribute('disabled', '');
    $('main-menu').hidden = true; $('campaign-menu').hidden = false;
  };
  $('menu-sandbox').onclick = () => startGame(null);
  $('menu-load').onclick = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return toast(t('ID_WEB_NO_SAVE'));
      startGame(null, restore(raw, catalog));
    } catch { toast(t('ID_WEB_LOAD_FAILED')); }
  };
  $('menu-options').onclick = () => helpDialog.showModal();
  $('menu-credits').onclick = () => { $('main-menu').hidden = true; $('credits-panel').hidden = false; };
  $('credits-close').onclick = () => { $('credits-panel').hidden = true; $('main-menu').hidden = false; };
  $('campaign-cancel').onclick = () => { $('campaign-menu').hidden = true; $('main-menu').hidden = false; };
  $('campaign-accept').onclick = () => {
    if (selectedScenario === data.campaign[0]) startGame(selectedScenario);
    else if (selectedScenario) $('campaign-description').textContent = t('ID_WEB_CAMPAIGN_PENDING');
  };
  $('menu-quit').onclick = () => toast(t('ID_WEB_CLOSE_TAB_TO_QUIT'));
  $('language-select').onchange = event => {
    setLanguage((event.target as HTMLSelectElement).value);
    localizeDocument(app); renderCampaigns(); renderGroups(); renderMinors(); renderCatalog(); filterUI.render(); updateHud();
  };
  $('tutorial-accept').onclick = $('tutorial-close').onclick = () => $<HTMLDialogElement>('tutorial-dialog').close();
  $('return-menu').onclick = showMainMenu;
  const confirmDialog = $<HTMLDialogElement>('confirm-dialog');
  $('new-game').onclick = () => confirmDialog.showModal();
  $('cancel-new').onclick = () => confirmDialog.close();
  $('confirm-new').onclick = () => { changeState(createGame()); save(true); confirmDialog.close(); toast(t('ID_WEB_NEW_CASINO')); };
  $('toggle-open').onclick = () => { state.open = !state.open; updateHud(); };
  $('screenshot').onclick = () => {
    const link = document.createElement('a'); link.download = `vegas-web-day-${Math.floor(state.elapsed / DAY_SECONDS) + 1}.png`;
    link.href = world.renderer.domElement.toDataURL('image/png'); link.click();
  };
  $('first-slot').onclick = () => {
    const slot = catalog.find(c => c.id === 'slot')!;
    major = slot.major ?? 4; minor = slot.minor ?? '';
    renderGroups(); renderMinors(); choose(slot);
  };
  $('demo').onclick = () => {
    if (state.buildings.length) return;
    const layout: [string, number, number, number][] = [
      ['slot', 6, 10, 0], ['slot', 8, 10, 0], ['slot', 10, 10, 0], ['slot', 12, 10, 0],
      ['poker', 6, 16, 0], ['poker', 8, 16, 0], ['poker', 10, 16, 0], ['poker', 12, 16, 0],
      ['blackjack', 18, 8, 0], ['roulette', 29, 8, 0], ['bar', 3, 1, 0], ['cashier', 39, 6, 0],
      ['restroom', 38, 15, 0], ['mechanic', 39, 23, 0], ['sofa', 6, 26, 1],
      ['sofa', 13, 26, 1], ['plant', 17, 27, 0], ['plant', 4, 27, 0], ['plant', 27, 6, 0],
    ];
    for (const [type, x, z, r] of layout) {
      const error = place(state, catalog.find(c => c.id === type)!, x, z, r, catalog);
      if (error) console.warn(type, error);
    }
    updateHud(); toast(t('ID_WEB_EXAMPLE_LAYOUT'));
  };
  document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button => {
    button.onclick = () => {
      speed = Number(button.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('active', b === button));
      $('simulation-label').textContent = speed ? `${t('ID_WEB_SIMULATION_RUNNING')} · ${speed}×` : t('ID_GENERAL_PAUSE');
    };
  });
  $('cancel-build').onclick = () => { choose(null); document.querySelector('.classic-ui')!.classList.remove('tutorial-building'); };
  $('build-context').onclick = () => { major = major < 4 ? 4 : 0; minor = ''; renderGroups(); renderMinors(); renderCatalog(); };
  $('build-confirm').onclick = () => { if (build) toast(`${t('ID_WEB_PLACE_OBJECT')}: ${t(build.nameKey, build.name)}.`); else toast(t('ID_WEB_SELECT_BUILD_OBJECT')); };
  $('multi-build').onclick = () => { multiBuild = !multiBuild; $('multi-build').classList.toggle('active', multiBuild); toast(multiBuild ? t('ID_WEB_MULTI_BUILD_ON') : t('ID_WEB_MULTI_BUILD_OFF')); };
  $('wander').onclick = () => { wandering = !wandering; $('wander').classList.toggle('active', wandering); toast(wandering ? t('ID_WEB_WANDER_CAMERA') : t('ID_WEB_ORBIT_CAMERA')); };
  $('objective-button').onclick = () => state.tutorial ? tutorialUI.objectives() : toast(`${state.totalVisitors} / 50 ${t('ID_GENERAL_VISITORS', 'visitors')} · ${money(state.income)} / $1,000`);
  $('players-button').onclick = () => toast(`${state.guests.length} ${t('ID_GENERAL_VISITORS', 'visitors')} ${t('ID_WEB_IN_CASINO')}`);
  $('filter-button').onclick = () => filterUI.show();
  $('world-button').onclick = () => toast(t('ID_WEB_WORLD_VIEW_NOT_READY'));
  $('hide-panel').onclick = () => { panelVisible = !panelVisible; document.querySelector('.classic-build')!.classList.toggle('collapsed', !panelVisible); };
  const clickSound = new Audio(`${import.meta.env.BASE_URL}assets/sound/ui-click.ogg`);
  const ambience = new Audio(`${import.meta.env.BASE_URL}assets/sound/casino-ambience.ogg`);
  const machineAmbience = new Audio(`${import.meta.env.BASE_URL}assets/sound/casino-machines.ogg`);
  const mechanicAmbience = new Audio(`${import.meta.env.BASE_URL}assets/sound/mechanic-ambience.ogg`);
  mechanicAmbience.loop = true;
  let audioUnlocked = false;
  const resultSounds = {
    cashRegister: new Audio(`${import.meta.env.BASE_URL}assets/sound/cash-register.ogg`),
    winSmall: new Audio(`${import.meta.env.BASE_URL}assets/sound/win-small.ogg`),
    winMedium: new Audio(`${import.meta.env.BASE_URL}assets/sound/win-medium.ogg`),
    winBig: new Audio(`${import.meta.env.BASE_URL}assets/sound/win-big.ogg`),
    loseSmall: new Audio(`${import.meta.env.BASE_URL}assets/sound/lose-small.ogg`),
    loseMedium: new Audio(`${import.meta.env.BASE_URL}assets/sound/lose-medium.ogg`),
  };
  ambience.loop = machineAmbience.loop = true; ambience.volume = .16; machineAmbience.volume = .12;
  resultSounds.cashRegister.volume = .7;
  $('sfx-volume').oninput = (event) => {
    const value = Number((event.target as HTMLInputElement).value);
    clickSound.volume = value;
    for (const sound of Object.values(resultSounds)) sound.volume = value;
  };
  $('ambient-volume').oninput = (event) => {
    ambience.volume = Number((event.target as HTMLInputElement).value);
    machineAmbience.volume = ambience.volume * .75;
  };
  document.addEventListener('pointerdown', event => {
    if ((event.target as HTMLElement).closest('button')) {
      audioUnlocked = true;
      clickSound.currentTime = 0; void clickSound.play().catch(() => {});
      void ambience.play().catch(() => {});
      if (state.buildings.some(b => ['slot','poker','blackjack','roulette'].includes(b.type))) void machineAmbience.play().catch(() => {});
    }
  });
  let down = { x: 0, y: 0 };
  let painting: { x: number; z: number } | null = null;
  const canvas = world.renderer.domElement;
  canvas.addEventListener('pointerdown', e => {
    world.setCombinedPan(e.buttons === 3);
  }, true);
  function paintTo(x: number, z: number) {
    if (!build || build.id !== 'path-1' || !state.tutorial || tutorialUI.paused) return;
    x = Math.max(-1, Math.min(48, x)); z = Math.max(-1, Math.min(40, z));
    if (!painting) painting = { x, z };
    // Four-connected strokes: fill every intervening cell, including fast drags.
    const point = { ...painting };
    place(state, build, point.x, point.z, 0, catalog);
    while (point.x !== x) { point.x += Math.sign(x - point.x); place(state, build, point.x, point.z, 0, catalog); }
    while (point.z !== z) { point.z += Math.sign(z - point.z); place(state, build, point.x, point.z, 0, catalog); }
    painting = { x, z }; updateHud();
  }
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY };
    if (e.button === 0 && build?.id === 'path-1' && state.tutorial) {
      const p = world.point(e); if (p) paintTo(Math.floor(p.x), Math.floor(p.z));
    }
  });
  canvas.addEventListener('pointermove', e => {
    const p = world.point(e);
    hasPointer = !!p;
    if (p) pointer = { x: Math.floor(p.x), z: Math.floor(p.z) };
    if (painting && (e.buttons & 1) && p) paintTo(pointer.x, pointer.z);
    updatePreview();
  });
  canvas.addEventListener('pointerleave', () => { hasPointer = false; updatePreview(); });
  canvas.addEventListener('pointerup', e => {
    if (painting) { painting = null; updatePreview(); return; }
    if (e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    if (build) {
      const p = world.point(e); if (!p) return;
      const error = place(state, build, Math.floor(p.x), Math.floor(p.z), rotation, catalog);
      if (error) toast(t(error, error));
      else { toast(`${t(build.nameKey, build.name)}: ${t('ID_WEB_OBJECT_PLACED')}.`); if (!(e.shiftKey || multiBuild || build.id === 'path-1')) choose(null); }
      updatePreview(); updateHud();
    } else {
      const role = world.pickStaff(e);
      if (role) { staffSelection = role; selected = null; updateInspector(); return; }
      staffSelection = null;
      selected = world.pick(e); updateInspector();
      if (selected !== null) world.focusBuilding(selected);
      if (state.tutorial && selected === null) {
        const point = world.point(e);
        if (point && point.x >= 0 && point.x < 48 && point.z >= 0 && point.z < 40) tutorialUI.selectLot();
      }
    }
  });
  window.addEventListener('keydown', e => {
    if (!inGame || tutorialUI.paused || helpDialog.open || confirmDialog.open || (e.target as HTMLElement).matches('input, textarea, select')) return;
    if (e.code === 'Escape') choose(null);
    if (e.code === 'PageUp' || e.code === 'PageDown') { e.preventDefault(); world.zoomCamera(e.code === 'PageUp' ? .9 : 1 / .9); }
    if ((e.code === 'Space' || e.code === 'KeyR') && build) { e.preventDefault(); rotation = (rotation + 1) % 4; updatePreview(); }
  });
  $('inventory').innerHTML = `<div class="inventory">${Object.entries(data.formats).map(([ext, info]) => `<span>${ext}</span><b>${info.count.toLocaleString()} files</b>`).join('')}</div>`;
  renderGroups(); renderMinors(); renderCatalog(); updateHud();
  void Promise.all(data.uiSprites.filter(sprite => spriteNames.some(name => name.toLowerCase() === sprite.name.toLowerCase())).map(async sprite => {
    try {
      const url = await world.sprite(sprite.file);
      images.set(`ui:${sprite.name}`, url);
      for (const name of spriteNames.filter(name => name.toLowerCase() === sprite.name.toLowerCase())) images.set(`ui:${name}`, url);
    } catch { /* optional original UI decoration */ }
  })).then(() => {
    for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ui]'))) {
      const name = button.dataset.ui!;
      if (images.has(`ui:${name}`)) {
        button.textContent = ''; button.style.backgroundImage = `url("${images.get(`ui:${name}`)}")`;
        button.classList.add('sprite-button');
      }
    }
    for (const image of Array.from(document.querySelectorAll<HTMLImageElement>('[data-menu-ui]'))) {
      const url = images.get(`ui:${image.dataset.menuUi}`);
      if (url) image.src = url;
    }
    renderGroups(); renderMinors();
  });
  let last = performance.now(), accumulator = 0, hudTime = 0, saveTime = 0;
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, .1); last = now;
    const activeSpeed = !inGame || document.hidden || helpDialog.open || confirmDialog.open || tutorialUI.paused || $<HTMLDialogElement>('tutorial-dialog').open ? 0 : speed;
    accumulator += dt * activeSpeed;
    while (accumulator >= .05) { sim.step(.05); accumulator -= .05; }
    for (const result of sim.events.splice(0)) {
      const sound = result.type === 'sale' ? resultSounds.cashRegister : result.type === 'win'
        ? result.amount >= 80 ? resultSounds.winBig : result.amount >= 25 ? resultSounds.winMedium : resultSounds.winSmall
        : result.amount >= 60 ? resultSounds.loseMedium : resultSounds.loseSmall;
      sound.currentTime = 0; void sound.play().catch(() => {});
    }
    world.sync(state.buildings, state.guests, catalog, selected); world.render();
    world.syncPaving(state, catalog);
    world.syncMechanic(state);
    if (inGame && !document.hidden && audioUnlocked && state.mechanic) {
      const hut = state.buildings.find(b => b.uid === state.mechanic!.home)!;
      const distance = Math.hypot(world.controls.target.x - hut.x - 2, world.controls.target.z - hut.z - 1);
      mechanicAmbience.volume = ambience.volume * .8 * Math.max(0, 1 - distance / 40);
      if (mechanicAmbience.volume > 0 && mechanicAmbience.paused) void mechanicAmbience.play().catch(() => {});
    } else mechanicAmbience.pause();
    hudTime += dt; saveTime += dt * activeSpeed;
    if (hudTime > .5) { updateHud(); updatePreview(); hudTime = 0; }
    if (saveTime > 30) { save(true); saveTime = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('pagehide', () => { if (inGame) save(true); });
  toast(t('ID_WEB_WELCOME_TO_CASINO'));
}

start().catch(error => {
  console.error(error);
  app.innerHTML = '<div class="fatal"><h1>Vegas could not start.</h1><p>Please check browser support for WebGL and reload the page.</p><pre></pre><button onclick="location.reload()">Try Again</button></div>';
  app.querySelector('pre')!.textContent = String(error);
});
