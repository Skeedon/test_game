import { useId, useState } from 'react';
import type { Car } from '../game/game';
import { getCarAsset } from './carAssets';
function FallbackCarArt({ color = '#a6bba1', shape = 'sedan', ghost = false }: { color?: string; shape?: string; ghost?: boolean }) {
 const id = useId().replace(/:/g, '');
 const roof = shape === 'hatch' ? 'M126 113 L155 65 Q162 56 181 56 L266 57 Q281 59 295 79 L320 114' : shape === 'coupe' ? 'M122 113 L178 69 Q190 61 217 63 L257 65 Q276 70 303 113' : 'M120 113 L163 65 Q170 58 187 58 L262 59 Q279 62 311 113';
 return <svg className={`car-art ${ghost ? 'ghost' : ''}`} viewBox="0 0 460 210" fill="none" role="img" aria-label={ghost ? 'Свободное место для автомобиля' : 'Автомобиль, вид сбоку'}><defs><linearGradient id={id+'paint'} x1="220" y1="80" x2="220" y2="164" gradientUnits="userSpaceOnUse"><stop stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".62"/></linearGradient><linearGradient id={id+'glass'} x1="180" y1="65" x2="240" y2="110"><stop stopColor="#49545b"/><stop offset="1" stopColor="#202b30"/></linearGradient><radialGradient id={id+'shadow'}><stop stopColor="black" stopOpacity=".6"/><stop offset="1" stopColor="black" stopOpacity="0"/></radialGradient></defs><ellipse cx="230" cy="174" rx="219" ry="23" fill={`url(#${id}shadow)`}/><path d={roof+' Z'} fill={`url(#${id}paint)`} stroke={color} strokeWidth="2"/><path d="M145 110 L173 70 Q177 67 188 67 L214 67 L214 110 Z M222 67 L259 68 Q270 71 297 110 L222 110 Z" fill={`url(#${id}glass)`}/><path d="M37 121 Q57 114 120 109 L318 110 L388 121 Q413 124 420 141 L419 160 Q415 166 398 166 L56 166 Q33 163 32 152 L32 135 Q32 126 37 121Z" fill={`url(#${id}paint)`} stroke={color} strokeWidth="1.4"/><path d="M42 138 L407 138 M151 115 L148 157 M283 115 L289 157" stroke="#17201e" strokeOpacity=".4"/><path d="M167 120 H184 M252 120 H269" stroke="#202a28" strokeWidth="3" strokeLinecap="round"/><path d="M36 127 L62 126 L60 137 L34 138" fill="#d1e3c3"/><path d="M397 127 L413 131 L418 139 L398 137Z" fill="#de775e"/><path d="M39 154 H420" stroke="#202527" strokeWidth="6"/><path d="M70 164 A33 33 0 0 1 66 149 A33 33 0 0 1 132 149 L132 165 M325 165 A33 33 0 0 1 323 149 A33 33 0 0 1 389 149 L389 165" fill="#141619"/>{[99,356].map(x=><g key={x}><circle cx={x} cy="153" r="28" fill="#111315" stroke="#2b2e31" strokeWidth="4"/><circle cx={x} cy="153" r="19" fill="#646c70" stroke="#879092" strokeWidth="2"/><circle cx={x} cy="153" r="12" fill="#30373b"/>{[0,60,120].map(a=><path key={a} d={`M${x-16} 153 H${x+16}`} stroke="#899194" strokeWidth="4" transform={`rotate(${a} ${x} 153)`}/>)}<circle cx={x} cy="153" r="5" fill="#b5babb"/></g>)}<path d="M133 108 L143 100 L151 101 L149 112" fill={color}/><path d="M48 120 L119 116 M322 116 L383 126" stroke="white" strokeOpacity=".3" strokeWidth="2"/></svg>;
}


/** One renderer for market cards, the garage and future car views. */
export default function CarArt({ car, ghost = false }: { car?: Car | null; ghost?: boolean }) {
 const [failedSrc, setFailedSrc] = useState<string>();
 const asset = car ? getCarAsset(car) : undefined;
 if (!car || !asset || ghost || failedSrc === asset.src) return <FallbackCarArt color={car?.color} shape={car?.shape} ghost={ghost}/>;
 return <img
  className="car-art car-art--asset"
  src={asset.src}
  alt={`${car.brand} ${car.model} — вид сбоку`}
  width={800}
  height={320}
  decoding="async"
  draggable={false}
  onError={() => setFailedSrc(asset.src)}
 />;
}
