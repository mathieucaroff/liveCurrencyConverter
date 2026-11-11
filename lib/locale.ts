import { isKnownCurrency } from './currencies'

const EURO_REGIONS =
  'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK BG AD MC SM VA ME XK'
const XOF_REGIONS = 'BF BJ CI GW ML NE SN TG'
const XAF_REGIONS = 'CF CG CM GA GQ TD'
const XCD_REGIONS = 'AG AI DM GD KN LC MS VC'
const XPF_REGIONS = 'NC PF WF'
const USD_REGIONS = 'US EC SV PR TL GU VI AS MH FM PW'
const AUD_REGIONS = 'AU KI NR TV'

// prettier-ignore
const OTHER_REGIONS =
  'CA:CAD MX:MXN BR:BRL AR:ARS CL:CLP CO:COP PE:PEN UY:UYU PY:PYG BO:BOB ' +
  'VE:VES PA:PAB CR:CRC GT:GTQ HN:HNL NI:NIO DO:DOP CU:CUP HT:HTG JM:JMD ' +
  'TT:TTD BS:BSD BB:BBD BZ:BZD GY:GYD SR:SRD KY:KYD BM:BMD AW:AWG CW:XCG ' +
  'SX:XCG FK:FKP SH:SHP GB:GBP CH:CHF LI:CHF NO:NOK SE:SEK DK:DKK GL:DKK ' +
  'IS:ISK FO:FOK GG:GGP IM:IMP JE:JEP GI:GIP PL:PLN CZ:CZK HU:HUF RO:RON ' +
  'MD:MDL RS:RSD BA:BAM MK:MKD AL:ALL UA:UAH BY:BYN RU:RUB TR:TRY GE:GEL ' +
  'AM:AMD AZ:AZN CN:CNY JP:JPY KR:KRW TW:TWD HK:HKD MO:MOP MN:MNT IN:INR ' +
  'PK:PKR BD:BDT LK:LKR NP:NPR BT:BTN MV:MVR AF:AFN IR:IRR IQ:IQD SA:SAR ' +
  'AE:AED QA:QAR KW:KWD BH:BHD OM:OMR YE:YER JO:JOD LB:LBP SY:SYP IL:ILS ' +
  'PS:ILS EG:EGP KZ:KZT UZ:UZS KG:KGS TJ:TJS TM:TMT TH:THB VN:VND KH:KHR ' +
  'LA:LAK MM:MMK MY:MYR SG:SGD BN:BND ID:IDR PH:PHP NZ:NZD FJ:FJD PG:PGK ' +
  'SB:SBD VU:VUV WS:WST TO:TOP ZA:ZAR NG:NGN KE:KES GH:GHS ET:ETB TZ:TZS ' +
  'UG:UGX RW:RWF BI:BIF CD:CDF AO:AOA ZM:ZMW ZW:ZWG MZ:MZN MW:MWK BW:BWP ' +
  'NA:NAD LS:LSL SZ:SZL MG:MGA MU:MUR SC:SCR KM:KMF DJ:DJF ER:ERN SO:SOS ' +
  'SD:SDG SS:SSP LY:LYD TN:TND DZ:DZD MA:MAD MR:MRU GM:GMD GN:GNF SL:SLE ' +
  'LR:LRD CV:CVE ST:STN'

function regionsTo(regions: string, code: string): [string, string][] {
  return regions.split(' ').map((region) => [region, code])
}

/** Country or region (ISO 3166) → currency used there. */
export const REGION_CURRENCY: ReadonlyMap<string, string> = new Map([
  ...regionsTo(EURO_REGIONS, 'EUR'),
  ...regionsTo(XOF_REGIONS, 'XOF'),
  ...regionsTo(XAF_REGIONS, 'XAF'),
  ...regionsTo(XCD_REGIONS, 'XCD'),
  ...regionsTo(XPF_REGIONS, 'XPF'),
  ...regionsTo(USD_REGIONS, 'USD'),
  ...regionsTo(AUD_REGIONS, 'AUD'),
  ...OTHER_REGIONS.split(' ').map(
    (pair) => pair.split(':') as [string, string],
  ),
])

/** The region of a language tag, guessed when absent ("fr" → "FR", "ja" → "JP"). */
function regionOf(languageTag: string): string | undefined {
  try {
    return new Intl.Locale(languageTag).maximize().region
  } catch {
    return undefined
  }
}

/**
 * Guess the user's currency from their preferred languages, such as
 * `navigator.languages`. Falls back to USD.
 */
export function guessHomeCurrency(languages: readonly string[]): string {
  for (const language of languages) {
    const region = regionOf(language)
    const code = region && REGION_CURRENCY.get(region)
    if (code && isKnownCurrency(code)) return code
  }
  return 'USD'
}
