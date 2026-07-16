import { api } from './client'

// ═══════════════════════════════════════════════════════════════
//  Finance API client — requisitions, cash in, expenses, report
// ═══════════════════════════════════════════════════════════════

export interface Requisition {
  id: string
  reqNo: string
  date: string
  amount: number
  purpose: string
  status: 'pending' | 'approved' | 'received' | 'rejected'
  approvedBy: string | null
  approvedAt: string | null
  receivedBy: string | null
  receivedAt: string | null
  notes: string | null
  createdAt: string
  cashIns?: { id: string; cashInNo: string; amount: number; date: string }[]
}

export interface CashIn {
  id: string
  cashInNo: string
  date: string
  amount: number
  source: string
  requisitionId: string | null
  receivedBy: string
  notes: string | null
  createdAt: string
  requisition?: { reqNo: string; amount: number } | null
}

export interface Expense {
  id: string
  expenseNo: string
  date: string
  type: 'procurement' | 'other'
  category: string
  beneficiary: string
  amount: number
  paymentMode: 'cash' | 'bank' | 'bkash' | 'nagad' | 'cheque'
  memoNo: string | null
  memoDate: string | null
  billNo: string | null
  billDate: string | null
  receiverName: string | null
  paidBy: string | null
  notes: string | null
  createdAt: string
}

export interface FinanceReport {
  month: string
  period: { start: string; end: string }
  openingBalance: number
  cashIn: { total: number; count: number; items: CashIn[] }
  expenses: {
    total: number
    count: number
    items: Expense[]
    byCategory: Record<string, { count: number; total: number }>
    byType: Record<string, { count: number; total: number }>
  }
  closingBalance: number
  requisitions: {
    total: number
    pending: number
    approved: number
    received: number
    totalAmount: number
    items: Requisition[]
  }
}

export const requisitionsApi = {
  list: (opts?: { status?: string; month?: string }) => {
    const params = new URLSearchParams()
    if (opts?.status) params.set('status', opts.status)
    if (opts?.month) params.set('month', opts.month)
    const q = params.toString()
    return api.get<Requisition[]>(`/api/finance/requisitions${q ? `?${q}` : ''}`)
  },
  create: (input: {
    date?: string; amount: number; purpose: string; notes?: string; userName?: string
  }) => api.post<Requisition>('/api/finance/requisitions', input),
  update: (id: string, body: Partial<{
    status: string; purpose: string; amount: number; notes: string
    approvedBy: string; receivedBy: string; userName: string
  }>) => api.patch<Requisition>(`/api/finance/requisitions/${id}`, body),
  delete: (id: string) => api.delete<{ ok: boolean }>(`/api/finance/requisitions/${id}`),
}

export const cashInApi = {
  list: (opts?: { month?: string }) => {
    const params = new URLSearchParams()
    if (opts?.month) params.set('month', opts.month)
    const q = params.toString()
    return api.get<CashIn[]>(`/api/finance/cash-in${q ? `?${q}` : ''}`)
  },
  create: (input: {
    date?: string; amount: number; source?: string; requisitionId?: string
    receivedBy: string; notes?: string
  }) => api.post<CashIn>('/api/finance/cash-in', input),
  update: (id: string, body: Partial<{
    amount: number; source: string; receivedBy: string; notes: string; date: string
  }>) => api.patch<CashIn>(`/api/finance/cash-in/${id}`, body),
  delete: (id: string) => api.delete<{ ok: boolean }>(`/api/finance/cash-in/${id}`),
}

export const expensesApi = {
  list: (opts?: { type?: string; category?: string; month?: string }) => {
    const params = new URLSearchParams()
    if (opts?.type) params.set('type', opts.type)
    if (opts?.category) params.set('category', opts.category)
    if (opts?.month) params.set('month', opts.month)
    const q = params.toString()
    return api.get<Expense[]>(`/api/finance/expenses${q ? `?${q}` : ''}`)
  },
  create: (input: {
    date?: string; type?: string; category: string; beneficiary: string
    amount: number; paymentMode?: string; memoNo?: string; memoDate?: string
    billNo?: string; billDate?: string; receiverName?: string; paidBy?: string; notes?: string
  }) => api.post<Expense>('/api/finance/expenses', input),
  update: (id: string, body: Partial<any>) => api.patch<Expense>(`/api/finance/expenses/${id}`, body),
  delete: (id: string) => api.delete<{ ok: boolean }>(`/api/finance/expenses/${id}`),
}

export const financeReportApi = {
  get: (month?: string) => {
    const m = month || (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })()
    return api.get<FinanceReport>(`/api/finance/report?month=${m}`)
  },
}
