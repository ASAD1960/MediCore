import { InvoiceStatus, Prisma } from '@prisma/client';

export interface BillingLineInput {
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function decimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

export function money(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
): Prisma.Decimal {
  return money(decimal(quantity).mul(decimal(unitPrice)));
}

export function calculateInvoiceTotals(
  items: BillingLineInput[],
  discountAmount: number,
  taxAmount: number,
) {
  const lines = items.map((item) => ({
    ...item,
    unitPrice: money(decimal(item.unitPrice)),
    lineTotal: calculateLineTotal(item.quantity, item.unitPrice),
  }));

  const subtotal = money(
    lines.reduce(
      (sum, item) => sum.add(item.lineTotal),
      decimal(0),
    ),
  );

  const discount = money(decimal(discountAmount));
  const tax = money(decimal(taxAmount));

  if (discount.greaterThan(subtotal)) {
    throw new Error('Discount cannot exceed invoice subtotal');
  }

  const total = money(subtotal.sub(discount).add(tax));

  return {
    lines,
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    totalAmount: total,
    paidAmount: decimal(0),
    balanceAmount: total,
  };
}

export function getInvoiceStatusAfterPayment(
  paidAmount: Prisma.Decimal,
  totalAmount: Prisma.Decimal,
): InvoiceStatus {
  if (paidAmount.greaterThanOrEqualTo(totalAmount)) {
    return 'PAID';
  }

  if (paidAmount.greaterThan(0)) {
    return 'PARTIALLY_PAID';
  }

  return 'ISSUED';
}

export function canIssueInvoice(status: InvoiceStatus): boolean {
  return status === 'DRAFT';
}

export function canVoidInvoice(
  status: InvoiceStatus,
  paidAmount: Prisma.Decimal,
): boolean {
  return (
    (status === 'DRAFT' || status === 'ISSUED') &&
    paidAmount.isZero()
  );
}

export function canAcceptPayment(status: InvoiceStatus): boolean {
  return status === 'ISSUED' || status === 'PARTIALLY_PAID';
}

export function canRefundPayment(
  paymentAmount: Prisma.Decimal,
  alreadyRefunded: Prisma.Decimal,
  refundAmount: Prisma.Decimal,
): boolean {
  return (
    refundAmount.greaterThan(0) &&
    alreadyRefunded.add(refundAmount).lessThanOrEqualTo(paymentAmount)
  );
}