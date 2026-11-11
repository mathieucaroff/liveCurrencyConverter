import { createMatcher, parseAmount, type Matcher } from '~/lib/matcher'
import { getRates, type Rates } from '~/lib/rates'
import { getSettings, onSettingsChanged, type Settings } from '~/lib/settings'

type Converter = {
  home: string
  matcher: Matcher
  rates: Rates
  formatter: Intl.NumberFormat
}

/**
 * What a `walkSidewayAndUpUntil` callback reports about the text it was given.
 * - `found`: a value was found next to the token; the whole walk stops.
 * - `keepGoing`: nothing conclusive yet; this side may extend further.
 *   False when the token is followed (right) or preceded (left) by text that
 *   is not a number, so the price can't be on that side.
 */
type WalkResult = { found: boolean; keepGoing: boolean }

const MARK_ATTRIBUTE = 'data-lcc-converted'
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'])
const RESCAN_DELAY_MS = 200

let converter: Converter | null = null
let rescanTimer: number | undefined
/** Bumped on every settings change, so a slow rate fetch can't apply stale settings. */
let configVersion = 0

async function configure(settings: Settings) {
  const version = ++configVersion
  converter = null
  if (
    !settings.onboarded ||
    !settings.enabled ||
    settings.sourceCurrencies.length === 0
  ) {
    return
  }

  const matcher = createMatcher(settings.sourceCurrencies)
  const rates = await getRates(settings.homeCurrency)
  if (version !== configVersion || !matcher || !rates) return

  converter = {
    home: settings.homeCurrency,
    matcher,
    rates,
    formatter: new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency: settings.homeCurrency,
    }),
  }
  findAndConvert()
}

function scheduleRescan() {
  if (!converter || rescanTimer !== undefined) return
  rescanTimer = window.setTimeout(() => {
    rescanTimer = undefined
    findAndConvert()
  }, RESCAN_DELAY_MS)
}

/**
 * Format `amount` of `token`'s currency in the home currency, if possible.
 * Prices already in the home currency are left alone (no 1:1 conversion).
 */
function convert(c: Converter, token: string, amountText: string) {
  const code = c.matcher.currencyOf(token)
  if (!code || code === c.home) return null
  const rate = c.rates[code]
  const amount = parseAmount(amountText)
  if (!rate || !Number.isFinite(amount)) return null
  return c.formatter.format(amount / rate)
}

/**
 * Scan the whole page and annotate prices with their home-currency value.
 *
 * 1. Visit every text node of the body.
 * 2. Keep those containing a currency token (`$`, `JPY`, `yen`…), outside
 *    `<script>`, `<style>`, etc.
 * 3. Mark the node's parent element, so it is processed only once, even by
 *    later rescans (and even if no price is found next to the token).
 * 4. Look for the amount around the token with `walkSidewayAndUpUntil`, as
 *    prices are often split across elements: `<span>¥</span><b>1,000</b>`.
 * 5. Write the converted value into the token's text node: before it for a
 *    prefix price ("(€6.12) ¥1,000"), after it for a suffix price
 *    ("1,000 THB (€26.10)").
 */
function findAndConvert() {
  const c = converter
  if (!c || !document.body) return
  const { matcher } = c

  visitAllTextNodes(document.body, (textNode) => {
    if (!matcher.any.test(textNode.nodeValue ?? '')) return
    if (SKIPPED_TAGS.has(textNode.parentElement?.tagName ?? '')) return
    if (markNode(textNode)) return

    walkSidewayAndUpUntil(textNode, {
      // Prefix prices: the token comes first, so the amount is on the right.
      // `nodeList` runs from the token's node rightwards; its text is joined
      // without separators, so "¥" + "1,000" reads as "¥1,000".
      right: (nodeList) => {
        const text = nodeList.map((node) => node.textContent).join('')
        const textMatch = text.match(matcher.prefixText)
        const valueMatch = text.match(matcher.prefixValue)
        const converted =
          valueMatch && convert(c, valueMatch[1]!, valueMatch[2]!)
        if (converted) {
          textNode.nodeValue = `(${converted}) ${textNode.nodeValue}`
        }
        return {
          found: !!valueMatch,
          keepGoing: !textMatch && !valueMatch,
        }
      },
      // Suffix prices: the amount comes first, on the left of the token.
      // `nodeList` runs from the leftmost node collected so far to the token.
      left: (nodeList) => {
        const text = nodeList.map((node) => node.textContent).join('')
        const textMatch = text.match(matcher.suffixText)
        const valueMatch = text.match(matcher.suffixValue)
        const converted =
          valueMatch && convert(c, valueMatch[2]!, valueMatch[1]!)
        if (converted) {
          textNode.nodeValue = `${textNode.nodeValue} (${converted})`
        }
        return {
          found: !!valueMatch,
          keepGoing: !textMatch && !valueMatch,
        }
      },
    })
  })
}

