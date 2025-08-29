import { StateCreator } from 'zustand';

export interface FeeInvoice {
  id: string;
  amount: number;
  dueDate: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface FeePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string;
}

export interface FeesSlice {
  invoices: FeeInvoice[];
  payments: FeePayment[];
  totalPaid: number;
  totalPending: number;
  setInvoices: (invoices: FeeInvoice[]) => void;
  setPayments: (payments: FeePayment[]) => void;
  updateTotals: () => void;
}

export const createFeesSlice: StateCreator<FeesSlice> = (set, get) => ({
  invoices: [],
  payments: [],
  totalPaid: 0,
  totalPending: 0,
  setInvoices: (invoices) => {
    set({ invoices });
    get().updateTotals();
  },
  setPayments: (payments) => {
    set({ payments });
    get().updateTotals();
  },
  updateTotals: () => {
    const { invoices, payments } = get();
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPending = invoices
      .filter(invoice => invoice.status === 'pending')
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    set({ totalPaid, totalPending });
  },
});