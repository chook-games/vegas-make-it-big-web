import './style.css';
import { CasinoScene } from './scene';
import { Simulation, createGame, canPlace, place, sell, restore, serialize, SAVE_KEY,
  DAY_SECONDS, type CatalogItem, type GameState } from './game';

const app = document.querySelector<HTMLDivElement>('#app')!;
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

async function start() {
  const response = await fetch(`${import.meta.env.BASE_URL}assets/game-data.json`);
  if (!response.ok) throw new Error('Δεν φορτώθηκαν τα δεδομένα του παιχνιδιού.');
  const data: { catalog: CatalogItem[]; campaign: string[]; formats: Record<string, { count: number; bytes: number }> } = await response.json();
  const catalog = data.catalog;
  let state = createGame();
  let sim = new Simulation(state, catalog);
  let speed = 1, selected: number | null = null, build: CatalogItem | null = null;
  let rotation = 0, pointer = { x: 0, z: 0 }, hasPointer = false;
  let filter = 'all';
  const images = new Map<string, string>();
  app.innerHTML = `
    <header class="topbar">
      <div class="brand"><span class="brand-mark">V<span>♠</span></span><div><strong>VEGA<span>$</span></strong><small>MAKE IT BIG! <b>WEB PROTOTYPE · 0.1</b></small></div></div>
      <div class="stats"><div><small>ΚΕΦΑΛΑΙΟ</small><strong id="cash">$50,000</strong></div><div><small>ΕΠΙΣΚΕΠΤΕΣ</small><strong id="visitors">0</strong></div><div><small>ΚΑΘΑΡΑ ΕΣΟΔΑ ΠΑΙΧΝΙΔΙΩΝ</small><strong id="income">$0</strong></div><div><small>ΗΜΕΡΑ</small><strong id="day">01</strong></div></div>
      <button id="help" class="icon-button" title="Οδηγίες και κατάσταση port" aria-label="Οδηγίες">?</button>
    </header>
    <main class="workspace">
      <aside class="sidebar">
        <div class="eyebrow">YOUR EMPIRE STARTS HERE</div><h1>Το καζίνο σου.</h1><p class="intro">Χτίσε. Φέρε επισκέπτες.<br>Κάν’ το μεγάλο.</p>
        <div class="section-heading"><h2>Κατασκευή</h2><span id="object-count">12 αντικείμενα</span></div>
        <div class="filters" role="group" aria-label="Κατηγορίες"><button data-filter="all" class="active">Όλα</button><button data-filter="gaming">Παιχνίδια</button><button data-filter="service">Υπηρεσίες</button><button data-filter="staff">Προσωπικό</button><button data-filter="decor">Διακόσμηση</button></div>
        <div id="catalog" class="catalog"></div>
        <div class="source-note"><span>↳</span> Αρχικά εικονίδια TGA & τιμές Lua<br><small>Προσωρινά 3D μοντέλα · sandbox prototype</small></div>
      </aside>
      <section class="play-area" aria-label="Τρισδιάστατο καζίνο">
        <div id="viewport"></div>
        <div class="scene-header"><div><span class="live-dot"></span><span id="open-label">CASINO OPEN</span><h2>The first floor</h2><small>48 × 40 · Casino interior sandbox</small></div><button id="camera" class="glass-button">↗ Επαναφορά κάμερας</button></div>
        <div class="objective"><span class="objective-icon">♜</span><div><small>ΠΡΩΤΟΣ ΣΤΟΧΟΣ ΤΟΥ PROTOTYPE</small><strong id="objective-title">Welcome to the floor</strong><p>50 αφίξεις & $1,000 καθαρά έσοδα παιχνιδιών</p><div class="progress"><i id="progress"></i></div><span id="objective-count">0 / 50 επισκέπτες</span></div></div>
        <div id="empty-hint"><span>♠</span><h2>Όλα αρχίζουν με ένα slot.</h2><p>Διάλεξε αντικείμενο αριστερά και τοποθέτησέ το στο δάπεδο.</p><button id="first-slot" class="primary">+ Τοποθέτησε slot · $120</button><button id="demo" class="text-button">ή φόρτωσε μια έτοιμη διάταξη →</button></div>
        <div id="placement" class="placement" hidden></div>
        <div id="inspector" class="inspector" hidden></div>
        <div class="scene-footer"><span>Σύρσιμο: μετακίνηση · Δεξί σύρσιμο: περιστροφή · Ροδέλα: zoom</span><span>Space / R: περιστροφή αντικειμένου · Esc: ακύρωση</span></div>
      </section>
    </main>
    <footer class="bottom-bar"><div class="speed-controls"><button data-speed="0" aria-label="Παύση">Ⅱ</button><button data-speed="1" class="active">1×</button><button data-speed="2">2×</button><button data-speed="3">3×</button><span id="simulation-label">Η προσομοίωση τρέχει</span></div><div class="actions"><span id="daily-cost">Κόστος / ημέρα $0</span><button id="toggle-open">Κλείσιμο καζίνο</button><button id="save">Αποθήκευση</button><button id="load">Φόρτωση</button><button id="new-game">Νέο</button></div></footer>
    <div id="toast" role="status" aria-live="polite"></div>
    <dialog id="help-dialog"><div class="dialog-heading"><span class="eyebrow">PORT DEVELOPMENT / MILESTONE 01</span><button id="close-help" class="icon-button" aria-label="Κλείσιμο">×</button></div><h2>VEGA$ στον browser.</h2><p>Πρώτο playable τεχνικό prototype του port. Τα εικονίδια και τα κόστη, οι διαστάσεις, οι χωρητικότητες και τα ημερήσια έξοδα εισάγονται από την αρχική εγκατάσταση.</p><h3>Πώς παίζεις</h3><ul><li>Διάλεξε αντικείμενο και κάνε κλικ σε ελεύθερο δάπεδο.</li><li><b>Space / R</b>: περιστροφή · <b>Shift + κλικ</b>: πολλαπλή τοποθέτηση · <b>Esc</b>: ακύρωση.</li><li>Κλικ σε υπάρχον αντικείμενο για πληροφορίες και πώληση.</li><li>Βάλε παιχνίδια για επισκέπτες. Bar, WC και sofa βοηθούν την παραμονή τους.</li><li>Cashier συντηρεί slots. Mechanic συντηρεί εξοπλισμό.</li><li>Κάθε ημέρα διαρκεί 120 δευτερόλεπτα σε ταχύτητα 1×. Τα αρχικά έξοδα αφαιρούνται στο τέλος της ημέρας.</li><li>Αποθήκευση στον browser και αυτόματα κάθε 30 δευτερόλεπτα. Διατηρούνται χρήματα, χρόνος και διάταξη· οι επισκέπτες ξαναρχίζουν.</li></ul><h3>Κατάσταση μεταφοράς</h3><p>Η 3D γεωμετρία, η κίνηση, οι κανόνες κερδών και η προσομοίωση επισκεπτών είναι προσωρινές επανυλοποιήσεις. Τα αρχικά μοντέλα TM, τα textures DDT, ο εξωτερικός χάρτης και τα campaigns δεν έχουν μεταφερθεί ακόμα. Security και cleaner εμφανίζονται ως κατασκευές με έξοδα· η συμπεριφορά τους δεν έχει υλοποιηθεί.</p><details><summary>Καταγραφή αρχικών δεδομένων</summary><div id="inventory"></div><p>Η σειρά των ${data.campaign.length} αρχικών αποστολών έχει καταγραφεί: ${data.campaign.join(' · ')}. Δεν είναι ακόμα playable.</p></details><button id="play" class="primary">Πάμε στο καζίνο →</button></dialog>
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
  function renderCatalog() {
    $('catalog').innerHTML = catalog.filter(c => filter === 'all' || c.category === filter).map(item => `
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
    $('open-label').textContent = state.open ? 'CASINO OPEN' : 'CASINO CLOSED';
    $('toggle-open').textContent = state.open ? 'Κλείσιμο καζίνο' : 'Άνοιγμα καζίνο';
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
  $('help').onclick = () => helpDialog.showModal();
  $('close-help').onclick = $('play').onclick = () => helpDialog.close();
  const confirmDialog = $<HTMLDialogElement>('confirm-dialog');
  $('new-game').onclick = () => confirmDialog.showModal();
  $('cancel-new').onclick = () => confirmDialog.close();
  $('confirm-new').onclick = () => { changeState(createGame()); save(true); confirmDialog.close(); toast('Νέο καζίνο. Καλή αρχή!'); };
  $('toggle-open').onclick = () => { state.open = !state.open; updateHud(); };
  $('camera').onclick = () => world.resetCamera();
  $('first-slot').onclick = () => choose(catalog[0]);
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
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => {
    button.onclick = () => {
      filter = button.dataset.filter!;
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button)); renderCatalog();
    };
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
      else { toast(`${build.name}: τοποθετήθηκε.`); if (!e.shiftKey) choose(null); }
      updatePreview(); updateHud();
    } else { selected = world.pick(e); updateInspector(); }
  });
  window.addEventListener('keydown', e => {
    if (helpDialog.open || confirmDialog.open || (e.target as HTMLElement).matches('input, textarea')) return;
    if (e.code === 'Escape') choose(null);
    if ((e.code === 'Space' || e.code === 'KeyR') && build) { e.preventDefault(); rotation = (rotation + 1) % 4; updatePreview(); }
  });
  $('inventory').innerHTML = `<div class="inventory">${Object.entries(data.formats).map(([ext, info]) => `<span>${ext}</span><b>${info.count.toLocaleString()} files</b>`).join('')}</div>`;
  renderCatalog(); updateHud();
  await Promise.all(catalog.map(async item => images.set(item.id, await world.thumbnail(item))));
  renderCatalog();
  let last = performance.now(), accumulator = 0, hudTime = 0, saveTime = 0;
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, .1); last = now;
    const activeSpeed = document.hidden || helpDialog.open || confirmDialog.open ? 0 : speed;
    accumulator += dt * activeSpeed;
    while (accumulator >= .05) { sim.step(.05); accumulator -= .05; }
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
