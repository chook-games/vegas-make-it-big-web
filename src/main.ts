import './style.css';
import { CasinoScene } from './scene';
import { Simulation, createGame, canPlace, place, sell, restore, serialize, SAVE_KEY,
  DAY_SECONDS, type CatalogItem, type GameState } from './game';

const app = document.querySelector<HTMLDivElement>('#app')!;
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

async function start() {
  const response = await fetch(`${import.meta.env.BASE_URL}assets/game-data.json`);
  if (!response.ok) throw new Error('Δεν φορτώθηκαν τα δεδομένα του παιχνιδιού.');
  const data: { catalog: CatalogItem[]; campaign: string[]; formats: Record<string, { count: number; bytes: number }>; uiSprites: { name: string; file: string }[]; sounds: { id: string; file: string }[] } = await response.json();
  const catalog = data.catalog;
  let major = 4, minor = '';
  let multiBuild = false, panelVisible = true, wandering = false;
  let state = createGame();
  let sim = new Simulation(state, catalog);
  let speed = 1, selected: number | null = null, build: CatalogItem | null = null;
  let rotation = 0, pointer = { x: 0, z: 0 }, hasPointer = false;
  const images = new Map<string, string>();
  const spriteNames = ['i_options','i_objectives','i_players','i_camera','i_wander','i_normal','i_slow','i_fast','i_pause','i_filter','i_world','i_hidebar','i_cross','i_multibuild','i_build','i_savegame','i_load','i_infrastructure_big','i_entertainment_big','i_retail_big','i_scenery_big','i_games_big','i_internalbuildings_big','i_internalscenery_big','t_accom','t_office','t_staff','t_rest','t_facilities_A','t_trans','t_gaming','t_activities','t_shows','t_shops','t_services','t_fooddrink','t_path','t_grass','t_furniture','t_gardens','t_signs','t_slots','t_tables','t_intfac','t_intfac_A','t_intmech_A','t_furniture'];
  app.innerHTML = `
    <main class="play-area classic-ui" aria-label="Τρισδιάστατο καζίνο">
        <div id="viewport"></div>
        <div class="classic-top-left"><button id="help" data-ui="i_options" title="Επιλογές">⚙</button><button id="objective-button" data-ui="i_objectives" title="Στόχοι">♜</button><button id="players-button" data-ui="i_players" title="Επισκέπτες">♟</button><button data-ui="i_camera" id="screenshot" title="Στιγμιότυπο οθόνης">◉</button><button id="wander" data-ui="i_wander" title="Ελεύθερη κάμερα">◌</button><span class="speed-pack"><button data-speed="1" data-ui="i_normal" title="Κανονική ταχύτητα">1</button><button data-speed="2" data-ui="i_slow" title="2× ταχύτητα">2</button><button data-speed="3" data-ui="i_fast" title="3× ταχύτητα">3</button></span><button data-speed="0" data-ui="i_pause" title="Παύση">Ⅱ</button></div>
        <div class="classic-top-right"><div id="game-clock">12:00</div><div><span>ΗΜΕΡΑ </span><b id="day">01</b></div><div class="classic-cash"><span>§</span><b id="cash">$50,000</b></div></div>
        <div class="classic-left-tools"><button id="filter-button" data-ui="i_filter" title="Φίλτρα">F</button><button id="world-button" data-ui="i_world" title="Προβολή κόσμου">◉</button><button id="hide-panel" data-ui="i_hidebar" title="Απόκρυψη πάνελ">⌄</button></div>
        <div class="classic-objectives"><b id="objective-title">Welcome to the Strip</b><span id="objective-count">0 / 50 visitors</span><div class="progress"><i id="progress"></i></div></div>
        <div id="empty-hint"><span>♠</span><h2>Welcome to your casino.</h2><p>Επίλεξε το build button και διάλεξε αντικείμενα, όπως στο αρχικό παιχνίδι.</p><button id="first-slot" class="primary">ΚΑΤΑΣΚΕΥΗ</button><button id="demo" class="text-button">Έτοιμη διάταξη</button></div>
        <section class="classic-build" aria-label="Εργαλειοθήκη κατασκευής">
          <div class="build-topline"><div id="panel-title">Casino Interior — Build Objects <small id="object-count"></small></div><div class="build-head-actions"><button id="build-context" title="Switch between casino interior and outside lot building">LOT / CASINO</button><button id="cancel-build" data-ui="i_cross" title="Ακύρωση / κλείσιμο">×</button></div></div>
          <div class="build-layout"><div class="major-groups" id="major-groups"></div><div class="minor-tabs" id="minor-tabs"></div><div class="catalog" id="catalog"></div><div class="build-controls"><button id="multi-build" data-ui="i_multibuild" title="Πολλαπλή κατασκευή">⇉</button><button id="build-confirm" data-ui="i_build" title="Κατασκευή επιλεγμένου">✓</button></div></div>
          <div class="build-status"><span id="selection-status">Επίλεξε αντικείμενο κατασκευής</span><span id="simulation-label">Η προσομοίωση τρέχει</span><span id="daily-cost">Κόστος / ημέρα $0</span><span id="visitors">0 visitors</span><span id="income">$0</span></div>
        </section>
        <div id="placement" class="placement" hidden></div>
        <div id="inspector" class="inspector" hidden></div>
        <div class="scene-footer"><span>Right mouse: rotate camera · Wheel: zoom · Left mouse: pan</span><span>Space: rotate object · Esc: cancel</span></div>
        <div class="classic-actions"><button id="toggle-open">CASINO OPEN</button><button id="save" data-ui="i_savegame" title="Αποθήκευση">▣</button><button id="load" data-ui="i_load" title="Φόρτωση">↥</button><button id="new-game">↻</button><button id="help-alt">?</button></div>
    </main>
    <div id="toast" role="status" aria-live="polite"></div>
    <dialog id="help-dialog"><div class="dialog-heading"><span class="eyebrow">VEGAS: MAKE IT BIG · OPTIONS / PORT STATUS</span><button id="close-help" class="icon-button" aria-label="Κλείσιμο">×</button></div><h2>Επιλογές παιχνιδιού</h2><p>Η διάταξη ακολουθεί το αρχικό in-game interface: status controls επάνω αριστερά, ώρα/μετρητά επάνω δεξιά και build toolbox στο κάτω μέρος.</p><h3>Ήχος</h3><label class="option-row">Εφέ διεπαφής & παιχνιδιού <input id="sfx-volume" type="range" min="0" max="1" step="0.05" value="0.65" /></label><label class="option-row">Ατμόσφαιρα καζίνο <input id="ambient-volume" type="range" min="0" max="1" step="0.05" value="0.16" /></label><h3>Χειρισμός</h3><ul><li>Επίλεξε μία από τις τέσσερις major ομάδες, μετά υποκατηγορία και thumbnail για να ξεκινήσεις κατασκευή.</li><li><b>Space</b>: περιστροφή · <b>Shift + click</b>: πολλαπλή κατασκευή · <b>Esc</b>: ακύρωση.</li><li>Right mouse drag περιστρέφει την κάμερα · wheel κάνει zoom · Shift + left drag κάνει pan.</li><li>Επίλεξε αντικείμενο στον κόσμο για πληροφορίες, επισκέψεις, οικονομικά ή πώληση.</li></ul><h3>Κατάσταση μεταφοράς</h3><p>Τα 164 build templates, 372 UI sprites και επιλεγμένα ηχητικά εφέ προέρχονται από τα αρχικά αρχεία. Τα 3D models και η προσομοίωση επισκεπτών παραμένουν minimal reimplementations· το original interior/grid pathfinding, guest desires και event rules συνεχίζουν να μεταφέρονται.</p><details><summary>Αρχικά αρχεία και formats</summary><div id="inventory"></div><p>Campaign order: ${data.campaign.join(' · ')}.</p></details><button id="play" class="primary">Συνέχεια</button></dialog>
    <dialog id="confirm-dialog"><h2>Νέο καζίνο;</h2><p>Η τρέχουσα πρόοδος και η αποθηκευμένη παρτίδα θα αντικατασταθούν.</p><div class="dialog-actions"><button id="cancel-new">Ακύρωση</button><button id="confirm-new" class="primary">Νέο καζίνο</button></div></dialog>`;
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const world = new CasinoScene($('viewport'));
  let toastTimeout: ReturnType<typeof setTimeout>;
  function toast(message: string) {
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('show'), 3500);
  }
  function choose(item: CatalogItem | null) {
    build = item; selected = null; rotation = 0;
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
      [0, 'Hotels & facilities', 'i_infrastructure_big'], [1, 'Casinos & entertainment', 'i_entertainment_big'],
      [2, 'Shops & services', 'i_retail_big'], [3, 'Paths & scenery', 'i_scenery_big'],
      [4, 'Casino games', 'i_games_big'], [5, 'Casino staff', 'i_internalbuildings_big'],
      [6, 'Casino services', 'i_retail_big'], [7, 'Casino decor', 'i_internalscenery_big'],
    ];
    const contextGroups = groups.filter(([index]) => major < 4 ? index < 4 : index >= 4);
    $('major-groups').innerHTML = contextGroups.map(([index, name, sprite]) =>
      `<button class="major-group ${major === index ? 'active' : ''}" data-major="${index}" title="${name}">${imageMarkup(sprite)}<small>${name}</small></button>`).join('');
    $('major-groups').querySelectorAll<HTMLButtonElement>('[data-major]').forEach(button => button.onclick = () => {
      major = Number(button.dataset.major); minor = ''; choose(null); renderMinors(); renderCatalog();
    });
  }
  function renderMinors() {
    const available = [...new Set(catalog.filter(c => c.major === major).map(c => c.minor ?? c.category))];
    if (!minor && available.length) minor = available[0];
    $('minor-tabs').innerHTML = available.map((key, index) =>
      `<button class="minor-tab ${minor === key ? 'active' : ''}" data-minor="${key}" title="${minorNames[key] ?? key}"><img src="${images.get(`ui:${['t_accom','t_office','t_staff','t_rest','t_facilities_A','t_trans','t_gaming','t_activities','t_shows','t_shops','t_services','t_fooddrink','t_path','t_grass','t_furniture','t_gardens','t_signs','t_slots','t_tables','t_intfac','t_intfac_A','t_intmech_A'][index % 22]}`) ?? ''}" alt="" /><span>${minorNames[key] ?? key}</span></button>`).join('');
    $('minor-tabs').querySelectorAll<HTMLButtonElement>('[data-minor]').forEach(button => button.onclick = () => {
      minor = button.dataset.minor!; choose(null); renderMinors(); renderCatalog();
    });
  }
  function renderCatalog() {
    const visible = catalog.filter(c => c.major === major && (minor === '' || (c.minor ?? c.category) === minor));
    $('object-count').textContent = `${visible.length} objects`;
    $('catalog').innerHTML = visible.map(item => `
      <button class="catalog-item ${build?.id === item.id ? 'selected' : ''}" data-item="${item.id}" title="${item.width} × ${item.depth} · Χωρητικότητα ${item.capacity}">
      <div class="item-image">${images.has(item.id) ? `<img src="${images.get(item.id)}" alt="" />` : '<span>♠</span>'}</div>
      <div><strong>${item.name}</strong><small>${item.width} × ${item.depth} cells</small><b>${money(item.cost)}</b></div><span class="item-add">+</span></button>`).join('');
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
      $('placement').innerHTML = `<span>${build.name} <b>${money(build.cost)}</b></span><small>${hasPointer && error ? error : 'Κλικ για τοποθέτηση · Space / R για περιστροφή · Esc για ακύρωση'}</small>`;
    }
  }
  function updateInspector() {
    const b = state.buildings.find(b => b.uid === selected);
    $('inspector').hidden = !b;
    if (!b) return;
    const item = catalog.find(c => c.id === b.type)!;
    $('inspector').innerHTML = `<div class="section-heading"><span class="eyebrow">SELECTED OBJECT</span><button id="deselect" class="text-button" aria-label="Κλείσιμο πληροφοριών">×</button></div><h2>${item.name}</h2><div class="inspector-grid"><span>Υγεία <b>${Math.round(b.health)}%</b></span><span>Επισκέψεις <b>${b.visits}</b></span><span>Καθαρά έσοδα <b>${money(b.income)}</b></span><span>Κόστος / ημέρα <b>${money(item.runningCost + item.power + item.water)}</b></span></div><small class="muted">Αρχικό footprint ${item.width} × ${item.depth} · χωρητικότητα ${item.capacity}</small><button id="sell" class="sell-button">Πώληση · +${money(item.resale)}</button>`;
    $('sell').onclick = () => { sell(state, b.uid, catalog); selected = null; updateInspector(); toast('Το αντικείμενο πουλήθηκε.'); };
    $('deselect').onclick = () => { selected = null; updateInspector(); };
  }
  function updateHud() {
    $('cash').textContent = money(state.cash); $('cash').classList.toggle('negative', state.cash < 0);
    $('visitors').textContent = String(state.guests.length);
    $('income').textContent = money(state.income);
    $('day').textContent = String(Math.floor(state.elapsed / DAY_SECONDS) + 1).padStart(2, '0');
    $('daily-cost').textContent = `Κόστος / ημέρα ${money(sim.dailyCost())}`;
    $('empty-hint').hidden = state.buildings.length > 0 || !!build;
    $('objective-count').textContent = `${state.totalVisitors} / 50 αφίξεις · ${money(state.income)} / $1,000`;
    $('progress').style.width = `${Math.min(100, Math.max(0, Math.min(state.totalVisitors / 50, state.income / 1000)) * 100)}%`;
    $('objective-title').textContent = state.completed ? 'Ο πρώτος στόχος ολοκληρώθηκε!' : 'Welcome to the floor';
    $('toggle-open').textContent = state.open ? 'CASINO OPEN' : 'CASINO CLOSED';
    $('game-clock').textContent = `${String(Math.floor((state.elapsed % DAY_SECONDS) / DAY_SECONDS * 24)).padStart(2, '0')}:00`;
    updateInspector();
  }
  function changeState(next: GameState) {
    state = next; sim = new Simulation(state, catalog); choose(null); world.sync(state.buildings, [], catalog, null); updateHud();
  }
  function save(automatic = false) {
    try { localStorage.setItem(SAVE_KEY, serialize(state)); if (!automatic) toast('Η παρτίδα αποθηκεύτηκε στον browser.'); }
    catch { if (!automatic) toast('Η αποθήκευση δεν είναι διαθέσιμη στον browser.'); }
  }
  $('save').onclick = () => save();
  $('load').onclick = () => {
    try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return toast('Δεν υπάρχει αποθηκευμένη παρτίδα.'); changeState(restore(raw, catalog)); toast('Η παρτίδα φορτώθηκε.'); }
    catch { toast('Δεν ήταν δυνατή η φόρτωση της αποθήκευσης.'); }
  };
  const helpDialog = $<HTMLDialogElement>('help-dialog');
  $('help').onclick = $('help-alt').onclick = () => helpDialog.showModal();
  $('close-help').onclick = $('play').onclick = () => helpDialog.close();
  const confirmDialog = $<HTMLDialogElement>('confirm-dialog');
  $('new-game').onclick = () => confirmDialog.showModal();
  $('cancel-new').onclick = () => confirmDialog.close();
  $('confirm-new').onclick = () => { changeState(createGame()); save(true); confirmDialog.close(); toast('Νέο καζίνο. Καλή αρχή!'); };
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
    updateHud(); toast('Έτοιμη διάταξη. Οι επισκέπτες φτάνουν!');
  };
  document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button => {
    button.onclick = () => {
      speed = Number(button.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('active', b === button));
      $('simulation-label').textContent = speed ? `Η προσομοίωση τρέχει · ${speed}×` : 'Παύση προσομοίωσης';
    };
  });
  $('cancel-build').onclick = () => choose(null);
  $('build-context').onclick = () => { major = major < 4 ? 4 : 0; minor = ''; renderGroups(); renderMinors(); renderCatalog(); };
  $('build-confirm').onclick = () => { if (build) toast(`Τοποθέτησε ${build.name} στο δάπεδο.`); else toast('Επίλεξε πρώτα ένα αντικείμενο.'); };
  $('multi-build').onclick = () => { multiBuild = !multiBuild; $('multi-build').classList.toggle('active', multiBuild); toast(multiBuild ? 'Πολλαπλή κατασκευή ενεργή.' : 'Πολλαπλή κατασκευή ανενεργή.'); };
  $('wander').onclick = () => { wandering = !wandering; $('wander').classList.toggle('active', wandering); toast(wandering ? 'Ελεύθερη κάμερα' : 'Κάμερα καζίνο'); };
  $('objective-button').onclick = () => toast(`${state.totalVisitors} / 50 επισκέπτες · ${money(state.income)} / $1,000`);
  $('players-button').onclick = () => toast(`${state.guests.length} επισκέπτες στο καζίνο.`);
  $('filter-button').onclick = () => toast('Φίλτρα επιρροών: θόρυβος, ομορφιά και κάλυψη προσωπικού — σε μεταφορά.');
  $('world-button').onclick = () => toast('Η εξωτερική προβολή κόσμου θα προστεθεί μαζί με τα scenarios.');
  $('hide-panel').onclick = () => { panelVisible = !panelVisible; document.querySelector('.classic-build')!.classList.toggle('collapsed', !panelVisible); };
  const clickSound = new Audio(`${import.meta.env.BASE_URL}assets/sound/ui-click.ogg`);
  const ambience = new Audio(`${import.meta.env.BASE_URL}assets/sound/casino-ambience.ogg`);
  const machineAmbience = new Audio(`${import.meta.env.BASE_URL}assets/sound/casino-machines.ogg`);
  const resultSounds = {
    winSmall: new Audio(`${import.meta.env.BASE_URL}assets/sound/win-small.ogg`),
    winMedium: new Audio(`${import.meta.env.BASE_URL}assets/sound/win-medium.ogg`),
    winBig: new Audio(`${import.meta.env.BASE_URL}assets/sound/win-big.ogg`),
    loseSmall: new Audio(`${import.meta.env.BASE_URL}assets/sound/lose-small.ogg`),
    loseMedium: new Audio(`${import.meta.env.BASE_URL}assets/sound/lose-medium.ogg`),
  };
  ambience.loop = machineAmbience.loop = true; ambience.volume = .16; machineAmbience.volume = .12;
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
      clickSound.currentTime = 0; void clickSound.play().catch(() => {});
      void ambience.play().catch(() => {});
      if (state.buildings.some(b => ['slot','poker','blackjack','roulette'].includes(b.type))) void machineAmbience.play().catch(() => {});
    }
  });
  let down = { x: 0, y: 0 };
  const canvas = world.renderer.domElement;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', e => {
    const p = world.point(e);
    hasPointer = !!p;
    if (p) pointer = { x: Math.floor(p.x), z: Math.floor(p.z) };
    updatePreview();
  });
  canvas.addEventListener('pointerleave', () => { hasPointer = false; updatePreview(); });
  canvas.addEventListener('pointerup', e => {
    if (e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    if (build) {
      const p = world.point(e); if (!p) return;
      const error = place(state, build, Math.floor(p.x), Math.floor(p.z), rotation, catalog);
      if (error) toast(error);
      else { toast(`${build.name}: τοποθετήθηκε.`); if (!(e.shiftKey || multiBuild)) choose(null); }
      updatePreview(); updateHud();
    } else { selected = world.pick(e); updateInspector(); }
  });
  window.addEventListener('keydown', e => {
    if (helpDialog.open || confirmDialog.open || (e.target as HTMLElement).matches('input, textarea')) return;
    if (e.code === 'Escape') choose(null);
    if ((e.code === 'Space' || e.code === 'KeyR') && build) { e.preventDefault(); rotation = (rotation + 1) % 4; updatePreview(); }
  });
  $('inventory').innerHTML = `<div class="inventory">${Object.entries(data.formats).map(([ext, info]) => `<span>${ext}</span><b>${info.count.toLocaleString()} files</b>`).join('')}</div>`;
  renderGroups(); renderMinors(); renderCatalog(); updateHud();
  await Promise.all(catalog.filter(item => item.thumbnail).map(async item => {
    try { images.set(item.id, await world.thumbnail(item)); } catch { /* keep objects usable without a thumbnail */ }
  }));
  await Promise.all(data.uiSprites.filter(sprite => spriteNames.includes(sprite.name)).map(async sprite => {
    try { images.set(`ui:${sprite.name}`, await world.sprite(sprite.file)); } catch { /* optional original UI decoration */ }
  }));
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ui]'))) {
    const name = button.dataset.ui!;
    if (images.has(`ui:${name}`)) {
      button.textContent = ''; button.style.backgroundImage = `url("${images.get(`ui:${name}`)}")`;
      button.classList.add('sprite-button');
    }
  }
  renderGroups(); renderMinors(); renderCatalog();
  let last = performance.now(), accumulator = 0, hudTime = 0, saveTime = 0;
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, .1); last = now;
    const activeSpeed = document.hidden || helpDialog.open || confirmDialog.open ? 0 : speed;
    accumulator += dt * activeSpeed;
    while (accumulator >= .05) { sim.step(.05); accumulator -= .05; }
    for (const result of sim.events.splice(0)) {
      const sound = result.type === 'win'
        ? result.amount >= 80 ? resultSounds.winBig : result.amount >= 25 ? resultSounds.winMedium : resultSounds.winSmall
        : result.amount >= 60 ? resultSounds.loseMedium : resultSounds.loseSmall;
      sound.currentTime = 0; void sound.play().catch(() => {});
    }
    world.sync(state.buildings, state.guests, catalog, selected); world.render();
    hudTime += dt; saveTime += dt * activeSpeed;
    if (hudTime > .5) { updateHud(); updatePreview(); hudTime = 0; }
    if (saveTime > 30) { save(true); saveTime = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('pagehide', () => save(true));
  toast('Καλώς ήρθες! Διάλεξε ένα slot ή μια έτοιμη διάταξη.');
}

start().catch(error => {
  console.error(error);
  app.innerHTML = '<div class="fatal"><h1>Το καζίνο δεν μπόρεσε να ανοίξει.</h1><p>Έλεγξε ότι ο browser υποστηρίζει WebGL 2 και ανανέωσε τη σελίδα.</p><pre></pre><button onclick="location.reload()">Δοκίμασε ξανά</button></div>';
  app.querySelector('pre')!.textContent = String(error);
});
