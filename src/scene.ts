import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import { DEPTH, WIDTH, dimensions, type Building, type CatalogItem, type Guest } from './game';

const palette: Record<string, number> = {
  slot: 0xb23852, poker: 0x5657a8, blackjack: 0x187f74, roulette: 0x187f74,
  cashier: 0xbd994d, bar: 0x652e4d, restroom: 0x4a687b, security: 0x354f85,
  cleaner: 0x56876b, mechanic: 0x997353, sofa: 0x8b3861, plant: 0x2e9b63,
};
export class CasinoScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(44, 1, .1, 500);
  controls: OrbitControls;
  buildings = new Map<number, THREE.Group>();
  people = new Map<number, THREE.Group>();
  ghost = new THREE.Group();
  selection = new THREE.BoxHelper(new THREE.Object3D(), 0xf4cf7e);
  private ray = new THREE.Raycaster();
  private floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private thumbnailTextures = new Map<string, THREE.Texture>();
  private observer: ResizeObserver;
  private room = new THREE.Group();
  private exterior = new THREE.Group();

  constructor(public host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x101a26);
    host.append(this.renderer.domElement);
    this.camera.position.set(66, 64, 80);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(WIDTH / 2, 0, DEPTH / 2);
    this.controls.enableDamping = true;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 110;
    this.controls.maxPolarAngle = Math.PI * .45;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.scene.add(new THREE.HemisphereLight(0xcde8ff, 0x5b3d4c, 2.4));
    const sun = new THREE.DirectionalLight(0xffe1a9, 3.2);
    sun.position.set(10, 50, 20); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, far: 140 });
    sun.shadow.bias = -.0005;
    sun.target.position.set(24, 0, 20);
    this.scene.add(sun, sun.target);
    this.makeRoom();
    this.makeExterior(); this.exterior.visible = false;
    this.scene.add(this.room, this.exterior);
    this.selection.visible = false;
    this.scene.add(this.ghost, this.selection);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  private box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number,
    color: number, emissive = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({
      color, roughness: .55, metalness: .2, emissive: emissive ? color : 0, emissiveIntensity: emissive ? .6 : 0,
    }));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  private makeRoom() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#34263d'; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#695047'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(64, 8); ctx.lineTo(120, 64); ctx.lineTo(64, 120); ctx.lineTo(8, 64); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#51404b'; ctx.strokeRect(2, 2, 124, 124);
    ctx.fillStyle = '#a68c5c'; ctx.beginPath(); ctx.arc(64, 64, 4, 0, Math.PI * 2); ctx.fill();
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(24, 20);
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, DEPTH), new THREE.MeshStandardMaterial({ map: texture, roughness: .95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(24, .01, 20); floor.receiveShadow = true; this.room.add(floor);
    this.box(this.room, WIDTH + 1, .7, DEPTH + 1, 24, -.4, 20, 0x121921);
    this.box(this.room, WIDTH, 1.3, .4, 24, .65, 0, 0x283746);
    this.box(this.room, .4, 1.3, DEPTH, 0, .65, 20, 0x283746);
    this.box(this.room, WIDTH, .12, .5, 24, 1.35, 0, 0xf4c76e, true);
    this.box(this.room, .5, .12, DEPTH, 0, 1.35, 20, 0xf4c76e, true);
    for (let x = 3; x < 48; x += 7) {
      this.box(this.room, .6, 3.5, .6, x, 1.75, .7, 0xc6ae80);
      this.box(this.room, .9, .15, .9, x, 3.5, .7, 0xf6d38c);
    }
    this.box(this.room, 4, .04, 2, 24.5, .04, 39, 0x9d7647);
    this.label(this.room, 'VEGA$  /  MAKE IT BIG!', 24, 2.3, .8, 16, 1.5);
    this.label(this.room, 'ENTRANCE', 24.5, .08, 38.8, 4, .6, true);
  }
  private makeExterior() {
    this.box(this.exterior, 160, .5, 150, 24, -.4, 20, 0xa49a83);
    this.box(this.exterior, WIDTH, .1, DEPTH, 24, -.04, 20, 0xc1ad89);
    for (const x of [-5, 53]) {
      this.box(this.exterior, 6, .08, 150, x, -.05, 20, 0x545c62);
      for (let z = -50; z < 90; z += 5) this.box(this.exterior, .13, .03, 2, x, .01, z, 0xd4cbb1);
    }
    for (const z of [-5, 45]) {
      this.box(this.exterior, 160, .08, 6, 24, -.04, z, 0x545c62);
      for (let x = -50; x < 100; x += 5) this.box(this.exterior, 2, .03, .13, x, .01, z, 0xd4cbb1);
    }
    for (const x of [-24, 73]) for (const z of [-25, 12, 65]) {
      this.box(this.exterior, 15, 9, 16, x, 4.4, z, 0x8b979d);
      this.box(this.exterior, 16, .4, 17, x, 9, z, 0x536375);
    }
    for (let x = 1; x < WIDTH; x += 3) {
      this.box(this.exterior, .1, 1, .1, x, .5, 0, 0x999182);
      this.box(this.exterior, .1, 1, .1, x, .5, DEPTH, 0x999182);
    }
  }
  setExterior(enabled: boolean) {
    this.exterior.visible = enabled; this.room.visible = !enabled;
    this.renderer.setClearColor(enabled ? 0x969a9c : 0x101a26);
  }
  private label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, w: number, h: number, flat = false) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#12212b'; ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#f6d38c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 62px sans-serif'; ctx.fillText(text, 512, 64);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z); if (flat) mesh.rotation.x = -Math.PI / 2;
    parent.add(mesh);
  }
  async thumbnail(item: CatalogItem): Promise<string> {
    return this.loadTga(`assets/${item.thumbnail}`, item.id);
  }
  async sprite(file: string): Promise<string> {
    return this.loadTga(`assets/ui/${file}`);
  }
  private async loadTga(relative: string, key?: string): Promise<string> {
    const texture = await new TGALoader().loadAsync(`${import.meta.env.BASE_URL}${relative}`);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (key) this.thumbnailTextures.set(key, texture);
    const image = texture.image as { width: number; height: number; data: Uint8Array };
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    const pixels = new Uint8ClampedArray(image.data);
    ctx.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
    // TGALoader normalizes the source's origin flags to top-left RGBA data.
    return canvas.toDataURL();
  }
  private makeBuilding(item: CatalogItem) {
    const group = new THREE.Group(), w = item.width, d = item.depth;
    const color = palette[item.id] ?? 0xb99254;
    this.box(group, w * .92, .12, d * .92, 0, .09, 0, 0x9a804d);
    if (item.id === 'smallhotel') {
      this.box(group, w * .83, 5, d * .7, 0, 2.6, 0, 0xd5c49c);
      this.box(group, w * .88, .35, d * .76, 0, 5.25, 0, 0x768998);
      for (let x = -4; x <= 4; x += 2) for (let y = 1.4; y < 5; y += 1.4) {
        this.box(group, .9, .8, .08, x, y, d * .355, 0x526f80);
      }
      this.box(group, 1.8, 1.8, .12, 0, 1, d * .36, 0x3b424b);
    } else if (item.id === 'plant') {
      this.box(group, .7, .6, .7, 0, .4, 0, 0xb49b70);
      this.box(group, .16, 1.5, .16, 0, 1.2, 0, 0x795a36);
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), new THREE.MeshStandardMaterial({ color }));
      leaves.position.y = 2; leaves.castShadow = true; group.add(leaves);
    } else if (item.id === 'slot' || item.id === 'poker') {
      this.box(group, .84, .7, .8, 0, .48, -.6, 0x272634);
      this.box(group, .85, 1.5, .65, 0, 1.45, -.6, color);
      this.box(group, .65, .65, .08, 0, 1.55, -.22, 0x74ddce, true);
      this.box(group, .7, .15, .4, 0, 1, -.05, 0xe9c27e);
      this.box(group, .65, .6, .65, 0, .4, .7, 0x5f334d);
      this.box(group, .9, .15, .72, 0, 2.3, -.6, 0xfbc97a, true);
    } else if (item.category === 'gaming') {
      this.box(group, w * .65, .9, d * .55, 0, .6, 0, 0x5c3e2e);
      this.box(group, w * .72, .16, d * .65, 0, 1.12, 0, color);
      for (let i = 0; i < item.capacity; i++) {
        const a = (i / item.capacity) * Math.PI * 2;
        this.box(group, .65, .65, .65, Math.cos(a) * w * .42, .4, Math.sin(a) * d * .42, 0x57374c);
      }
      if (item.id === 'roulette') {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .16, 24), new THREE.MeshStandardMaterial({ color: 0xd3a958 }));
        wheel.position.set(-w * .2, 1.3, 0); group.add(wheel);
      }
    } else if (item.id === 'sofa') {
      this.box(group, w * .7, .6, d * .8, 0, .5, 0, color);
      this.box(group, .35, 1.2, d * .8, -w * .35, .8, 0, color);
    } else {
      this.box(group, w * .86, 1.8, d * .6, 0, 1, -d * .12, color);
      this.box(group, w * .9, .18, d * .65, 0, 1.98, -d * .12, 0xd4bd8c);
      if (item.id === 'bar') {
        for (let i = 0; i < 7; i++) this.box(group, .4, 1, .4, -3 + i, 2.5, -d * .12, [0x6aaf97, 0xbb5c6b, 0xe3bd7b][i % 3]);
      }
      const texture = this.thumbnailTextures.get(item.id);
      if (texture) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
        sign.position.set(0, 1.3, d * .19); group.add(sign);
      }
    }
    return group;
  }
  sync(buildings: Building[], guests: Guest[], catalog: CatalogItem[], selected: number | null) {
    for (const [id, mesh] of this.buildings) if (!buildings.some(b => b.uid === id)) {
      this.disposeGroup(mesh); this.buildings.delete(id);
    }
    for (const b of buildings) {
      if (!this.buildings.has(b.uid)) {
        const item = catalog.find(c => c.id === b.type)!;
        const mesh = this.makeBuilding(item); const { w, d } = dimensions(item, b.rotation);
        mesh.position.set(b.x + w / 2, 0, b.z + d / 2); mesh.rotation.y = -b.rotation * Math.PI / 2;
        mesh.userData.uid = b.uid; this.buildings.set(b.uid, mesh); this.scene.add(mesh);
      }
    }
    this.selection.visible = selected !== null && this.buildings.has(selected);
    if (this.selection.visible) this.selection.setFromObject(this.buildings.get(selected!)!);
    for (const [id, mesh] of this.people) if (!guests.some(g => g.id === id)) {
      this.disposeGroup(mesh); this.people.delete(id);
    }
    for (const guest of guests) {
      let mesh = this.people.get(guest.id);
      if (!mesh) {
        mesh = new THREE.Group();
        const color = [0xe6b05f, 0x5bb4af, 0xd47598, 0x9896d8, 0xe2e0d2][guest.id % 5];
        this.box(mesh, .42, .7, .32, 0, .7, 0, color);
        this.box(mesh, .3, .3, .3, 0, 1.2, 0, 0xd9b18b);
        this.box(mesh, .15, .4, .2, -.13, .2, 0, 0x252c3c);
        this.box(mesh, .15, .4, .2, .13, .2, 0, 0x252c3c);
        this.people.set(guest.id, mesh); this.scene.add(mesh);
      }
      mesh.position.set(guest.x, .05, guest.z);
      if (guest.path[0]) mesh.rotation.y = Math.atan2(guest.path[0].x + .5 - guest.x, guest.path[0].z + .5 - guest.z);
    }
  }
  preview(item: CatalogItem | null, x: number, z: number, rotation: number, valid: boolean) {
    this.ghost.visible = !!item;
    if (!item) return;
    const { w, d } = dimensions(item, rotation);
    const signature = `${item.id}:${rotation}:${valid}`;
    if (this.ghost.userData.signature !== signature) {
      this.clearGroup(this.ghost);
      const mesh = this.box(this.ghost, w, .18, d, 0, .18, 0, valid ? 0x4ad6a2 : 0xf45c72);
      const mat = mesh.material as THREE.MeshStandardMaterial; mat.transparent = true; mat.opacity = .65;
      this.ghost.userData.signature = signature;
    }
    this.ghost.position.set(x + w / 2, 0, z + d / 2);
  }
  point(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    return this.ray.ray.intersectPlane(this.floor, new THREE.Vector3());
  }
  pick(event: PointerEvent): number | null {
    this.point(event);
    const hit = this.ray.intersectObjects([...this.buildings.values()], true)[0];
    if (!hit) return null;
    let node: THREE.Object3D | null = hit.object;
    while (node) { if (node.userData.uid) return node.userData.uid; node = node.parent; }
    return null;
  }
  resetCamera() { this.camera.position.set(66, 64, 80); this.controls.target.set(24, 0, 20); }
  render() { this.controls.update(); this.renderer.render(this.scene, this.camera); }
  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix();
  }
  private clearGroup(group: THREE.Group) {
    for (const child of [...group.children]) this.disposeGroup(child);
  }
  private disposeGroup(object: THREE.Object3D) {
    object.traverse(node => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        for (const mat of Array.isArray(node.material) ? node.material : [node.material]) mat.dispose();
      }
    });
    object.removeFromParent();
  }
}