/** Call `callback` on every text node under `container`, in document order. */
function visitAllTextNodes(
  container: Node,
  callback: (textNode: Text) => void,
) {
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      callback(node as Text)
    } else {
      for (const child of node.childNodes) {
        walk(child)
      }
    }
  }
  walk(container)
}

/**
 * Search the text around `startNode` in a growing window, until a callback
 * finds what it looks for.
 *
 * The window has a left part and a right part, each a run of consecutive
 * sibling nodes that includes the current "central" node:
 *
 * 1. Both callbacks first see the start node alone.
 * 2. Then, one step per side per iteration, the left part grows by its
 *    previous sibling and the right part by its next sibling; the side's
 *    callback is called again with the whole, longer run.
 * 3. A side with no sibling left "waits". When both sides wait, the walk goes
 *    up: the parent element becomes the central node and both parts restart
 *    from it, now growing with the parent's siblings.
 *
 * Example, starting from the "¥" text node in
 * `<div><span>¥</span><b>1,000</b></div>`:
 * - right(["¥"]): just a token, keep going. left(["¥"]): same.
 * - "¥" has no siblings, both sides wait: go up to `<span>`.
 * - right([span, b]) reads "¥1,000": found.
 *
 * The walk stops when a callback returns `found`, when both sides stopped
 * (`keepGoing` false), at the top of the document, or after 1000 steps.
 *
 * Limitations:
 * - Going up needs both sides waiting. A side that stopped never waits, so
 *   once one side stops, the other can't go up any more and the loop idles
 *   until the 1000-step limit.
 * - Callbacks match anywhere in the joined text, not only next to the start
 *   node. After going up, a match can be another price of the parent, which
 *   then gets written next to the start node's token.
 */
function walkSidewayAndUpUntil(
  startNode: Node,
  callbackObject: {
    left: (nodeList: Node[]) => WalkResult
    right: (nodeList: Node[]) => WalkResult
  },
) {
  // Step 1: the start node alone. Right first: prefix prices win.
  const rightResult = callbackObject.right([startNode])
  if (rightResult.found) return
  const leftResult = callbackObject.left([startNode])
  if (leftResult.found) return
  let leftKeepGoing = leftResult.keepGoing
  let rightKeepGoing = rightResult.keepGoing
  /** A side waits when it ran out of siblings at the current level. */
  let leftWait = false
  let rightWait = false
  let leftNodeList = [startNode]
  let rightNodeList = [startNode]

  /** The node both parts grow from; moves up to its parent when both wait. */
  let centralNode = startNode

  for (let k = 0; (leftKeepGoing || rightKeepGoing) && k < 1000; k++) {
    // Step 2, left: prepend the previous sibling and look again.
    if (leftKeepGoing && !leftWait) {
      const leftNode = leftNodeList[0]!
      if (leftNode.previousSibling) {
        leftNodeList.unshift(leftNode.previousSibling)
        const { found, keepGoing } = callbackObject.left(leftNodeList)
        if (found) break
        if (!keepGoing) leftKeepGoing = false
      } else {
        leftWait = true
      }
    }
    // Step 2, right: append the next sibling and look again.
    if (rightKeepGoing && !rightWait) {
      const rightNode = rightNodeList[rightNodeList.length - 1]!
      if (rightNode.nextSibling) {
        rightNodeList.push(rightNode.nextSibling)
        const { found, keepGoing } = callbackObject.right(rightNodeList)
        if (found) break
        if (!keepGoing) rightKeepGoing = false
      } else {
        rightWait = true
      }
    }
    // Step 3: both sides ran out of siblings, restart one level up. The parent
    // alone isn't checked: its text was already covered at the level below.
    if (leftWait && rightWait) {
      if (centralNode.parentElement) {
        centralNode = centralNode.parentElement
        leftWait = false
        rightWait = false
        leftNodeList = [centralNode]
        rightNodeList = [centralNode]
      } else {
        break
      }
    }
  }
}

/** Mark the node's parent as processed; returns true if it already was. */
function markNode(node: Node): boolean {
  if (node.parentElement?.getAttribute(MARK_ATTRIBUTE)) {
    return true
  }
  node.parentElement?.setAttribute(MARK_ATTRIBUTE, 'true')
  return false
}

export default defineContentScript({
  matches: ['*://*/*'],
  async main() {
    onSettingsChanged((settings) => void configure(settings))

    document.documentElement.addEventListener('click', scheduleRescan, true)
    new MutationObserver(scheduleRescan).observe(document.documentElement, {
      childList: true,
      attributes: true,
      subtree: true,
    })

    await configure(await getSettings())
  },
})
