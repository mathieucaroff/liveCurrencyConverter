import { resolveTokenOwnership, tokenKey } from './currencies'

/** Letters of space-separated scripts: a token must not be glued to one. */
const WORD_LETTER = '\\p{Script=Latin}\\p{Script=Cyrillic}\\p{Script=Greek}'
const WORD_LETTER_RE = new RegExp(`[${WORD_LETTER}]`, 'u')

const SPACE = '[\\s\\u202F\\u00A0]'
const NON_SPACE = '[^\\s\\u202F\\u00A0]'
/**
 * An amount: digits, optional groups of exactly 3 digits after a grouping
 * separator (space, narrow/no-break space, apostrophe, dot or comma), and an
 * optional decimal part after a dot or comma. Matches "1000", "1,000.50",
 * "1.234,56", "1 234,56", "1'000", "177,96". It always ends with a digit, so
 * a sentence's final "." or "," is left out. Which separator is the decimal
 * one is decided by `parseAmount`.
 */
const VALUE = "(\\d+(?:[\\s\\u202F\\u00A0'’.,]\\d{3}(?!\\d))*(?:[.,]\\d+)?)"

export type Matcher = {
  /** Matches any detection token. */
  any: RegExp
  /** Token followed by something (a value or not). */
  prefixText: RegExp
  /** Token followed by a value: group 1 = token, group 2 = value. */
  prefixValue: RegExp
  /** Something followed by a token. */
  suffixText: RegExp
  /** Value followed by a token: group 1 = value, group 2 = token. */
  suffixValue: RegExp
  /** The currency code a matched token belongs to. */
  currencyOf(token: string): string | undefined
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** The exact spellings to look for in pages, for every owned token. */
export function tokenSpellings(enabled: string[]): {
  spellings: string[]
  owner: Map<string, string>
} {
  const { owner, kind, claims } = resolveTokenOwnership(enabled)
  const spellings = new Set<string>()
  for (const [code, list] of claims) {
    for (const claim of list) {
      // a token lost to a higher currency is searched for by its owner only
      if (claim.owner !== code) continue
      if (kind.get(tokenKey(claim.token)) === 'alias') {
        const lower = claim.token.toLowerCase()
        spellings.add(lower)
        spellings.add(capitalize(lower))
        spellings.add(lower.toUpperCase())
      } else {
        spellings.add(claim.token)
      }
    }
  }
  // longest first, so "US$" wins over "$"
  const sorted = [...spellings].sort((a, b) => b.length - a.length)
  return { spellings: sorted, owner }
}

function tokenSource(spelling: string): string {
  let source = escapeRegExp(spelling)
  // never match inside a word ("A$" is not "$", "Kraków" is not "kr")
  source = `(?<![${WORD_LETTER}])${source}`
  if (WORD_LETTER_RE.test(spelling.at(-1) ?? '')) {
    source = `${source}(?![${WORD_LETTER}])`
  }
  return source
}

/** Build the page matcher for an ordered list of enabled currencies. */
export function createMatcher(enabled: string[]): Matcher | null {
  const { spellings, owner } = tokenSpellings(enabled)
  if (spellings.length === 0) return null
  const token = `(?:${spellings.map(tokenSource).join('|')})`
  return {
    any: new RegExp(token, 'u'),
    prefixText: new RegExp(`(${token})${SPACE}*${NON_SPACE}`, 'u'),
    prefixValue: new RegExp(`(${token})${SPACE}*${VALUE}`, 'u'),
    suffixText: new RegExp(`${NON_SPACE}${SPACE}*(${token})`, 'u'),
    suffixValue: new RegExp(`${VALUE}${SPACE}*(${token})`, 'u'),
    currencyOf: (matched) => owner.get(tokenKey(matched)),
  }
}

/**
 * Read an amount written with either decimal convention: "177,96" → 177.96,
 * "1.234,56" → 1234.56, "1,234.56" → 1234.56, "1 234" → 1234.
 *
 * - Spaces and apostrophes are always grouping separators.
 * - With both "." and ",", the last one is the decimal separator.
 * - A separator that appears several times groups thousands ("1.000.000").
 * - A single separator followed by exactly 3 digits is ambiguous ("1,000",
 *   "1.500"). It groups thousands, unless the currency has 3 decimals (KWD,
 *   BHD…), where "1.500" means 1.5. `fractionDigits` is the currency's usual
 *   number of decimals.
 * - Otherwise, a single separator is the decimal one ("177,96", "12.5").
 */
export function parseAmount(text: string, fractionDigits = 2): number {
  const digits = text.replace(/[\s'’]/g, '')
  const lastDot = digits.lastIndexOf('.')
  const lastComma = digits.lastIndexOf(',')

  let decimal: '.' | ',' | null
  if (lastDot >= 0 && lastComma >= 0) {
    decimal = lastDot > lastComma ? '.' : ','
  } else if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? '.' : ','
    const last = Math.max(lastDot, lastComma)
    const count = digits.split(separator).length - 1
    const decimalsAfter = digits.length - last - 1
    if (count > 1) decimal = null
    else if (decimalsAfter === 3)
      decimal = fractionDigits === 3 ? separator : null
    else decimal = separator
  } else {
    decimal = null
  }

  if (!decimal) return Number(digits.replace(/[.,]/g, ''))
  const grouping = decimal === ',' ? '.' : ','
  return Number(digits.split(grouping).join('').replace(decimal, '.'))
}
