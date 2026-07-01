export type ParsedInvoice = {
  brand: string;
  invoiceType: string; // 'Factura', 'Nota de Crédito', etc.
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  originalAmount: number;
  paymentAmount: number;
  creditNoteAmount: number;
  balanceAmount: number;
  lastPaymentDate?: string;
  mora?: number;
  observations?: string;
  vendorCode?: string;
  internalCode?: string;
  internalIndicator?: string;
};

export type ParsedClient = {
  code: string;
  name: string;
  dni?: string;
  cuitCuil?: string;
  identifier?: string;
  locality: string;
  address: string;
  invoices: ParsedInvoice[];
};

export type ParseResult = {
  success: boolean;
  brandDetected?: string;
  clients?: ParsedClient[];
  error?: string;
  rawRowsRead?: number;
  discardedLines?: { line: number; content: string; reason: string }[];
};
