'use client';

// Checkout dialog with Lightning and Strike payment options
//
// For MVP: Lightning renders bolt11 as copyable text + lightning: URI link.
// Strike renders as a redirect button.
// Polls for payment confirmation automatically.

import { useState, useCallback, useEffect, useRef } from 'react';
import { startCheckout, confirmPayment } from '@/lib/api';

interface CheckoutDialogProps {
  listingId: string;
  listingTitle: string;
  priceSats: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (downloadToken: string) => void;
}

type CheckoutState =
  | { step: 'choose' }
  | { step: 'paying'; method: 'lightning'; invoice: string; paymentHash: string }
  | { step: 'paying'; method: 'strike'; paymentUrl: string; paymentId: string }
  | { step: 'confirming' }
  | { step: 'error'; message: string };

export function CheckoutDialog({
  listingId,
  listingTitle,
  priceSats,
  isOpen,
  onClose,
  onSuccess,
}: CheckoutDialogProps) {
  const [state, setState] = useState<CheckoutState>({ step: 'choose' });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setState({ step: 'choose' });
    onClose();
  }, [onClose]);

  const handleChoose = useCallback(
    async (method: 'lightning' | 'strike') => {
      try {
        const resp = await startCheckout(listingId, method);

        if (method === 'lightning' && resp.invoice && resp.paymentHash) {
          setState({
            step: 'paying',
            method: 'lightning',
            invoice: resp.invoice,
            paymentHash: resp.paymentHash,
          });

          // Start polling for payment
          pollingRef.current = setInterval(async () => {
            try {
              const confirmation = await confirmPayment(
                listingId,
                resp.paymentHash!,
              );
              if (pollingRef.current) clearInterval(pollingRef.current);
              onSuccess(confirmation.downloadToken);
            } catch {
              // Payment not yet confirmed, keep polling
            }
          }, 3000);
        } else if (method === 'strike' && resp.strikePaymentUrl) {
          setState({
            step: 'paying',
            method: 'strike',
            paymentUrl: resp.strikePaymentUrl,
            paymentId: resp.strikePaymentId ?? '',
          });
        } else {
          setState({ step: 'error', message: 'Unexpected checkout response' });
        }
      } catch (err) {
        setState({
          step: 'error',
          message: err instanceof Error ? err.message : 'Checkout failed',
        });
      }
    },
    [listingId, onSuccess],
  );

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API may not be available
    }
  }, []);

  const handleManualConfirm = useCallback(async () => {
    if (state.step !== 'paying' || state.method !== 'lightning') return;
    setState({ step: 'confirming' });
    try {
      const confirmation = await confirmPayment(listingId, state.paymentHash);
      if (pollingRef.current) clearInterval(pollingRef.current);
      onSuccess(confirmation.downloadToken);
    } catch (err) {
      setState({
        step: 'error',
        message: err instanceof Error ? err.message : 'Payment not yet confirmed',
      });
    }
  }, [state, listingId, onSuccess]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: '#111827',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
              Checkout
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '4px' }}>
              {listingTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '1.5rem',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            x
          </button>
        </div>

        {/* Price */}
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            background: '#0a0e17',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
            {priceSats.toLocaleString()} sats
          </span>
        </div>

        {/* Step: Choose payment method */}
        {state.step === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={() => handleChoose('lightning')}
              style={{
                padding: '14px',
                background: '#1e293b',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#374151')}
            >
              <span style={{ fontSize: '1.2rem' }}>&#9889;</span>
              Pay with Lightning
            </button>
            <button
              type="button"
              onClick={() => handleChoose('strike')}
              style={{
                padding: '14px',
                background: '#1e293b',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#374151')}
            >
              <span style={{ fontSize: '1.2rem' }}>$</span>
              Pay with Strike
            </button>
          </div>
        )}

        {/* Step: Lightning payment */}
        {state.step === 'paying' && state.method === 'lightning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center' }}>
              Copy the invoice below and pay with any Lightning wallet.
            </p>

            {/* Invoice text */}
            <div
              style={{
                background: '#0a0e17',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                wordBreak: 'break-all',
                fontSize: '0.75rem',
                color: '#e5e7eb',
                fontFamily: 'monospace',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              {state.invoice}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleCopy(state.invoice)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Copy Invoice
              </button>
              <a
                href={`lightning:${state.invoice}`}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#6366f1',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                Open Wallet
              </a>
            </div>

            {/* Polling indicator */}
            <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
              Waiting for payment confirmation...
            </p>

            {/* Manual confirm */}
            <button
              type="button"
              onClick={handleManualConfirm}
              style={{
                padding: '10px',
                background: 'none',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              I&apos;ve paid — check now
            </button>
          </div>
        )}

        {/* Step: Strike payment */}
        {state.step === 'paying' && state.method === 'strike' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              You will be redirected to Strike to complete payment.
            </p>
            <a
              href={state.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '14px 24px',
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'block',
              }}
            >
              Continue to Strike
            </a>
          </div>
        )}

        {/* Step: Confirming */}
        {state.step === 'confirming' && (
          <p style={{ textAlign: 'center', color: '#9ca3af' }}>
            Checking payment status...
          </p>
        )}

        {/* Step: Error */}
        {state.step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>{state.message}</p>
            <button
              type="button"
              onClick={() => setState({ step: 'choose' })}
              style={{
                padding: '10px 20px',
                background: '#1e293b',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
