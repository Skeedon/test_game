import type { Car } from '../game/game';

// Match stable model names, not randomly generated listing IDs. Existing saves
// receive the same artwork without changing the persisted game schema.
const carAssets = {
 'Volkswagen Golf IV': 'volkswagen-golf-iv.svg',
 'BMW 320i E46': 'bmw-320i-e46.svg',
 'Mazda MX-5': 'mazda-mx-5.svg',
 'Honda Civic': 'honda-civic.svg',
} as const;

export function getCarAsset(car: Pick<Car, 'brand' | 'model'>) {
 const filename = carAssets[`${car.brand} ${car.model}` as keyof typeof carAssets];
 return filename ? { src: `${import.meta.env.BASE_URL}assets/cars/${filename}` } : undefined;
}
