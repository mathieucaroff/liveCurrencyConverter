/**
 * Catalog of the 166 currencies supported by exchangerate-api.com.
 *
 * - `symbols` are matched case-sensitively, exactly as written.
 * - `aliases` are words matched in lower case, Capitalized and UPPER case.
 * - The ISO code is always matched (upper case only) and is never listed here.
 *
 * Single-letter Latin symbols that are also common abbreviations (K, L, D, P,
 * E, G, T, F, m) are left out on purpose: they would turn "5K", "2L" or "3D"
 * into prices. Those currencies are still detected by ISO code and names.
 */

export type CurrencyInfo = {
  code: string
  symbols: string[]
  aliases: string[]
  /** Fallback name, for codes that Intl.DisplayNames does not know. */
  name?: string
}

type Row = [code: string, symbols: string[], aliases: string[], name?: string]

const DOLLAR = ['dollar', 'dollars']
const PESO = ['peso', 'pesos']
const POUND = ['pound', 'pounds']
const FRANC = ['franc', 'francs']
const DINAR = ['dinar', 'dinars']
const RUPEE = ['rupee', 'rupees']
const RIAL = ['rial', 'rials']
const RIYAL = ['riyal', 'riyals']
const SHILLING = ['shilling', 'shillings']

// prettier-ignore
const ROWS: Row[] = [
  ['USD', ['$', 'US$'], DOLLAR],
  ['AED', ['د.إ', 'Dhs'], ['dirham', 'dirhams']],
  ['AFN', ['؋', 'Afs'], ['afghani', 'afghanis']],
  ['ALL', ['Lek'], ['lek', 'leke']],
  ['AMD', ['֏'], ['dram', 'drams']],
  ['ANG', ['NAƒ', 'ƒ'], ['guilder', 'guilders', 'gulden']],
  ['AOA', ['Kz'], ['kwanza', 'kwanzas']],
  ['ARS', ['$', 'AR$'], PESO],
  ['AUD', ['$', 'A$', 'AU$'], DOLLAR],
  ['AWG', ['Afl.', 'ƒ'], ['florin', 'florins']],
  ['AZN', ['₼'], ['manat', 'manats']],
  ['BAM', ['KM'], ['convertible mark', 'convertible marks', 'konvertibilna marka']],
  ['BBD', ['$', 'Bds$'], DOLLAR],
  ['BDT', ['৳', 'Tk'], ['taka', 'takas']],
  ['BGN', ['лв'], ['lev', 'leva']],
  ['BHD', ['.د.ب', 'BD'], DINAR],
  ['BIF', ['FBu'], FRANC],
  ['BMD', ['$', 'BD$'], DOLLAR],
  ['BND', ['$', 'B$'], DOLLAR],
  ['BOB', ['Bs', 'Bs.'], ['boliviano', 'bolivianos']],
  ['BRL', ['R$'], ['reais']],
  ['BSD', ['$', 'B$'], DOLLAR],
  ['BTN', ['Nu.'], ['ngultrum', 'ngultrums']],
  ['BWP', [], ['pula']],
  ['BYN', ['Br'], ['ruble', 'rubles', 'rouble', 'roubles']],
  ['BZD', ['$', 'BZ$'], DOLLAR],
  ['CAD', ['$', 'C$', 'CA$'], DOLLAR],
  ['CDF', ['FC'], FRANC],
  ['CHF', ['Fr.', 'SFr.'], [...FRANC, 'franken']],
  ['CLF', ['UF'], ['unidad de fomento']],
  ['CLP', ['$', 'CLP$'], PESO],
  ['CNH', ['¥', 'CN¥'], ['yuan', 'renminbi']],
  ['CNY', ['¥', 'CN¥', '元', 'RMB'], ['yuan', 'renminbi']],
  ['COP', ['$', 'COL$'], PESO],
  ['CRC', ['₡'], ['colón', 'colones']],
  ['CUP', ['$', '$MN'], PESO],
  ['CVE', ['Esc'], ['escudo', 'escudos']],
  ['CZK', ['Kč'], ['koruna', 'koruny', 'korun', 'crown', 'crowns']],
  ['DJF', ['Fdj'], FRANC],
  ['DKK', ['kr.', 'kr'], ['krone', 'kroner', 'crown', 'crowns']],
  ['DOP', ['$', 'RD$'], PESO],
  ['DZD', ['د.ج', 'DA'], DINAR],
  ['EGP', ['£', 'E£', 'ج.م'], POUND],
  ['ERN', ['Nfk'], ['nakfa']],
  ['ETB', ['Br'], ['birr']],
  ['EUR', ['€'], ['euro', 'euros']],
  ['FJD', ['$', 'FJ$'], DOLLAR],
  ['FKP', ['£'], POUND],
  ['FOK', ['kr'], ['króna', 'krónur'], 'Faroese króna'],
  ['GBP', ['£'], [...POUND, 'sterling', 'quid']],
  ['GEL', ['₾'], ['lari']],
  ['GGP', ['£'], POUND, 'Guernsey pound'],
  ['GHS', ['GH₵', '₵'], ['cedi', 'cedis']],
  ['GIP', ['£'], POUND],
  ['GMD', [], ['dalasi']],
  ['GNF', ['FG', 'GFr'], FRANC],
  ['GTQ', ['Q'], ['quetzal', 'quetzales']],
  ['GYD', ['$', 'G$', 'GY$'], DOLLAR],
  ['HKD', ['$', 'HK$'], DOLLAR],
  ['HNL', [], ['lempira', 'lempiras']],
  ['HRK', ['kn'], ['kuna', 'kune']],
  ['HTG', [], ['gourde', 'gourdes']],
  ['HUF', ['Ft'], ['forint', 'forints']],
  ['IDR', ['Rp'], ['rupiah']],
  ['ILS', ['₪', 'NIS'], ['shekel', 'shekels', 'shekalim']],
  ['IMP', ['£'], POUND, 'Manx pound'],
  ['INR', ['₹', 'Rs.', 'Rs'], RUPEE],
  ['IQD', ['ع.د'], DINAR],
  ['IRR', ['﷼', 'ریال'], RIAL],
  ['ISK', ['kr'], ['króna', 'krónur', 'krona', 'kronur']],
  ['JEP', ['£'], POUND, 'Jersey pound'],
  ['JMD', ['$', 'J$'], DOLLAR],
  ['JOD', ['JD', 'د.ا'], DINAR],
  ['JPY', ['¥', '円', '￥'], ['yen']],
  ['KES', ['KSh', 'Ksh'], SHILLING],
  ['KGS', ['сом'], ['som']],
  ['KHR', ['៛'], ['riel', 'riels']],
  ['KID', ['$'], DOLLAR, 'Kiribati dollar'],
  ['KMF', ['CF'], FRANC],
  ['KRW', ['₩', '원'], []],
  ['KWD', ['KD', 'د.ك'], DINAR],
  ['KYD', ['$', 'CI$'], DOLLAR],
  ['KZT', ['₸'], ['tenge']],
  ['LAK', ['₭'], ['kip']],
  ['LBP', ['ل.ل', 'LL'], [...POUND, 'lira']],
  ['LKR', ['Rs', 'රු'], RUPEE],
  ['LRD', ['$', 'L$'], DOLLAR],
  ['LSL', [], ['loti', 'maloti']],
  ['LYD', ['LD', 'ل.د'], DINAR],
  ['MAD', ['DH', 'د.م.'], ['dirham', 'dirhams']],
  ['MDL', [], ['leu', 'lei']],
  ['MGA', ['Ar'], ['ariary']],
  ['MKD', ['ден'], ['denar', 'denars']],
  ['MMK', ['Ks'], ['kyat', 'kyats']],
  ['MNT', ['₮'], ['tögrög', 'tugrik']],
  ['MOP', ['MOP$'], ['pataca', 'patacas']],
  ['MRU', ['UM'], ['ouguiya']],
  ['MUR', ['Rs'], RUPEE],
  ['MVR', ['Rf', 'ރ.'], ['rufiyaa']],
  ['MWK', ['MK'], ['kwacha']],
  ['MXN', ['$', 'MX$', 'Mex$'], PESO],
  ['MYR', ['RM'], ['ringgit']],
  ['MZN', ['MT', 'MTn'], ['metical', 'meticais']],
  ['NAD', ['$', 'N$'], DOLLAR],
  ['NGN', ['₦'], ['naira']],
  ['NIO', ['C$'], ['córdoba', 'córdobas', 'cordoba', 'cordobas']],
  ['NOK', ['kr'], ['krone', 'kroner']],
  ['NPR', ['रु', 'Rs'], RUPEE],
  ['NZD', ['$', 'NZ$'], DOLLAR],
  ['OMR', ['ر.ع.', 'RO'], RIAL],
  ['PAB', ['B/.'], ['balboa', 'balboas']],
  ['PEN', ['S/', 'S/.'], ['soles']],
  ['PGK', [], ['kina']],
  ['PHP', ['₱'], PESO],
  ['PKR', ['₨', 'Rs'], RUPEE],
  ['PLN', ['zł'], ['złoty', 'złotych', 'zloty', 'zlotys']],
  ['PYG', ['₲'], ['guaraní', 'guaranies', 'guarani']],
  ['QAR', ['QR', 'ر.ق'], RIYAL],
  ['RON', ['lei'], ['leu']],
  ['RSD', ['дин.', 'din.'], DINAR],
  ['RUB', ['₽', 'руб.', 'руб'], ['ruble', 'rubles', 'rouble', 'roubles']],
  ['RWF', ['FRw', 'RF'], FRANC],
  ['SAR', ['﷼', 'SR', 'ر.س'], RIYAL],
  ['SBD', ['$', 'SI$'], DOLLAR],
  ['SCR', ['SR', 'Rs'], RUPEE],
  ['SDG', ['ج.س.'], POUND],
  ['SEK', ['kr'], ['krona', 'kronor']],
  ['SGD', ['$', 'S$'], DOLLAR],
  ['SHP', ['£'], POUND],
  ['SLE', ['Le'], ['leone', 'leones']],
  ['SLL', ['Le'], ['leone', 'leones']],
  ['SOS', ['Sh.So.'], SHILLING],
  ['SRD', ['$', 'Sr$'], DOLLAR],
  ['SSP', ['£', 'SS£'], POUND],
  ['STN', ['Db'], ['dobra', 'dobras']],
  ['SYP', ['£S', 'LS', 'ل.س'], POUND],
  ['SZL', [], ['lilangeni', 'emalangeni']],
  ['THB', ['฿'], ['baht']],
  ['TJS', ['SM'], ['somoni']],
  ['TMT', [], ['manat']],
  ['TND', ['DT', 'د.ت'], DINAR],
  ['TOP', ['T$', 'PT'], ['paʻanga', "pa'anga", 'paanga']],
  ['TRY', ['₺', 'TL'], ['lira', 'liras']],
  ['TTD', ['$', 'TT$'], DOLLAR],
  ['TVD', ['$'], DOLLAR, 'Tuvaluan dollar'],
  ['TWD', ['$', 'NT$', '元'], DOLLAR],
  ['TZS', ['TSh'], SHILLING],
  ['UAH', ['₴', 'грн'], ['hryvnia', 'hryvnias', 'hryvnya']],
  ['UGX', ['USh'], SHILLING],
  ['UYU', ['$', '$U'], PESO],
  ['UZS', ['soʻm', 'сўм'], ['som']],
  ['VES', ['Bs.S', 'Bs.'], ['bolívar', 'bolívares', 'bolivar', 'bolivares']],
  ['VND', ['₫'], ['dong', 'đồng']],
  ['VUV', ['VT'], ['vatu']],
  ['WST', ['WS$'], ['tala']],
  ['XAF', ['FCFA'], FRANC],
  ['XCD', ['$', 'EC$'], DOLLAR],
  ['XCG', ['Cg'], ['guilder', 'guilders'], 'Caribbean guilder'],
  ['XDR', ['SDR'], ['special drawing rights']],
  ['XOF', ['CFA', 'F.CFA'], FRANC],
  ['XPF', ['₣', 'CFP'], FRANC],
  ['YER', ['﷼', 'ر.ي'], RIAL],
  ['ZAR', ['R'], ['rand']],
  ['ZMW', ['ZK'], ['kwacha']],
  ['ZWG', ['ZiG'], ['zimbabwe gold'], 'Zimbabwe Gold'],
  ['ZWL', ['$', 'Z$'], DOLLAR],
]

