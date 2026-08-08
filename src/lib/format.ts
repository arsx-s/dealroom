import type { Money } from '../contract'

export function fmtMoney(m: Money): string {
  const sign = m.amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(m.amount).toLocaleString('en-US')}`
}

export function fmtRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

export function fmtMultiple(x: number): string {
  return `${x.toFixed(2)}x`
}

export function fmtPct(x: number): string {
  return `${x.toFixed(0)}%`
}

export function fmtCount(n: number): string {
  return n.toLocaleString('en-US')
}
