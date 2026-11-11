import { describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

import { createMatcher } from './matcher'
import { createConverter, findAndConvert } from './pageConverter'

/** Home EUR: ¥160 = €1, ฿36 = €1. */
function eurConverter() {
  return createConverter({
    home: 'EUR',
    matcher: createMatcher(['EUR', 'JPY', 'THB'])!,
    rates: { JPY: 160, THB: 36 },
    locale: 'en-US',
  })
}

function page(html: string) {
  const window = new Window()
  const body = window.document.body
  body.innerHTML = html
  return body as unknown as HTMLElement
}

describe('findAndConvert', () => {
  test('annotates a price split across elements, right after the amount', () => {
    const body = page('<p><span>¥</span><b>1,000</b> per night</p>')
    findAndConvert(eurConverter(), body)
    expect(body.textContent).toBe('¥1,000 (€6.25) per night')
    expect(body.querySelector('b')!.textContent).toBe('1,000 (€6.25)')
  })

  test('annotates suffix prices after the currency', () => {
    const body = page('<p>1,000 THB total</p>')
    findAndConvert(eurConverter(), body)
    expect(body.textContent).toBe('1,000 THB (€27.78) total')
  })

  test('annotates every price of an element', () => {
    const body = page('<p>¥1,000 or ¥2,000</p>')
    findAndConvert(eurConverter(), body)
    expect(body.textContent).toBe('¥1,000 (€6.25) or ¥2,000 (€12.50)')
  })

  test('is idempotent', () => {
    const body = page('<p><span>¥</span><b>1,000</b> or 360 THB</p>')
    const c = eurConverter()
    findAndConvert(c, body)
    const once = body.textContent
    findAndConvert(c, body)
    findAndConvert(c, body)
    expect(body.textContent).toBe(once)
  })

  test('converts an amount that appears after the first scan', () => {
    const body = page('<p><span>¥</span><b></b></p>')
    const c = eurConverter()
    findAndConvert(c, body)
    expect(body.textContent).toBe('¥')
    body.querySelector('b')!.textContent = '1,000'
    findAndConvert(c, body)
    expect(body.textContent).toBe('¥1,000 (€6.25)')
  })

  test('converts again when the site rewrites an annotated node', () => {
    const body = page('<p>¥1,000</p>')
    const c = eurConverter()
    findAndConvert(c, body)
    const text = body.querySelector('p')!.firstChild as unknown as Text
    text.data = '¥2,000' // e.g. a React re-render
    findAndConvert(c, body)
    expect(body.textContent).toBe('¥2,000 (€12.50)')
  })

  test('leaves home currency prices alone', () => {
    const body = page('<p>€5 and ¥160</p>')
    findAndConvert(eurConverter(), body)
    expect(body.textContent).toBe('€5 and ¥160 (€1.00)')
  })

  test('does not read its own annotation as a new price', () => {
    // "$" belongs to CAD here, but the annotations are formatted in USD ("$")
    const c = createConverter({
      home: 'USD',
      matcher: createMatcher(['CAD', 'USD', 'JPY'])!,
      rates: { JPY: 160, CAD: 1.4 },
      locale: 'en-US',
    })
    const body = page('<p>¥1,000</p>')
    findAndConvert(c, body)
    findAndConvert(c, body)
    expect(body.textContent).toBe('¥1,000 ($6.25)')
  })

  test('goes up even when one side stopped', () => {
    const body = page('<ul><li>Price: <span>¥</span></li><li>1,000</li></ul>')
    findAndConvert(eurConverter(), body)
    expect(body.textContent).toBe('Price: ¥1,000 (€6.25)')
  })

  test('skips scripts', () => {
    const body = page('<script>var price = "¥1,000"</script>')
    findAndConvert(eurConverter(), body)
    expect(body.textContent).toBe('var price = "¥1,000"')
  })
})
