// src/lib/constants.ts
 
export const MUNICIPIOS = ["Aconchi","Agua Prieta","Alamos","Altar","Arivechi","Arizpe","Atil","Bacadehuachi","Bacanora","Bacerac","Bacoachi","Bacum","Banamichi","Baviacora","Bavispe","Benjamin Hill","Caborca","Cajeme","Cananea","Carbo","La Colorada","Cucurpe","Cumpas","Divisaderos","Empalme","Etchojoa","Fronteras","Granados","Guaymas","Hermosillo","Huachinera","Huasabas","Huatabampo","Huepac","Imuris","Magdalena","Mazatan","Moctezuma","Naco","Nacori Chico","Nacozari de Garcia","Navojoa","Nogales","Onavas","Opodepe","Oquitoa","Pitiquito","Puerto Penasco","Quiriego","Rayon","Rosario","Sahuaripa","San Felipe de Jesus","San Javier","San Luis Rio Colorado","San Miguel de Horcasitas","San Pedro de la Cueva","Santa Ana","Santa Cruz","Saric","Soyopa","Suaqui Grande","Tepache","Trincheras","Tubutama","Ures","Villa Hidalgo","Villa Pesqueira","Yecora"]
 
export const BANCOS = ["BBVA","Citibanamex","Santander","Banorte","HSBC","Inbursa","Scotiabank","Afirme","Bajio","Banbajio","Coppel","Azteca","Hey Banco","SPIN by OXXO","Otro"]
 
export const RC_LABELS = ['A','B','C','D'] as const
export type RCSlot = typeof RC_LABELS[number]
 
export const STATUS_OPTS = ['Pendiente','Validado','Credencializado','Localizado']
 
export function getCatorcena(ts?: number): number {
  const d = ts ? new Date(ts) : new Date()
  return Math.ceil(d.getDate() / 14) + d.getMonth() * 2
}
 
export function getWeekNum(ts: number): number {
  const d = new Date(ts)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
}
 
export function initials(nombre: string): string {
  return nombre?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}
 
export function calcPago(rol: string, hasRG: boolean, rcCount: number): number {
  if (rol === 'Ecoperador') return (hasRG ? 100 : 0) + rcCount * 50
  if (rol === 'RG') return 300
  if (rol === 'RC') return 200
  if (rol === 'Observador') return 200
  return 0
}
 
export function badgeClass(rol: string): string {
  if (rol === 'Ecoperador') return 'badge-eco'
  if (rol === 'RG') return 'badge-rg'
  if (rol === 'RC') return 'badge-rc'
  return 'badge-obs'
}
 
export function statusBadgeClass(s: string): string {
  if (s === 'Pendiente') return 'badge-pend'
  if (s === 'Validado') return 'badge-val'
  if (s === 'Credencializado') return 'badge-cred'
  return 'badge-loc'
}
 
export interface RCData {
  nombre: string
  tel: string
  banco: string
  cuenta: string
  obs: ObsData[]
}
 
export interface ObsData {
  nombre: string
  tel: string
  banco: string
  cuenta: string
}
 
export interface PayRecord {
  id: string
  personId: string
  type: string
  amount: number
  catorcena: number
  year: number
  date: number
}