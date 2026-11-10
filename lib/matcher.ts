import { resolveTokenOwnership, tokenKey } from './currencies'

/** Letters of space-separated scripts: a token must not be glued to one. */
const WORD_LETTER = '\\p{Script=Latin}\\p{Script=Cyrillic}\\p{Script=Greek}'
const WORD_LETTER_RE = new RegExp(`[${WORD_LETTER}]`, 'u')

const SPACE = '[\\s\\u202F\\u00A0]'
const NON_SPACE = '[^\\s\\u202F\\u00A0]'
const VALUE = '(\\d[\\d\\s,]*(?:\\.\\d+)?)'

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

/** "1 234,5" or "12,000.50" → number (commas and spaces are thousands separators). */
export function parseAmount(text: string): number {
  return Number(text.replace(/[\s,]/g, ''))
}
