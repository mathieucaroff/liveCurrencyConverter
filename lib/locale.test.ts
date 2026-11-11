import { describe, expect, test } from 'bun:test'

import { isKnownCurrency } from './currencies'
import { REGION_CURRENCY, guessHomeCurrency } from './locale'

describe('guessHomeCurrency', () => {
  test('every mapped currency is supported', () => {
    for (const code of REGION_CURRENCY.values()) {
      expect(isKnownCurrency(code)).toBe(true)
    }
  })

  test('uses the region of the language tag', () => {
    expect(guessHomeCurrency(['fr-FR'])).toBe('EUR')
    expect(guessHomeCurrency(['fr-CH'])).toBe('CHF')
    expect(guessHomeCurrency(['en-GB'])).toBe('GBP')
    expect(guessHomeCurrency(['pt-BR'])).toBe('BRL')
  })

  test('guesses the region of a bare language', () => {
    expect(guessHomeCurrency(['ja'])).toBe('JPY')
    expect(guessHomeCurrency(['th'])).toBe('THB')
    expect(guessHomeCurrency(['en'])).toBe('USD')
  })

  test('tries the next language, then falls back to USD', () => {
    expect(guessHomeCurrency(['not a tag', 'de-DE'])).toBe('EUR')
    expect(guessHomeCurrency([])).toBe('USD')
  })
})
