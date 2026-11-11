/**
 * Find prices in a document and annotate them with their home-currency value.
 *
 * Kept free of extension APIs and DOM globals (constants, `document`), so it
 * can be tested against any DOM implementation.
 */
import { parseAmount, type Matcher } from './matcher'
import type { Rates } from './rates'

export type Converter = {
  home: string
  matcher: Matcher
  rates: Rates
  formatter: Intl.NumberFormat
  /** Global versions of the matcher's value patterns, to find every price. */
  prefixValueAll: RegExp
  suffixValueAll: RegExp
}

export function createConverter(options: {
  home: string
  matcher: Matcher
  rates: Rates
  locale: string
}): Converter {
  const { home, matcher, rates, locale } = options
  return {
    home,
    matcher,
    rates,
    formatter: new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: home,
    }),
    prefixValueAll: new RegExp(matcher.prefixValue.source, 'gu'),
    suffixValueAll: new RegExp(matcher.suffixValue.source, 'gu'),
  }
}

/**
 * What a `walkSidewayAndUpUntil` callback reports about the text it was given.
 * - `found`: a price was found next to the token; the whole walk stops.
 * - `keepGoing`: nothing conclusive yet; this side may extend further.
 *   False when the token is followed (right) or preceded (left) by text that
 *   is not a number, so the price can't be on that side.
 */
type WalkResult = { found: boolean; keepGoing: boolean }

const TEXT_NODE = 3 // Node.TEXT_NODE
const SHOW_TEXT = 0x4 // NodeFilter.SHOW_TEXT
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'])

/**
 * The text nodes we inserted annotations into, with their content right after
 * our last write and the annotations we put there.
 *
 * Nothing is stored in the page itself. A record only counts while the node
 * still holds exactly what we wrote: if the site rewrites the node (e.g. a
 * React re-render dropping our annotation), the record is ignored and the
 * node's prices get converted again. Being a WeakMap, it doesn't keep removed
 * nodes alive.
 */
const written = new WeakMap<Text, { data: string; annotations: string[] }>()

function validRecord(node: Text) {
  const record = written.get(node)
  return record && record.data === node.data ? record : undefined
}

/**
 * The node's text with our own annotations blanked out (replaced by spaces
 * of the same length, so offsets are unchanged). This keeps an annotation
 * like "($6.25)" from being read as a new price.
 */
function ownText(node: Text): string {
  let text = node.data
  for (const annotation of validRecord(node)?.annotations ?? []) {
    text = text.split(annotation).join(' '.repeat(annotation.length))
  }
  return text
}

/** The text nodes making up `root.textContent`, in the same order. */
function textNodesOf(root: Node): Text[] {
  if (root.nodeType === TEXT_NODE) return [root as Text]
  const texts: Text[] = []
  const walker = root.ownerDocument!.createTreeWalker(root, SHOW_TEXT)
  while (walker.nextNode()) texts.push(walker.currentNode as Text)
  return texts
}

/** The joined text of `nodes`, without our annotations (see `ownText`). */
function joinedText(nodes: Node[]): string {
  return nodes.flatMap(textNodesOf).map(ownText).join('')
}

/**
 * The text node and offset in it of character `offset` of the joined text of
 * `nodes`. An offset at a boundary between two text nodes resolves to the end
 * of the first one.
 */
function textPositionAt(
  nodes: Node[],
  offset: number,
): { node: Text; offset: number } | null {
  let remaining = offset
  for (const text of nodes.flatMap(textNodesOf)) {
    if (remaining <= text.data.length) return { node: text, offset: remaining }
    remaining -= text.data.length
  }
  return null
}

/** Whether one of our annotations already follows position `offset`. */
function isAnnotatedAt(nodes: Node[], offset: number): boolean {
  const position = textPositionAt(nodes, offset)
  if (!position) return false
  const { node, offset: at } = position
  return (
    validRecord(node)?.annotations.some((a) => node.data.startsWith(a, at)) ??
    false
  )
}

