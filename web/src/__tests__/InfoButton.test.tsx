import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoButton } from '@/components/ui/info-button'

function renderButton() {
  return render(
    <InfoButton
      label="Initial BTC holdings"
      description="The amount of bitcoin you hold today."
    />,
  )
}

describe('InfoButton', () => {
  it('renders a trigger with an accessible name referencing the element', () => {
    renderButton()

    const trigger = screen.getByRole('button', {
      name: 'About Initial BTC holdings',
    })
    expect(trigger).toBeInTheDocument()
  })

  it('has a 44px hit area without inflating its visual size', () => {
    renderButton()

    const trigger = screen.getByRole('button', {
      name: 'About Initial BTC holdings',
    })
    expect(trigger.className).toContain('after:-inset-[9px]')
  })

  it('opens on click and shows the label and description', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(
      screen.getByRole('button', { name: 'About Initial BTC holdings' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Initial BTC holdings' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The amount of bitcoin you hold today.'),
    ).toBeInTheDocument()
  })

  it('opens on hover without a click', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.hover(
      screen.getByRole('button', { name: 'About Initial BTC holdings' }),
    )

    expect(
      await screen.findByText('The amount of bitcoin you hold today.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Initial BTC holdings' }),
    ).toBeInTheDocument()
  })

  it('closes when the pointer leaves after a hover-open', async () => {
    const user = userEvent.setup()
    renderButton()

    const trigger = screen.getByRole('button', {
      name: 'About Initial BTC holdings',
    })
    await user.hover(trigger)
    await screen.findByText('The amount of bitcoin you hold today.')

    await user.unhover(trigger)
    await waitFor(() =>
      expect(
        screen.queryByText('The amount of bitcoin you hold today.'),
      ).not.toBeInTheDocument(),
    )
  })

  it('closes on a second click of the trigger', async () => {
    const user = userEvent.setup()
    renderButton()

    const trigger = screen.getByRole('button', {
      name: 'About Initial BTC holdings',
    })
    await user.click(trigger)
    expect(
      screen.getByText('The amount of bitcoin you hold today.'),
    ).toBeInTheDocument()

    await user.click(trigger)
    expect(
      screen.queryByText('The amount of bitcoin you hold today.'),
    ).not.toBeInTheDocument()
  })

  it('closes on outside click', async () => {
    const user = userEvent.setup()
    renderButton()

    const trigger = screen.getByRole('button', {
      name: 'About Initial BTC holdings',
    })
    await user.click(trigger)
    await user.click(document.body)

    expect(
      screen.queryByText('The amount of bitcoin you hold today.'),
    ).not.toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderButton()

    const trigger = screen.getByRole('button', {
      name: 'About Initial BTC holdings',
    })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(
      screen.queryByText('The amount of bitcoin you hold today.'),
    ).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('renders the label inline when showLabel is set', () => {
    render(
      <InfoButton
        label="Formulation"
        description="How the power law line is fitted."
        showLabel
      />,
    )

    expect(screen.getByText('Formulation')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'About Formulation' }),
    ).toBeInTheDocument()
  })
})