export const CURRENCIES: CurrencyInfo[] = ROWS.map(
  ([code, symbols, aliases, name]) => ({ code, symbols, aliases, name }),
)

export const CURRENCY_BY_CODE: ReadonlyMap<string, CurrencyInfo> = new Map(
  CURRENCIES.map((currency) => [currency.code, currency]),
)

/** Listed first in the home currency picker. */
export const PREFERRED_HOME_CURRENCIES = ['USD', 'EUR', 'CNY']

export function isKnownCurrency(code: string): boolean {
  return CURRENCY_BY_CODE.has(code)
}

let displayNames: Intl.DisplayNames | undefined
function getDisplayNames(): Intl.DisplayNames | undefined {
  if (displayNames) return displayNames
  try {
    displayNames = new Intl.DisplayNames(undefined, { type: 'currency' })
  } catch {
    // very old engine: fall back to catalog names
  }
  return displayNames
}

export function currencyName(code: string): string {
  const name = getDisplayNames()?.of(code)
  // Intl echoes the code back when it does not know the currency
  if (name && name !== code) return name
  return CURRENCY_BY_CODE.get(code)?.name ?? code
}

/** The symbol to show for a currency: its preferred symbol, or its code. */
export function currencySymbol(code: string): string {
  return CURRENCY_BY_CODE.get(code)?.symbols[0] ?? code
}

