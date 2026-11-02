import { Sale } from '../models/sales.models';
import { ExportTable } from './export';

/** Column layout shared by every sales-transaction export. */
export const salesExportTable = (sales: Sale[]): ExportTable => ({
  headers: [
    'Invoice No.', 'Sale Date', 'Customer', 'Email', 'Phone', 'Product', 'Category',
    'Quantity', 'Unit Price', 'Discount', 'Total Amount', 'Payment Method', 'Status', 'Notes',
  ],
  rows: sales.map((s) => [
    s.invoiceNumber, s.saleDate.slice(0, 10), s.customerName, s.customerEmail, s.customerPhone,
    s.productName, s.category, s.quantity, s.unitPrice, s.discount || 0, s.totalAmount,
    s.paymentMethod, s.status, s.notes ?? '',
  ]),
});
