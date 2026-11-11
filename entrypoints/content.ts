import { createMatcher, parseAmount, type Matcher } from '~/lib/matcher'
import { getRates, type Rates } from '~/lib/rates'
import { getSettings, onSettingsChanged, type Settings } from '~/lib/settings'

type Converter = {
  home: string
  matcher: Matcher
  rates: Rates
  formatter: Intl.NumberFormat
}

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

function findAndConvert() {
  const c = converter
  if (!c || !document.body) return
  const { matcher } = c

  visitAllTextNodes(document.body, (textNode) => {
    if (!matcher.any.test(textNode.nodeValue ?? '')) return
    if (SKIPPED_TAGS.has(textNode.parentElement?.tagName ?? '')) return
    if (markNode(textNode)) return

    walkSidewayAndUpUntil(textNode, {
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

function walkSidewayAndUpUntil(
  startNode: Node,
  callbackObject: {
    left: (nodeList: Node[]) => WalkResult
    right: (nodeList: Node[]) => WalkResult
  },
) {
  const rightResult = callbackObject.right([startNode])
  if (rightResult.found) return
  const leftResult = callbackObject.left([startNode])
  if (leftResult.found) return
  let leftKeepGoing = leftResult.keepGoing
  let rightKeepGoing = rightResult.keepGoing
  let leftWait = false
  let rightWait = false
  let leftNodeList = [startNode]
  let rightNodeList = [startNode]

  let centralNode = startNode

  for (let k = 0; (leftKeepGoing || rightKeepGoing) && k < 1000; k++) {
    // left
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
    // right
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
    // go up if both sides are waiting for it
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