/** Whether a currency matches a free-text search on code, name, symbol or alias. */
export function currencyMatchesQuery(code: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const currency = CURRENCY_BY_CODE.get(code)
  if (!currency) return false
  return [code, currencyName(code), ...currency.symbols, ...currency.aliases]
    .map((text) => text.toLowerCase())
    .some((text) => text.includes(q))
}

export type TokenKind = 'code' | 'symbol' | 'alias'

export type TokenClaim = {
  /** The token as written in the catalog. */
  token: string
  kind: TokenKind
  /** The currency that actually detects this token. */
  owner: string
}

export type TokenOwnership = {
  /** Lower-cased token → owning currency code. */
  owner: Map<string, string>
  /** Token kind for each owned lower-cased token. */
  kind: Map<string, TokenKind>
  /** For each enabled currency, every token it asked for and who got it. */
  claims: Map<string, TokenClaim[]>
}

export function tokenKey(token: string): string {
  return token.toLowerCase()
}

/**
 * Assign each detection token to exactly one enabled currency.
 *
 * ISO codes always belong to their currency. A symbol or alias wanted by
 * several currencies goes to the one that comes first in `enabled`.
 */
export function resolveTokenOwnership(enabled: string[]): TokenOwnership {
  const owner = new Map<string, string>()
  const kind = new Map<string, TokenKind>()
  const claims = new Map<string, TokenClaim[]>()

  for (const code of enabled) {
    owner.set(tokenKey(code), code)
    kind.set(tokenKey(code), 'code')
  }

  for (const code of enabled) {
    const currency = CURRENCY_BY_CODE.get(code)
    if (!currency) continue
    const list: TokenClaim[] = [{ token: code, kind: 'code', owner: code }]
    const seen = new Set([tokenKey(code)])
    const wanted: [string, TokenKind][] = [
      ...currency.symbols.map((s): [string, TokenKind] => [s, 'symbol']),
      ...currency.aliases.map((a): [string, TokenKind] => [a, 'alias']),
    ]
    for (const [token, tokenKind] of wanted) {
      const key = tokenKey(token)
      if (seen.has(key)) continue
      seen.add(key)
      if (!owner.has(key)) {
        owner.set(key, code)
        kind.set(key, tokenKind)
      }
      list.push({ token, kind: tokenKind, owner: owner.get(key)! })
    }
    claims.set(code, list)
  }

  return { owner, kind, claims }
}