/** Insert `annotation` at position `offset` and remember it. */
function insertAt(nodes: Node[], offset: number, annotation: string) {
  const position = textPositionAt(nodes, offset)
  if (!position) return
  const { node, offset: at } = position
  const previous = validRecord(node)?.annotations ?? []
  node.data = `${node.data.slice(0, at)}${annotation}${node.data.slice(at)}`
  written.set(node, { data: node.data, annotations: [...previous, annotation] })
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
 * Annotate every price matched by `pattern` in `text`, the joined text of
 * `nodes`, that isn't annotated yet. The annotation goes right after the
 * price, even when the price spans several nodes: in
 * `<span>¥</span><b>1,000</b> per night`, "¥1,000" ends inside `<b>`, giving
 * "¥1,000 (€6.25) per night". Trailing spaces captured by the amount pattern
 * are excluded, so the annotation stays glued to the price.
 *
 * Returns whether any price was matched, converted or not.
 */
function annotateMatches(
  c: Converter,
  nodes: Node[],
  text: string,
  pattern: RegExp,
  groups: { token: number; value: number },
): boolean {
  const matches = [...text.matchAll(pattern)]
  // last to first: inserting text doesn't move the prices before it
  for (const match of matches.reverse()) {
    const end = match.index + match[0].trimEnd().length
    if (isAnnotatedAt(nodes, end)) continue
    const converted = convert(c, match[groups.token]!, match[groups.value]!)
    if (converted) insertAt(nodes, end, ` (${converted})`)
  }
  return matches.length > 0
}

/**
 * Scan `root` and annotate prices with their home-currency value.
 *
 * 1. Visit every text node.
 * 2. Keep those containing a currency token (`$`, `JPY`, `yen`…), outside
 *    `<script>`, `<style>`, etc. Our own annotations don't count.
 * 3. Look for the amount around the token with `walkSidewayAndUpUntil`, as
 *    prices are often split across elements: `<span>¥</span><b>1,000</b>`.
 * 4. Insert the converted value right after each price not annotated yet:
 *    "¥1,000 (€6.25)", "1,000 THB (€27.78)".
 *
 * Nothing marks nodes as done, so running it again is safe and cheap: prices
 * that are already annotated are skipped, while prices whose amount appeared
 * later, or whose annotation the site erased, get converted.
 */
export function findAndConvert(c: Converter, root: Node) {
  const { matcher } = c

  visitAllTextNodes(root, (textNode) => {
    if (SKIPPED_TAGS.has(textNode.parentElement?.tagName ?? '')) return
    if (!matcher.any.test(ownText(textNode))) return

    walkSidewayAndUpUntil(textNode, {
      // Prefix prices: the token comes first, so the amount is on the right.
      // `nodeList` runs from the token's node rightwards; its text is joined
      // without separators, so "¥" + "1,000" reads as "¥1,000".
      right: (nodeList) => {
        const text = joinedText(nodeList)
        const found = annotateMatches(c, nodeList, text, c.prefixValueAll, {
          token: 1,
          value: 2,
        })
        return { found, keepGoing: !found && !matcher.prefixText.test(text) }
      },
      // Suffix prices: the amount comes first, on the left of the token.
      // `nodeList` runs from the leftmost node collected so far to the token.
      left: (nodeList) => {
        const text = joinedText(nodeList)
        const found = annotateMatches(c, nodeList, text, c.suffixValueAll, {
          token: 2,
          value: 1,
        })
        return { found, keepGoing: !found && !matcher.suffixText.test(text) }
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
    if (node.nodeType === TEXT_NODE) {
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
 * 3. A side with no sibling left "waits"; a side whose callback said
 *    `keepGoing: false` is "stopped" for good. When no side can grow at this
 *    level (each waits or stopped), the walk goes up: the parent element
 *    becomes the central node and both parts restart from it, now growing
 *    with the parent's siblings. Only sides still going keep growing.
 *
 * Example, starting from the "¥" text node in
 * `<ul><li>Price: <span>¥</span></li><li>1,000</li></ul>`:
 * - right(["¥"]), left(["¥"]): just a token, keep going.
 * - "¥" has no siblings, both sides wait: go up to `<span>`.
 * - left(["Price: ", span]) reads "Price: ¥": text before the token, left
 *   stops. Right waits (`<span>` has no next sibling): go up to the `<li>`.
 * - right([li, li]) reads "Price: ¥1,000": found.
 *
 * The walk stops when a callback returns `found`, when both sides stopped,
 * at the top of the document, or after 1000 steps.
 *
 * Limitation: callbacks match anywhere in the joined text, not only next to
 * the start node. After going up, a match can be another price of the parent:
 * that price gets converted (in place), and the start node's own price may
 * not.
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

  /** The node both parts grow from; moves up to its parent. */
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
    // Step 3: no side can grow any more at this level: restart one level up.
    // A stopped side counts as done here, otherwise it would block the other
    // side from ever going up. The parent alone isn't checked: its text was
    // already covered at the level below.
    const leftDone = leftWait || !leftKeepGoing
    const rightDone = rightWait || !rightKeepGoing
    if (leftDone && rightDone) {
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
