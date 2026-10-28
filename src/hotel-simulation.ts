import type { Building, CatalogItem, GameState } from './game';
import { buildingRoute } from './paving.ts';

export function stepHotel(state: GameState, catalog: CatalogItem[], dt: number, onSale?: (amount: number) => void) {
  for (const building of state.buildings) {
    const route = buildingRoute(state, catalog, building);
    if (route && building.type === 'headoffice') state.tutorial!.officeConnected = true;
    if (route && building.type === 'souvenirshop') state.tutorial!.shopConnected = true;
    if (building.type === 'smallhotel' || building.type === 'souvenirshop') stepBusiness(state, catalog, building, dt, onSale);
  }
}
function stepBusiness(state: GameState, catalog: CatalogItem[], hotel: Building, dt: number, onSale?: (amount: number) => void) {
  const item = catalog.find(c => c.id === hotel.type)!;
  const route = buildingRoute(state, catalog, hotel);
  const tutorial = state.tutorial!;
  const isHotel = hotel.type === 'smallhotel';
  if (route && isHotel) tutorial.pathConnected = true;
  const timer = isHotel ? 'arrivalTimer' : 'shopArrivalTimer';
  tutorial[timer] = (tutorial[timer] ?? 0) + dt;
  if (route && hotel.health > 0 && state.open && tutorial[timer] >= 4 &&
    state.guests.filter(g => g.target === hotel.uid && !g.leaving).length < item.capacity) {
    tutorial[timer] = 0;
    const entrance = route[route.length - 1]; state.totalVisitors++;
    state.guests.push({ id: state.nextId++, x: entrance.x + .5, z: entrance.z + .5,
      path: [...route].reverse(), target: hotel.uid, activity: 'walking', timer: 0,
      cash: 500, happiness: 65, served: 0, leaving: false });
  }
  for (const g of state.guests) {
    if (g.target !== hotel.uid) continue;
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
      // Original goods default price and service duration; simplified arrivals.
      const price = isHotel ? item.roomPrice ?? 25 : item.salePrice ?? 0;
      g.cash -= price; hotel.income += price; hotel.visits++; state.income += price;
      state.cash += price; g.activity = 'staying'; g.timer = item.duration; g.served++;
      if (!isHotel) onSale?.(price);
    } else {
      g.timer -= dt;
      if (g.timer <= 0 && route) { g.leaving = true; g.activity = 'leaving'; g.path = [...route]; }
    }
  }
  state.guests = state.guests.filter(g => g.activity !== 'gone');
}
