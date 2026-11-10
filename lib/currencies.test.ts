import { describe, expect, test } from 'bun:test'

import { CURRENCIES, currencyName, resolveTokenOwnership } from './currencies'
import { createMatcher, parseAmount } from './matcher'

const EXCHANGERATE_API_CODES =
  'USD AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLF CLP CNH CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP FOK GBP GEL GGP GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS IMP INR IQD IRR ISK JEP JMD JOD JPY KES KGS KHR KID KMF KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SYP SZL THB TJS TMT TND TOP TRY TTD TVD TWD TZS UAH UGX UYU UZS VES VND VUV WST XAF XCD XCG XDR XOF XPF YER ZAR ZMW ZWG ZWL'.split(
    ' ',
  )

describe('catalog', () => {
  test('lists exactly the 166 exchangerate-api currencies', () => {
    expect(CURRENCIES.map((c) => c.code)).toEqual(EXCHANGERATE_API_CODES)
    expect(CURRENCIES).toHaveLength(166)
  })

  test('every currency has a name', () => {
    for (const { code } of CURRENCIES) {
      expect(currencyName(code)).not.toBe(code)
    }
  })
})

describe('resolveTokenOwnership', () => {
  test('the first currency in the list wins a shared symbol', () => {
    expect(resolveTokenOwnership(['GBP', 'EGP']).owner.get('£')).toBe('GBP')
    expect(resolveTokenOwnership(['EGP', 'GBP']).owner.get('£')).toBe('EGP')
  })

  test('the first currency in the list wins a shared alias', () => {
    const { owner, claims } = resolveTokenOwnership(['USD', 'CAD'])
    expect(owner.get('dollar')).toBe('USD')
    const cadDollar = claims.get('CAD')?.find((c) => c.token === 'dollar')
    expect(cadDollar?.owner).toBe('USD')
  })

  test('ISO codes always stay with their currency', () => {
    const { owner } = resolveTokenOwnership(['USD', 'CAD'])
    expect(owner.get('cad')).toBe('CAD')
  })
})

describe('createMatcher', () => {
  test('returns null when nothing is enabled', () => {
    expect(createMatcher([])).toBeNull()
  })

  test('detects prefix and suffix prices', () => {
    const m = createMatcher(['USD', 'CAD'])!
    const prefix = '$10'.match(m.prefixValue)!
    expect(m.currencyOf(prefix[1]!)).toBe('USD')
    expect(prefix[2]).toBe('10')

    const suffix = '1,200.50 CAD'.match(m.suffixValue)!
    expect(m.currencyOf(suffix[2]!)).toBe('CAD')
    expect(parseAmount(suffix[1]!)).toBe(1200.5)
  })

  test('swapping the order moves a shared symbol', () => {
    const m = createMatcher(['CAD', 'USD'])!
    expect(m.currencyOf('$10'.match(m.prefixValue)![1]!)).toBe('CAD')
  })

  test('prefers the longest token', () => {
    const m = createMatcher(['USD', 'HKD'])!
    expect('HK$ 50'.match(m.prefixValue)![1]).toBe('HK$')
  })

  test('does not match a symbol glued to letters', () => {
    const m = createMatcher(['USD'])!
    expect('A$10'.match(m.prefixValue)).toBeNull()
  })

  test('aliases match in any common casing, ISO codes in upper case only', () => {
    const m = createMatcher(['JPY', 'TRY'])!
    expect(m.any.test('500 yen')).toBe(true)
    expect(m.any.test('500 YEN')).toBe(true)
    expect(m.any.test('500 Yen')).toBe(true)
    expect(m.any.test('try 5 times')).toBe(false)
    expect(m.any.test('TRY 5')).toBe(true)
  })

  test('word tokens do not match inside words', () => {
    const m = createMatcher(['THB', 'ALL'])!
    expect(m.any.test('bahtful')).toBe(false)
    expect(m.any.test('SMALL')).toBe(false)
  })
})
