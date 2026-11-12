import { describe, expect, it } from 'vitest';
import { newGame, transact, repairPrice, salePrice, loadGame, saveGame, isGame } from './game';
describe('garage operations', () => {
 it('starts with $5,000 and an empty garage', () => { const state = newGame(); expect(state.balance).toBe(5000); expect(state.car).toBeNull(); expect(state.market).toHaveLength(4); });
 it('purchases a car and prevents a second purchase', () => { const state = newGame(); const next = transact(state, {type:'buy', id:state.market[0].id}); expect(next.balance).toBe(5000-state.market[0].price); expect(next.car?.id).toBe(state.market[0].id); expect(transact(next,{type:'buy',id:next.market[0].id})).toBe(next); });
 it('rejects unaffordable or missing cars', () => { const state = {...newGame(),balance:0}; expect(transact(state,{type:'buy',id:state.market[0].id})).toBe(state); expect(transact(state,{type:'buy',id:'missing'})).toBe(state); });
 it('repairs to 100% and charges exactly once', () => { const initial = newGame(); const state = {...initial,car:initial.market[0],balance:5000}; const cost = repairPrice(state.car,'engine'); const next = transact(state,{type:'repair',part:'engine'}); expect(next.car?.condition.engine).toBe(100); expect(next.balance).toBe(5000-cost); expect(transact(next,{type:'repair',part:'engine'})).toBe(next); });
 it('rejects repair when balance is insufficient', () => { const initial = newGame(); const state = {...initial,car:initial.market[0],balance:0}; expect(transact(state,{type:'repair',part:'engine'})).toBe(state); });
 it('sells only an owned car and records net profit', () => { const initial = newGame(); const state = transact(initial,{type:'buy',id:initial.market[0].id}); const price = salePrice(state.car!); const next = transact(state,{type:'sell'}); expect(next.car).toBeNull(); expect(next.balance).toBe(state.balance+price); expect(next.profit).toBe(price-state.invested); expect(next.sold).toBe(1); expect(transact(next,{type:'sell'})).toBe(next); });
 it('rejects repairs and sales in an empty garage', () => { const state = newGame(); expect(transact(state,{type:'sell'})).toBe(state); expect(transact(state,{type:'repair',part:'body'})).toBe(state); });
});

