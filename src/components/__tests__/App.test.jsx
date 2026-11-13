import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../../App.jsx'

describe('App', () => {
  it('starts idle and toggles capture state on Start/Stop', () => {
    render(<App />)

    expect(screen.getByText('Idle')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(screen.getByText('Capturing…')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(screen.getByText('Idle')).toBeInTheDocument()
  })

  it('shows an empty state before any packets are captured', () => {
    render(<App />)
    expect(screen.getByText(/no packets captured yet/i)).toBeInTheDocument()
  })

  it('flags an invalid display filter', () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/apply a display filter/i)
    fireEvent.change(input, { target: { value: 'not.a.real.field == 1' } })
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('accepts a known protocol filter without error', () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/apply a display filter/i)
    fireEvent.change(input, { target: { value: 'tcp' } })
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })
})
