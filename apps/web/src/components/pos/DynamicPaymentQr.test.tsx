// @vitest-environment jsdom

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DynamicPaymentQr } from './DynamicPaymentQr';

describe('DynamicPaymentQr', () => {
  const defaultProps = {
    paymentUri: 'stellar:pay?destination=GABC...',
    amount: '10.00',
    asset: 'USDC',
    validitySeconds: 5,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Prevent random payment simulation
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders initial pending state with amount and countdown', () => {
    render(<DynamicPaymentQr {...defaultProps} />);
    expect(screen.getByText('10.00 USDC')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();
    expect(screen.getByText(/Expires in/i)).toBeInTheDocument();
  });

  it('drives countdown to zero and asserts expired view and refresh control', () => {
    render(<DynamicPaymentQr {...defaultProps} />);
    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByText('Expired')).toBeInTheDocument();
    const refreshButton = screen.getByRole('button', { name: 'Refresh QR' });
    expect(refreshButton).toBeInTheDocument();
  });

  it('clicks refresh and resets timer back to pending state', () => {
    render(<DynamicPaymentQr {...defaultProps} />);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByText('Expired')).toBeInTheDocument();
    const refreshButton = screen.getByRole('button', { name: 'Refresh QR' });

    fireEvent.click(refreshButton);

    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh QR' })).not.toBeInTheDocument();
  });

  it('renders confirmed/success view when payment is triggered', async () => {
    // Math.random > 0.995 triggers payment confirmation in the polling interval
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const onConfirmed = vi.fn();

    render(<DynamicPaymentQr {...defaultProps} onPaymentConfirmed={onConfirmed} />);

    expect(screen.getByText('Awaiting Payment')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(await screen.findByText('Payment Confirmed!')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(onConfirmed).toHaveBeenCalledTimes(1);

    randomSpy.mockRestore();
  });
});
