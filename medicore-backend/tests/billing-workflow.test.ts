import { describe, expect, it } from 'vitest';
import {
  calculateInvoiceTotals,
  calculateLineTotal,
  canAcceptPayment,
  canIssueInvoice,
  canRefundPayment,
  canVoidInvoice,
  decimal,
  getInvoiceStatusAfterPayment,
} from '../src/modules/billing/billing.rules';

describe('billing invoice calculations', () => {
  it('calculates line totals using decimal arithmetic', () => {
    expect(calculateLineTotal(3, 19.99).toFixed(2)).toBe('59.97');
  });

  it('calculates subtotal, discount, tax and final balance', () => {
    const result = calculateInvoiceTotals(
      [
        { itemType: 'CONSULTATION', description: 'Consultation', quantity: 2, unitPrice: 100 },
        { itemType: 'SERVICE', description: 'Procedure', quantity: 1, unitPrice: 50 },
      ],
      20,
      10,
    );

    expect(result.subtotal.toFixed(2)).toBe('250.00');
    expect(result.discountAmount.toFixed(2)).toBe('20.00');
    expect(result.taxAmount.toFixed(2)).toBe('10.00');
    expect(result.totalAmount.toFixed(2)).toBe('240.00');
    expect(result.balanceAmount.toFixed(2)).toBe('240.00');
    expect(result.paidAmount.toFixed(2)).toBe('0.00');
  });

  it('rejects discounts greater than the subtotal', () => {
    expect(() => calculateInvoiceTotals(
      [{ itemType: 'SERVICE', description: 'Service', quantity: 1, unitPrice: 100 }],
      101,
      0,
    )).toThrow('Discount cannot exceed invoice subtotal');
  });

  it('keeps decimal calculations precise', () => {
    const result = calculateInvoiceTotals(
      [
        { itemType: 'SERVICE', description: 'A', quantity: 3, unitPrice: 0.1 },
        { itemType: 'SERVICE', description: 'B', quantity: 3, unitPrice: 0.2 },
      ],
      0,
      0,
    );

    expect(result.subtotal.toFixed(2)).toBe('0.90');
  });
});

describe('billing invoice workflow', () => {
  it('allows issuing drafts only', () => {
    expect(canIssueInvoice('DRAFT')).toBe(true);
    expect(canIssueInvoice('ISSUED')).toBe(false);
    expect(canIssueInvoice('PAID')).toBe(false);
    expect(canIssueInvoice('VOIDED')).toBe(false);
  });

  it('allows voiding only unpaid draft or issued invoices', () => {
    expect(canVoidInvoice('DRAFT', decimal(0))).toBe(true);
    expect(canVoidInvoice('ISSUED', decimal(0))).toBe(true);
    expect(canVoidInvoice('ISSUED', decimal(10))).toBe(false);
    expect(canVoidInvoice('PAID', decimal(0))).toBe(false);
    expect(canVoidInvoice('VOIDED', decimal(0))).toBe(false);
  });

  it('accepts payments only for issued or partially paid invoices', () => {
    expect(canAcceptPayment('ISSUED')).toBe(true);
    expect(canAcceptPayment('PARTIALLY_PAID')).toBe(true);
    expect(canAcceptPayment('DRAFT')).toBe(false);
    expect(canAcceptPayment('PAID')).toBe(false);
    expect(canAcceptPayment('VOIDED')).toBe(false);
  });

  it('calculates invoice status after payments', () => {
    expect(getInvoiceStatusAfterPayment(decimal(0), decimal(100))).toBe('ISSUED');
    expect(getInvoiceStatusAfterPayment(decimal(40), decimal(100))).toBe('PARTIALLY_PAID');
    expect(getInvoiceStatusAfterPayment(decimal(100), decimal(100))).toBe('PAID');
    expect(getInvoiceStatusAfterPayment(decimal(120), decimal(100))).toBe('PAID');
  });
});

describe('billing refund rules', () => {
  it('allows a partial refund within the remaining refundable amount', () => {
    expect(canRefundPayment(decimal(100), decimal(0), decimal(40))).toBe(true);
    expect(canRefundPayment(decimal(100), decimal(40), decimal(60))).toBe(true);
  });

  it('rejects refunds exceeding the remaining refundable amount', () => {
    expect(canRefundPayment(decimal(100), decimal(40), decimal(61))).toBe(false);
    expect(canRefundPayment(decimal(100), decimal(100), decimal(1))).toBe(false);
  });

  it('rejects zero and negative refunds', () => {
    expect(canRefundPayment(decimal(100), decimal(0), decimal(0))).toBe(false);
    expect(canRefundPayment(decimal(100), decimal(0), decimal(-10))).toBe(false);
  });
});