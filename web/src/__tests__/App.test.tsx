import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'

vi.mock('btcfire-wasm', () => ({
  default: () => Promise.resolve(),
  greet: (name: string) => `Hello from BTCFire WASM, ${name}!`,
}))

describe('App', () => {
  it('renders the heading and WASM button', async () => {
    render(<App />)
    expect(screen.getByText('BTCFire')).toBeInTheDocument()
    const button = await screen.findByRole('button', { name: /call wasm/i })
    expect(button).toBeEnabled()
  })

  it('displays WASM output when button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = await screen.findByRole('button', { name: /call wasm/i })
    await user.click(button)
    expect(screen.getByText('Hello from BTCFire WASM, World!')).toBeInTheDocument()
  })
})
