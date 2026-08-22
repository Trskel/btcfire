import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { WithdrawalTab } from '@/components/controls/WithdrawalTab'
import {
  defaultPolicy,
  isPolicyDirty,
  policyForPreset,
  PRESET_LABELS,
  type PresetId,
  type WithdrawalPolicy,
} from '@/types/policy'

function Harness({ initial = defaultPolicy() }: { initial?: WithdrawalPolicy }) {
  const [policy, setPolicy] = useState(initial)
  const [dirty, setDirty] = useState(isPolicyDirty(initial))
  return (
    <WithdrawalTab
      policy={policy}
      dirty={dirty}
      onSelectPreset={(preset: PresetId) => {
        const next = policyForPreset(preset)
        setPolicy(next)
        setDirty(false)
      }}
      onUpdatePolicy={(updater) => {
        const next = updater(policy)
        setPolicy(next)
        setDirty(isPolicyDirty(next))
      }}
    />
  )
}

describe('WithdrawalTab', () => {
  it('renders the five preset cards', () => {
    render(<Harness />)
    for (const id of Object.keys(PRESET_LABELS) as PresetId[]) {
      expect(
        screen.getByRole('button', { name: new RegExp(PRESET_LABELS[id]) }),
      ).toBeInTheDocument()
    }
  })

  it('hides guardrail knobs when guardrails are off', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Ceiling threshold value')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Floor threshold value')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Adjustment size value')).not.toBeInTheDocument()
    expect(screen.queryByText('Prosperity rule')).not.toBeInTheDocument()
  })

  it('shows guardrail knobs when guardrails are enabled', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('switch', { name: 'Guardrails' }))
    expect(screen.getByLabelText('Ceiling threshold value')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor threshold value')).toBeInTheDocument()
    expect(screen.getByLabelText('Adjustment size value')).toBeInTheDocument()
    expect(screen.getByText('Prosperity rule')).toBeInTheDocument()
  })

  it('selecting the Guardrails preset prefills and reveals guardrail knobs', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /Guardrails/ }))

    expect(screen.getByLabelText('Ceiling threshold value')).toBeInTheDocument()
    const ceiling = screen.getByLabelText(
      'Ceiling threshold value',
    ) as HTMLInputElement
    expect(ceiling.value).toBe('20')
    const floor = screen.getByLabelText(
      'Floor threshold value',
    ) as HTMLInputElement
    expect(floor.value).toBe('20')
    const adjust = screen.getByLabelText(
      'Adjustment size value',
    ) as HTMLInputElement
    expect(adjust.value).toBe('10')
  })

  it('hides valuation knobs when valuation is off', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Fair phase low value')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Euphoria surplus value')).not.toBeInTheDocument()
  })

  it('shows valuation knobs when valuation is enabled', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('switch', { name: 'Valuation-based selling' }))
    expect(screen.getByLabelText('Fair phase low value')).toBeInTheDocument()
    expect(screen.getByLabelText('Fair phase high value')).toBeInTheDocument()
    expect(screen.getByLabelText('Euphoria surplus value')).toBeInTheDocument()
    expect(screen.getByLabelText('Safety valve value')).toBeInTheDocument()
  })

  it('hides the buffer target knob when the buffer is off', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Buffer target value')).not.toBeInTheDocument()
  })

  it('shows the buffer target knob when the buffer is enabled', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('switch', { name: 'Cash buffer' }))
    expect(screen.getByLabelText('Buffer target value')).toBeInTheDocument()
  })

  it('swaps the rate knob for a spend knob on fixed USD anchors', () => {
    render(<Harness />)
    const anchor = screen.getByLabelText('Anchor') as HTMLSelectElement
    fireEvent.change(anchor, { target: { value: 'fixed_usd' } })
    expect(screen.queryByLabelText('Withdrawal rate value')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Annual spend value')).toBeInTheDocument()
  })

  it('marks the preset label dirty after a knob edit', () => {
    render(<Harness />)
    const rate = screen.getByLabelText(
      'Withdrawal rate value',
    ) as HTMLInputElement
    fireEvent.change(rate, { target: { value: '5' } })

    const classicButton = screen.getByRole('button', { name: /Classic FIRE/ })
    expect(classicButton.querySelector('[aria-label="modified"]')).not.toBeNull()
  })

  it('does not show a dirty marker right after preset selection', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /Fixed %/ }))
    const fixedButton = screen.getByRole('button', { name: /Fixed %/ })
    expect(fixedButton.querySelector('[aria-label="modified"]')).toBeNull()
  })
})
