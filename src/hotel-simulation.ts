import type { CatalogItem, GameState } from './game';
import { hotelRoute } from './paving.ts';

export function stepHotel(state: GameState, catalog: CatalogItem[], dt: number) {
  const hotel = state.buildings.find(b => b.type === 'smallhotel');
  if (!hotel) return;
  const item = catalog.find(c => c.id === hotel.type)!;
  const route = hotelRoute(state, catalog);
  const tutorial = state.tutorial!;
  if (route) tutorial.pathConnected = true;
  tutorial.arrivalTimer = (tutorial.arrivalTimer ?? 0) + dt;
  if (route && hotel.health > 0 && state.open && tutorial.arrivalTimer >= 4 &&
    state.guests.filter(g => !g.leaving).length < item.capacity) {
    tutorial.arrivalTimer = 0;
    const entrance = route[route.length - 1]; state.totalVisitors++;
    state.guests.push({ id: state.nextId++, x: entrance.x + .5, z: entrance.z + .5,
      path: [...route].reverse(), target: hotel.uid, activity: 'walking', timer: 0,
      cash: 500, happiness: 65, served: 0, leaving: false });
  }
  for (const g of state.guests) {
    if (g.path.length) {
      const p = g.path[0], dx = p.x + .5 - g.x, dz = p.z + .5 - g.z;
      const distance = Math.hypot(dx, dz), travel = dt * 3;
      if (distance <= travel) { g.x = p.x + .5; g.z = p.z + .5; g.path.shift(); }
      else { g.x += dx / distance * travel; g.z += dz / distance * travel; }
      continue;
    }
    if (g.leaving) { g.activity = 'gone'; continue; }
    if (g.activity === 'walking') {
      if (!route || !state.open || hotel.health <= 0) { g.activity = 'gone'; continue; }
      // Charge the original motel-room default price on check-in; 90-second stay.
      const price = item.roomPrice ?? 25;
      g.cash -= price; hotel.income += price; hotel.visits++; state.income += price;
      state.cash += price; g.activity = 'staying'; g.timer = item.duration; g.served++;
    } else {
      g.timer -= dt;
      if (g.timer <= 0 && route) { g.leaving = true; g.activity = 'leaving'; g.path = [...route]; }
    }
  }
  state.guests = state.guests.filter(g => g.activity !== 'gone');
}
