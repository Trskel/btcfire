import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ParameterPanel } from '@/components/controls/ParameterPanel'
import { ParameterInput } from '@/components/controls/ParameterInput'
import { defaultSimulationParams, PARAM_BOUNDS } from '@/types/simulation'
import type { SimulationParams } from '@/types/simulation'
import { useSimulationParams, SIM_PARAMS_STORAGE_KEY } from '@/hooks/useSimulationParams'

function renderPanel() {
  const onChange = vi.fn()
  const utils = render(
    <ParameterPanel
      params={defaultSimulationParams()}
      onParamChange={onChange}
    />,
  )
  return { onChange, ...utils }
}

describe('ParameterInput', () => {
  it('commits typed values', () => {
    const onChange = vi.fn()
    render(
      <ParameterInput
        label="Initial BTC holdings"
        value={1}
        displayValue="1 BTC"
        min={PARAM_BOUNDS.holdingsBtc.min}
        max={PARAM_BOUNDS.holdingsBtc.max}
        formatValue={(v) => v.toFixed(8).replace(/\.?0+$/, '')}
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('spinbutton', {
      name: 'Initial BTC holdings value',
    })
    fireEvent.change(input, { target: { value: '2.75' } })

    expect(onChange).toHaveBeenCalledWith(2.75)
  })

  it('clamps committed values to bounds', () => {
    const onChange = vi.fn()
    render(
      <ParameterInput
        label="Initial BTC holdings"
        value={1}
        displayValue="1 BTC"
        min={PARAM_BOUNDS.holdingsBtc.min}
        max={PARAM_BOUNDS.holdingsBtc.max}
        formatValue={(v) => v.toFixed(8).replace(/\.?0+$/, '')}
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('spinbutton', {
      name: 'Initial BTC holdings value',
    })
    fireEvent.change(input, { target: { value: '999999999' } })

    expect(onChange).toHaveBeenCalledWith(PARAM_BOUNDS.holdingsBtc.max)
  })

  it('supports 8 decimals', () => {
    const onChange = vi.fn()
    render(
      <ParameterInput
        label="Initial BTC holdings"
        value={0.12345678}
        displayValue="0.12345678 BTC"
        min={PARAM_BOUNDS.holdingsBtc.min}
        max={PARAM_BOUNDS.holdingsBtc.max}
        formatValue={(v) => v.toFixed(8).replace(/\.?0+$/, '')}
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('spinbutton', {
      name: 'Initial BTC holdings value',
    }) as HTMLInputElement
    expect(input.value).toBe('0.12345678')

    fireEvent.change(input, { target: { value: '0.5' } })
    expect(onChange).toHaveBeenCalledWith(0.5)
  })
})

describe('ParameterPanel', () => {
  it('renders all seven fields with default values', () => {
    renderPanel()

    expect(screen.getByText('Initial BTC holdings')).toBeInTheDocument()
    expect(screen.getByText('Retirement start year')).toBeInTheDocument()
    expect(screen.getByText('Current age')).toBeInTheDocument()
    expect(screen.getByText('Expected lifespan')).toBeInTheDocument()
    expect(screen.getByText('Minimum annual spending')).toBeInTheDocument()
    expect(screen.getByText('Desired annual spending')).toBeInTheDocument()
    expect(screen.getByText('Annual inflation rate')).toBeInTheDocument()

    expect(screen.getByText('1 BTC')).toBeInTheDocument()
    expect(screen.getByText('$50,000')).toBeInTheDocument()
    expect(screen.getByText('3.0%')).toBeInTheDocument()

    expect(screen.getAllByRole('spinbutton')).toHaveLength(7)
  })

  it('hides the inflation field when showInflation is false', () => {
    const onChange = vi.fn()
    render(
      <ParameterPanel
        params={defaultSimulationParams()}
        onParamChange={onChange}
        showInflation={false}
      />,
    )

    expect(screen.queryByText('Annual inflation rate')).not.toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(6)
  })

  it('crops trailing zeroes on the BTC value', () => {
    renderPanel()

    const input = screen.getByRole('spinbutton', {
      name: 'Initial BTC holdings value',
    }) as HTMLInputElement
    expect(input.value).toBe('1')
  })

  it('reverts invalid text to the last valid value on blur', () => {
    renderPanel()

    const input = screen.getByRole('spinbutton', {
      name: 'Initial BTC holdings value',
    })
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.blur(input)

    const textInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[]
    expect(textInputs[0].value).toBe('1')
  })
})

describe('ParameterPanel persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function Harness() {
    const { params, setParam } = useSimulationParams()
    return <ParameterPanel params={params} onParamChange={setParam} />
  }

  function changeField(label: string, value: string) {
    const input = screen.getByRole('spinbutton', { name: `${label} value` })
    fireEvent.change(input, { target: { value } })
  }

  it('saves changes and restores them on remount', () => {
    const { unmount } = render(<Harness />)

    changeField('Initial BTC holdings', '3')
    changeField('Current age', '42')

    act(() => {
      vi.advanceTimersByTime(350)
    })
    const stored = JSON.parse(localStorage.getItem(SIM_PARAMS_STORAGE_KEY)!)
    expect(stored.params.holdingsBtc).toBe(3)
    expect(stored.params.currentAge).toBe(42)

    unmount()
    render(<Harness />)

    const holdingsInput = screen.getByRole('spinbutton', {
      name: 'Initial BTC holdings value',
    }) as HTMLInputElement
    expect(holdingsInput.value).toBe('3')

    const ageInput = screen.getByRole('spinbutton', {
      name: 'Current age value',
    }) as HTMLInputElement
    expect(ageInput.value).toBe('42')
  })

  it('restores stored values on first mount', () => {
    const stored: Partial<SimulationParams> = {
      holdingsBtc: 8,
      currentAge: 55,
    }
    localStorage.setItem(
      SIM_PARAMS_STORAGE_KEY,
      JSON.stringify({ version: 1, params: stored }),
    )

    render(<Harness />)

    const holdingsInput = screen.getByRole('spinbutton', {
      name: 'Initial BTC holdings value',
    }) as HTMLInputElement
    expect(holdingsInput.value).toBe('8')

    const ageInput = screen.getByRole('spinbutton', {
      name: 'Current age value',
    }) as HTMLInputElement
    expect(ageInput.value).toBe('55')
  })
})
