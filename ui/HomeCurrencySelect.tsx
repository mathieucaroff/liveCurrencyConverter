import { CURRENCIES, PREFERRED_HOME_CURRENCIES } from '~/lib/currencies'
import { CurrencyLabel, CurrencyMenu } from '~/ui/CurrencyPicker'
import { Dropdown } from '~/ui/Dropdown'

const OTHER_HOME_CODES = CURRENCIES.map((currency) => currency.code)
  .filter((code) => !PREFERRED_HOME_CURRENCIES.includes(code))
  .sort()

/** The selected home currency with a ▼; opens a searchable dropdown. */
export function HomeCurrencySelect({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  return (
    <Dropdown
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-left transition hover:border-amber-400/60"
        >
          <span className="min-w-0 flex-1">
            <CurrencyLabel code={value} />
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-xs text-amber-200 transition ${
              open ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>
      )}
    >
      {(close) => (
        <CurrencyMenu
          placeholder="Search by code, name or symbol"
          sections={[
            { label: 'Common', codes: PREFERRED_HOME_CURRENCIES },
            { label: 'All currencies', codes: OTHER_HOME_CODES },
          ]}
          isChecked={(code) => code === value}
          onPick={(code) => {
            close()
            onChange(code)
          }}
        />
      )}
    </Dropdown>
  )
}