describe('economy and persistence', () => {
 const storage = (value: string | null = null) => ({
  getItem: () => value,
  setItem: (_key: string, next: string) => { value = next; },
 });
 it('calculates wear-based costs and increasing resale value', () => {
  const car = {...newGame().market[0], value: 5000, condition: {engine: 0, body: 50, suspension: 100}};
  expect(repairPrice(car, 'engine')).toBe(1500);
  expect(repairPrice(car, 'body')).toBe(500);
  expect(repairPrice(car, 'suspension')).toBe(0);
  expect(salePrice({...car, condition: {engine: 100, body: 100, suspension: 100}})).toBe(5000);
  expect(salePrice({...car, condition: {engine: 100, body: 50, suspension: 100}})).toBeGreaterThan(salePrice(car));
 });
 it('accounts for all repairs and supports the next purchase', () => {
  const initial = newGame();
  let game = transact(initial, {type: 'buy', id: initial.market[0].id});
  const original = JSON.stringify(game);
  const cost = repairPrice(game.car!, 'body');
  const repaired = transact(game, {type: 'repair', part: 'body'});
  expect(JSON.stringify(game)).toBe(original);
  expect(repaired.invested).toBe(game.invested + cost);
  const sale = salePrice(repaired.car!);
  game = transact(repaired, {type: 'sell'});
  expect(game.balance).toBe(5000 + sale - repaired.invested);
  expect(game.profit).toBe(sale - repaired.invested);
  expect(game.invested).toBe(0);
  expect(game.deals.map(deal => deal.kind)).toEqual(['sell', 'repair', 'buy']);
  expect(transact(game, {type: 'buy', id: game.market[0].id}).car).not.toBeNull();
 });
 it('records losses as well as profit', () => {
  const initial = newGame();
  const car = {...initial.market[0], value: 1000, price: 2000, condition: {engine: 0, body: 0, suspension: 0}};
  const bought = transact({...initial, market: [car]}, {type: 'buy', id: car.id});
  const sold = transact(bought, {type: 'sell'});
  expect(sold.profit).toBe(-1650);
  expect(sold.balance).toBe(3350);
  expect(isGame(sold)).toBe(true);
 });
 it('allows a purchase and repair with the exact required balance', () => {
  const initial = newGame();
  const bought = transact({...initial, balance: initial.market[0].price}, {type: 'buy', id: initial.market[0].id});
  expect(bought.balance).toBe(0);
  const cost = repairPrice(bought.car!, 'engine');
  expect(transact({...bought, balance: cost}, {type: 'repair', part: 'engine'}).balance).toBe(0);
 });
 it('refreshes offers without changing the owned car or finances', () => {
  const initial = newGame();
  const bought = transact(initial, {type: 'buy', id: initial.market[0].id});
  const refreshed = transact(bought, {type: 'refresh'});
  expect(refreshed.car).toBe(bought.car);
  expect(refreshed.balance).toBe(bought.balance);
  expect(refreshed.invested).toBe(bought.invested);
  expect(refreshed.deals).toBe(bought.deals);
  expect(refreshed.market).toHaveLength(4);
  expect(isGame(refreshed)).toBe(true);
 });
 it('keeps only the twelve latest transactions', () => {
  let game = newGame();
  for (let i = 0; i < 8; i++) {
   game = transact(game, {type: 'refresh'});
   game = transact(game, {type: 'buy', id: game.market[0].id});
   game = transact(game, {type: 'sell'});
  }
  expect(game.sold).toBe(8);
  expect(game.deals).toHaveLength(12);
  expect(new Set(game.deals.map(deal => deal.id)).size).toBe(12);
 });
 it('round-trips a repaired car and completed transaction history', () => {
  const initial = newGame();
  const bought = transact(initial, {type: 'buy', id: initial.market[0].id});
  const repaired = transact(bought, {type: 'repair', part: 'engine'});
  const memory = storage();
  expect(saveGame(repaired, memory)).toBe(true);
  expect(loadGame(memory)).toEqual(repaired);
  const sold = transact(repaired, {type: 'sell'});
  expect(saveGame(sold, memory)).toBe(true);
  expect(loadGame(memory)).toEqual(sold);
 });
 it('recovers from malformed JSON and inaccessible storage', () => {
  expect(loadGame(storage('{broken')).balance).toBe(5000);
  const denied = { getItem: () => {throw new Error('denied');}, setItem: () => {throw new Error('full');} };
  expect(loadGame(denied).car).toBeNull();
  expect(saveGame(newGame(), denied)).toBe(false);
 });
 it('rejects incomplete, inconsistent, and corrupt saved records', () => {
  const initial = newGame();
  const badStates = [
   {...initial, balance: -1}, {...initial, balance: null},
   {...initial, sold: -1}, {...initial, invested: 1},
   {...initial, market: [null]},
   {...initial, market: [initial.market[0], initial.market[0]]},
   {...initial, market: [{...initial.market[0], model: null}]},
   {...initial, market: [{...initial.market[0], condition: {engine: 101, body: 50, suspension: 50}}]},
   {...initial, deals: [null]},
   {...initial, deals: [{id: 'a', name: 'Car', kind: 'sell', amount: -5, date: 'invalid'}]},
  ];
  for (const invalid of badStates) {
   expect(isGame(invalid)).toBe(false);
   const recovered = loadGame(storage(JSON.stringify(invalid)));
   expect(recovered.balance).toBe(5000);
   expect(recovered.car).toBeNull();
   expect(recovered.deals).toEqual([]);
  }
 });
 it.each([
  ['numeric', 100],
  ['nonnumeric', 'invalid']
 ])('rejects saved condition with extra %s field', (_label, extra) => {
  const initial = newGame();
  const corruptCar = {
   ...initial.market[0],
   condition: {engine: 50, body: 50, suspension: 50, extra}
  };
  for (const invalid of [
   {...initial, market: [corruptCar]},
   {...initial, car: corruptCar, market: initial.market.slice(1), invested: corruptCar.price}
  ]) {
   expect(isGame(invalid)).toBe(false);
   expect(saveGame(invalid as never, storage())).toBe(false);
   const restored = loadGame(storage(JSON.stringify(invalid)));
   expect(restored.balance).toBe(5000);
   expect(restored.car).toBeNull();
   expect(restored.deals).toEqual([]);
  }
 });
 it('ignores unexpected fields when computing resale price', () => {
  const car = {
   ...newGame().market[0],
   value: 5000,
   condition: {engine: 50, body: 50, suspension: 50, extra: 'corrupt'}
  };
  expect(salePrice(car as never)).toBe(3375);
  expect(Number.isFinite(salePrice(car as never))).toBe(true);
 });
 it('rejects unknown repair parts at runtime', () => {
  const initial = newGame();
  const bought = transact(initial, {type: 'buy', id: initial.market[0].id});
  expect(transact(bought, {type: 'repair', part: 'wheels' as never})).toBe(bought);
 });
});
