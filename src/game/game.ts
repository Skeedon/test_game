export type Part = 'engine' | 'body' | 'suspension';
export type Car = { id: string; brand: string; model: string; year: number; km: number; color: string; shape: 'sedan' | 'hatch' | 'coupe'; value: number; price: number; condition: Record<Part, number> };
export type Deal = { id: string; name: string; kind: 'buy' | 'sell' | 'repair'; amount: number; date: string };
export type Game = { balance: number; car: Car | null; market: Car[]; deals: Deal[]; sold: number; profit: number; invested: number };
export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
export const average = (car: Car) => Math.round((car.condition.engine + car.condition.body + car.condition.suspension) / 3);
export const salePrice = (car: Car) => Math.round(car.value * (.35 + average(car) / 100 * .65));
export const repairPrice = (car: Car, part: Part) => Math.ceil((100 - car.condition[part]) * car.value * (part === 'engine' ? .003 : .002));
const uniqueId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function market(): Car[] {
 const templates = [ ['Volkswagen', 'Golf IV', 1999, '#a6bba1', 'hatch', 4700], ['BMW', '320i E46', 2002, '#969dbb', 'sedan', 6400], ['Mazda', 'MX-5', 2001, '#c7836d', 'coupe', 5800], ['Honda', 'Civic', 1998, '#b7c0ce', 'sedan', 4900] ] as const;
 return templates.map(([brand, model, year, color, shape, value]) => { const condition = { engine: 25 + Math.floor(Math.random()*46), body: 30 + Math.floor(Math.random()*51), suspension: 20 + Math.floor(Math.random()*56) }; const car = { id: uniqueId(), brand, model, year, color, shape, value, price: 0, km: 110 + Math.floor(Math.random()*140), condition }; car.price = Math.round(salePrice(car) * (.62 + Math.random() * .12) / 50) * 50; return car; });
}
export const newGame = (): Game => ({ balance: 5000, car: null, market: market(), deals: [], sold: 0, profit: 0, invested: 0 });
export type Action = { type: 'buy'; id: string } | { type: 'repair'; part: Part } | { type: 'sell' } | { type: 'refresh' };
export function transact(state: Game, action: Action): Game {
 const record = (name: string, kind: Deal['kind'], amount: number): Deal[] => [{ id: uniqueId(), name, kind, amount, date: new Date().toISOString() }, ...state.deals].slice(0, 12);
 if (action.type === 'refresh') return { ...state, market: market() };
 if (action.type === 'buy') { const car = state.market.find(c => c.id === action.id); if (!car || state.car || car.price > state.balance) return state; return { ...state, car, balance: state.balance - car.price, invested: car.price, market: state.market.filter(c => c.id !== car.id), deals: record(`${car.brand} ${car.model}`, 'buy', -car.price) }; }
 if (!state.car) return state;
 if (action.type === 'sell') { const price = salePrice(state.car); return { ...state, balance: state.balance + price, car: null, sold: state.sold + 1, profit: state.profit + price - state.invested, invested: 0, deals: record(`${state.car.brand} ${state.car.model}`, 'sell', price) }; }
 if (action.type !== 'repair' || !PARTS.includes(action.part)) return state;
 const cost = repairPrice(state.car, action.part); if (cost <= 0 || cost > state.balance) return state;
 return { ...state, balance: state.balance - cost, invested: state.invested + cost, car: { ...state.car, condition: { ...state.car.condition, [action.part]: 100 } }, deals: record(`Ремонт · ${state.car.brand} ${state.car.model}`, 'repair', -cost) };
}
export const STORAGE_KEY = 'mini-garage-v1';
const PARTS: Part[] = ['engine', 'body', 'suspension'];
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function validCar(value: unknown): value is Car {
 if (!object(value) || !object(value.condition)) return false;
 const condition = value.condition;
 return text(value.id) && text(value.brand) && text(value.model) &&
  integer(value.year, 1886) && integer(value.km) &&
  typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) &&
  typeof value.shape === 'string' && ['sedan', 'hatch', 'coupe'].includes(value.shape) &&
  integer(value.price, 1) && integer(value.value, 1) &&
  Object.keys(condition).length === PARTS.length &&
  PARTS.every(part => integer(condition[part]) && (condition[part] as number) <= 100);
}
export function isGame(value: unknown): value is Game {
 if (!object(value) || !integer(value.balance) || !integer(value.sold) ||
  !integer(value.profit, -Number.MAX_SAFE_INTEGER) || !integer(value.invested) ||
  !(value.car === null || validCar(value.car)) ||
  !Array.isArray(value.market) || value.market.length > 4 || !value.market.every(validCar) ||
  !Array.isArray(value.deals) || value.deals.length > 12) return false;
 const cars = [...value.market, ...(value.car ? [value.car] : [])] as Car[];
 if (new Set(cars.map(car => car.id)).size !== cars.length) return false;
 if (value.car === null ? value.invested !== 0 : value.invested < (value.car as Car).price) return false;
 return value.deals.every(deal => object(deal) && text(deal.id) && text(deal.name) &&
  typeof deal.kind === 'string' && ['buy', 'sell', 'repair'].includes(deal.kind) &&
  integer(deal.amount, -Number.MAX_SAFE_INTEGER) &&
  (deal.kind === 'sell' ? deal.amount > 0 : deal.amount < 0) &&
  typeof deal.date === 'string' && Number.isFinite(Date.parse(deal.date))) &&
  new Set(value.deals.map(deal => deal.id)).size === value.deals.length;
}
export function loadGame(storage?: StorageAccess): Game {
 try {
  const data: unknown = JSON.parse((storage ?? localStorage).getItem(STORAGE_KEY) || 'null');
  if (isGame(data)) return data;
 } catch { /* Invalid or unavailable storage starts a fresh game. */ }
 return newGame();
}
export function saveGame(game: Game, storage?: StorageAccess): boolean {
 try {
  if (!isGame(game)) return false;
  (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(game));
  return true;
 } catch { return false; }
}
