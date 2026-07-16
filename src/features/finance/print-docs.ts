import { bdt, num, date, dateTime } from '@/lib/format'
import type { Expense, Requisition, CashIn, FinanceReport } from '@/lib/api/finance'

// ═══════════════════════════════════════════════════════════════
//  Finance PDF generators — Money Receipt, Requisition slip,
//  Month-end Report — Whirlpool Bangladesh official format.
// ═══════════════════════════════════════════════════════════════

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Arial', 'Helvetica', sans-serif; margin: 0; padding: 28px 32px; color: #142032; font-size: 11px; line-height: 1.4; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; border-bottom: 2px solid #eeb111; padding-bottom: 10px; }
  .brand-block { max-width: 60%; }
  .brand-name { font-size: 16px; font-weight: 800; color: #142032; }
  .brand-addr { font-size: 10px; color: #4b5563; margin-top: 2px; line-height: 1.35; }
  .doc-box { border: 2px solid #eeb111; padding: 8px 14px; border-radius: 3px; text-align: center; background: #fffbeb; }
  .doc-box .doc-title { font-size: 14px; font-weight: 800; color: #eeb111; text-transform: uppercase; letter-spacing: 0.05em; }
  .doc-box .doc-no { font-size: 11px; font-weight: 700; color: #142032; font-family: 'Courier New', monospace; margin-top: 2px; }
  .doc-box .doc-date { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .info-box { border: 1px solid #d1d5db; padding: 8px 10px; border-radius: 3px; }
  .info-box h3 { font-size: 9px; text-transform: uppercase; color: #6b7280; margin: 0 0 4px 0; letter-spacing: 0.06em; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 5px; }
  .info-box p { margin: 2px 0; font-size: 11px; }
  .info-box .primary { font-weight: 700; font-size: 12px; }
  .info-box .sub { color: #4b5563; font-size: 10px; }
  .amount-box { border: 2px dashed #eeb111; padding: 14px; text-align: center; margin: 14px 0; background: #fffbeb; }
  .amount-box .lbl { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .amount-box .amt { font-size: 24px; font-weight: 800; color: #142032; margin-top: 4px; font-family: 'Courier New', monospace; }
  .section-title { background: #142032; color: #fff; padding: 4px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #d1d5db; margin-bottom: 14px; }
  .details-col { padding: 8px 12px; }
  .details-col.left { border-right: 1px solid #d1d5db; }
  .details-row { display: flex; padding: 3px 0; font-size: 11px; border-bottom: 1px dotted #e5e7eb; }
  .details-row:last-child { border-bottom: none; }
  .details-row .lbl { width: 120px; color: #6b7280; font-weight: 600; }
  .details-row .val { flex: 1; font-weight: 600; }
  .details-row .val.mono { font-family: 'Courier New', monospace; }
  .notes-box { border: 1px solid #d1d5db; padding: 8px 10px; margin-bottom: 24px; font-size: 10px; color: #4b5563; background: #f9fafb; }
  .notes-box strong { color: #142032; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 60px; }
  .sign-cell { text-align: center; font-size: 10px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .sign-cell .line { border-top: 1px solid #142032; padding-top: 4px; }
  .sign-cell .name { font-size: 11px; color: #142032; font-weight: 700; margin-top: 4px; text-transform: none; }
  .regd-office { border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 20px; font-size: 9px; color: #6b7280; text-align: center; line-height: 1.4; }
  .regd-office strong { color: #142032; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
  table.items thead th { background: #eeb111; color: #142032; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; border: 1px solid #d97706; }
  table.items tbody td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  table.items tbody tr:nth-child(even) td { background: #fafafa; }
  table.items tfoot td { padding: 7px 8px; border: 1px solid #d97706; background: #fef3c7; font-weight: 800; font-size: 12px; }
  .text-right { text-align: right; } .text-center { text-align: center; } .mono { font-family: 'Courier New', monospace; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .summary-card { border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; }
  .summary-card.income { border-color: #10b981; background: #ecfdf5; }
  .summary-card.expense { border-color: #ef4444; background: #fef2f2; }
  .summary-card.balance { border-color: #eeb111; background: #fffbeb; }
  .summary-card .lbl { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.05em; }
  .summary-card .val { font-size: 18px; font-weight: 800; margin-top: 4px; font-family: 'Courier New', monospace; }
  .summary-card.income .val { color: #047857; }
  .summary-card.expense .val { color: #b91c1c; }
  .summary-card.balance .val { color: #142032; }
  @media print { body { padding: 12px 18px; } }
  @page { margin: 12mm; }
`

function openPrintWindow(title: string, content: string) {
  const w = window.open('', '_blank', 'width=820,height=1100')
  if (!w) {
    alert('Please allow pop-ups to print the document.')
    return false
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${BASE_CSS}</style></head><body>${content}</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => { try { w.print() } catch (e) {} }, 400)
  return true
}

// ═══════════════════════════════════════════════════════════════
//  1. MONEY RECEIPT — for each Expense (procurement/other)
// ═══════════════════════════════════════════════════════════════
export function printMoneyReceipt(e: Expense) {
  const isProcurement = e.type === 'procurement'
  const title = isProcurement ? 'Money Receipt (Procurement)' : 'Money Receipt'

  const content = `
    <div class="header">
      <div class="brand-block">
        <div class="brand-name">Whirlpool Bangladesh Limited</div>
        <div class="brand-addr">Central Warehouse,<br>Kanchpur, Madanpur, Narayangonj-1411, Dhaka</div>
      </div>
      <div class="doc-box">
        <div class="doc-title">${title}</div>
        <div class="doc-no">${e.expenseNo}</div>
        <div class="doc-date">${date(e.date)}</div>
      </div>
    </div>

    <div class="amount-box">
      <div class="lbl">Amount Paid</div>
      <div class="amt">${bdt(e.amount)}</div>
    </div>

    <div class="section-title">Payment Details</div>
    <div class="details-grid">
      <div class="details-col left">
        <div class="details-row"><span class="lbl">Paid To</span><span class="val">${e.beneficiary}</span></div>
        <div class="details-row"><span class="lbl">Category</span><span class="val">${e.category}</span></div>
        <div class="details-row"><span class="lbl">Type</span><span class="val" style="text-transform:capitalize">${e.type}</span></div>
        <div class="details-row"><span class="lbl">Payment Mode</span><span class="val" style="text-transform:capitalize">${e.paymentMode}</span></div>
      </div>
      <div class="details-col">
        <div class="details-row"><span class="lbl">Date</span><span class="val">${date(e.date)}</span></div>
        ${e.memoNo ? `<div class="details-row"><span class="lbl">Memo No</span><span class="val mono">${e.memoNo}</span></div>` : ''}
        ${e.memoDate ? `<div class="details-row"><span class="lbl">Memo Date</span><span class="val">${date(e.memoDate)}</span></div>` : ''}
        ${e.billNo ? `<div class="details-row"><span class="lbl">Bill No</span><span class="val mono">${e.billNo}</span></div>` : ''}
        ${e.billDate ? `<div class="details-row"><span class="lbl">Bill Date</span><span class="val">${date(e.billDate)}</span></div>` : ''}
        ${e.paidBy ? `<div class="details-row"><span class="lbl">Paid By</span><span class="val">${e.paidBy}</span></div>` : ''}
      </div>
    </div>

    ${e.notes ? `<div class="notes-box"><strong>Notes:</strong> ${e.notes}</div>` : ''}

    <div class="notes-box">
      <strong>Declaration:</strong> I hereby acknowledge receipt of the above amount from Whirlpool Bangladesh Limited
      in consideration of the goods/services described above. This receipt is issued under my free will and the
      transaction is complete in all respects.
    </div>

    <div class="sign-row">
      <div class="sign-cell">
        <div class="line">Prepared By</div>
        ${e.paidBy ? `<div class="name">${e.paidBy}</div>` : ''}
      </div>
      <div class="sign-cell">
        <div class="line">Receiver's Signature with Seal</div>
        ${e.receiverName ? `<div class="name">${e.receiverName}</div>` : ''}
      </div>
    </div>

    <div class="regd-office">
      <strong>Regd. Office:</strong> Whirlpool Bangladesh Limited - (Wakil Tower) 6th Floor &amp; 8th Floor; TA 131, Gulshan Badda Link Road; Dhaka-1212.
    </div>
  `
  return openPrintWindow(`Money Receipt — ${e.expenseNo}`, content)
}

// ═══════════════════════════════════════════════════════════════
//  2. REQUISITION SLIP — for HO submission
// ═══════════════════════════════════════════════════════════════
export function printRequisitionSlip(r: Requisition) {
  const content = `
    <div class="header">
      <div class="brand-block">
        <div class="brand-name">Whirlpool Bangladesh Limited</div>
        <div class="brand-addr">Central Warehouse,<br>Kanchpur, Madanpur, Narayangonj-1411, Dhaka</div>
      </div>
      <div class="doc-box">
        <div class="doc-title">Cash Requisition</div>
        <div class="doc-no">${r.reqNo}</div>
        <div class="doc-date">${date(r.date)}</div>
      </div>
    </div>

    <div class="amount-box">
      <div class="lbl">Amount Requested</div>
      <div class="amt">${bdt(r.amount)}</div>
    </div>

    <div class="section-title">Requisition Details</div>
    <div class="details-grid">
      <div class="details-col left">
        <div class="details-row"><span class="lbl">Requisition No</span><span class="val mono">${r.reqNo}</span></div>
        <div class="details-row"><span class="lbl">Date</span><span class="val">${date(r.date)}</span></div>
        <div class="details-row"><span class="lbl">Status</span><span class="val" style="text-transform:capitalize">${r.status}</span></div>
      </div>
      <div class="details-col">
        ${r.approvedBy ? `<div class="details-row"><span class="lbl">Approved By</span><span class="val">${r.approvedBy}</span></div>` : ''}
        ${r.approvedAt ? `<div class="details-row"><span class="lbl">Approved At</span><span class="val">${dateTime(r.approvedAt)}</span></div>` : ''}
        ${r.receivedBy ? `<div class="details-row"><span class="lbl">Received By</span><span class="val">${r.receivedBy}</span></div>` : ''}
        ${r.receivedAt ? `<div class="details-row"><span class="lbl">Received At</span><span class="val">${dateTime(r.receivedAt)}</span></div>` : ''}
      </div>
    </div>

    <div class="section-title">Purpose</div>
    <div class="notes-box" style="min-height:60px">${r.purpose}</div>

    ${r.notes ? `<div class="notes-box"><strong>Notes:</strong> ${r.notes}</div>` : ''}

    <div class="notes-box">
      <strong>Source:</strong> Funds to be transferred from Head Office via 3i Logistics to Whirlpool Central Warehouse.
    </div>

    <div class="sign-row">
      <div class="sign-cell">
        <div class="line">Requested By (Warehouse)</div>
      </div>
      <div class="sign-cell">
        <div class="line">Approved By (Head Office)</div>
      </div>
    </div>

    <div class="regd-office">
      <strong>Regd. Office:</strong> Whirlpool Bangladesh Limited - (Wakil Tower) 6th Floor &amp; 8th Floor; TA 131, Gulshan Badda Link Road; Dhaka-1212.
    </div>
  `
  return openPrintWindow(`Requisition — ${r.reqNo}`, content)
}

// ═══════════════════════════════════════════════════════════════
//  3. CASH IN SLIP — for received money
// ═══════════════════════════════════════════════════════════════
export function printCashInSlip(c: CashIn) {
  const content = `
    <div class="header">
      <div class="brand-block">
        <div class="brand-name">Whirlpool Bangladesh Limited</div>
        <div class="brand-addr">Central Warehouse,<br>Kanchpur, Madanpur, Narayangonj-1411, Dhaka</div>
      </div>
      <div class="doc-box">
        <div class="doc-title">Cash In Slip</div>
        <div class="doc-no">${c.cashInNo}</div>
        <div class="doc-date">${date(c.date)}</div>
      </div>
    </div>

    <div class="amount-box">
      <div class="lbl">Amount Received</div>
      <div class="amt">${bdt(c.amount)}</div>
    </div>

    <div class="section-title">Receipt Details</div>
    <div class="details-grid">
      <div class="details-col left">
        <div class="details-row"><span class="lbl">Cash In No</span><span class="val mono">${c.cashInNo}</span></div>
        <div class="details-row"><span class="lbl">Date</span><span class="val">${date(c.date)}</span></div>
        <div class="details-row"><span class="lbl">Source</span><span class="val">${c.source}</span></div>
      </div>
      <div class="details-col">
        ${c.requisition?.reqNo ? `<div class="details-row"><span class="lbl">Requisition</span><span class="val mono">${c.requisition.reqNo}</span></div>` : ''}
        <div class="details-row"><span class="lbl">Received By</span><span class="val">${c.receivedBy}</span></div>
      </div>
    </div>

    ${c.notes ? `<div class="notes-box"><strong>Notes:</strong> ${c.notes}</div>` : ''}

    <div class="notes-box">
      <strong>Acknowledgement:</strong> The above amount has been received in good condition from ${c.source}
      and added to the warehouse cash book. The transaction has been recorded in the system.
    </div>

    <div class="sign-row">
      <div class="sign-cell">
        <div class="line">Received By</div>
        <div class="name">${c.receivedBy}</div>
      </div>
      <div class="sign-cell">
        <div class="line">Authorized By</div>
      </div>
    </div>

    <div class="regd-office">
      <strong>Regd. Office:</strong> Whirlpool Bangladesh Limited - (Wakil Tower) 6th Floor &amp; 8th Floor; TA 131, Gulshan Badda Link Road; Dhaka-1212.
    </div>
  `
  return openPrintWindow(`Cash In — ${c.cashInNo}`, content)
}

// ═══════════════════════════════════════════════════════════════
//  4. MONTH-END REPORT — submitted to HO
// ═══════════════════════════════════════════════════════════════
export function printMonthEndReport(rep: FinanceReport) {
  const monthLabel = new Date(rep.period.start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const expenseRows = rep.expenses.items.map((e, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="mono">${date(e.date)}</td>
      <td class="mono">${e.expenseNo}</td>
      <td>${e.beneficiary}</td>
      <td>${e.category}</td>
      <td style="text-transform:capitalize">${e.type}</td>
      <td style="text-transform:capitalize">${e.paymentMode}</td>
      <td class="text-right">${bdt(e.amount)}</td>
    </tr>
  `).join('')

  const cashInRows = rep.cashIn.items.map((c, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td class="mono">${date(c.date)}</td>
      <td class="mono">${c.cashInNo}</td>
      <td>${c.source}</td>
      <td>${c.requisition?.reqNo || '—'}</td>
      <td>${c.receivedBy}</td>
      <td class="text-right">${bdt(c.amount)}</td>
    </tr>
  `).join('')

  const categoryRows = Object.entries(rep.expenses.byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, info]) => `
      <tr>
        <td>${cat}</td>
        <td class="text-center">${info.count}</td>
        <td class="text-right">${bdt(info.total)}</td>
        <td class="text-right">${((info.total / rep.expenses.total) * 100).toFixed(1)}%</td>
      </tr>
    `).join('')

  const content = `
    <div class="header">
      <div class="brand-block">
        <div class="brand-name">Whirlpool Bangladesh Limited</div>
        <div class="brand-addr">Central Warehouse,<br>Kanchpur, Madanpur, Narayangonj-1411, Dhaka</div>
      </div>
      <div class="doc-box">
        <div class="doc-title">Month-End Report</div>
        <div class="doc-no">${rep.month}</div>
        <div class="doc-date">${monthLabel}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card income">
        <div class="lbl">Total Cash In</div>
        <div class="val">${bdt(rep.cashIn.total)}</div>
      </div>
      <div class="summary-card expense">
        <div class="lbl">Total Expenses</div>
        <div class="val">${bdt(rep.expenses.total)}</div>
      </div>
      <div class="summary-card balance">
        <div class="lbl">Closing Balance</div>
        <div class="val">${bdt(rep.closingBalance)}</div>
      </div>
    </div>

    <div class="details-grid">
      <div class="details-col left">
        <div class="details-row"><span class="lbl">Opening Balance</span><span class="val mono">${bdt(rep.openingBalance)}</span></div>
        <div class="details-row"><span class="lbl">Cash In (${rep.cashIn.count})</span><span class="val mono" style="color:#047857">+ ${bdt(rep.cashIn.total)}</span></div>
        <div class="details-row"><span class="lbl">Expenses (${rep.expenses.count})</span><span class="val mono" style="color:#b91c1c">- ${bdt(rep.expenses.total)}</span></div>
      </div>
      <div class="details-col">
        <div class="details-row"><span class="lbl">Closing Balance</span><span class="val mono" style="font-size:13px">${bdt(rep.closingBalance)}</span></div>
        <div class="details-row"><span class="lbl">Requisitions</span><span class="val">${rep.requisitions.total} (${bdt(rep.requisitions.totalAmount)})</span></div>
        <div class="details-row"><span class="lbl">Pending Requisitions</span><span class="val">${rep.requisitions.pending}</span></div>
      </div>
    </div>

    <div class="section-title">Cash In Details (${rep.cashIn.count})</div>
    <table class="items">
      <thead><tr>
        <th class="text-center" style="width:30px">SL</th>
        <th style="width:80px">Date</th>
        <th style="width:110px">Cash In No</th>
        <th>Source</th>
        <th style="width:100px">Requisition</th>
        <th>Received By</th>
        <th class="text-right" style="width:100px">Amount</th>
      </tr></thead>
      <tbody>${cashInRows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:14px">No cash in this month</td></tr>'}</tbody>
      <tfoot>
        <tr><td colspan="6" class="text-right">Total Cash In =</td><td class="text-right">${bdt(rep.cashIn.total)}</td></tr>
      </tfoot>
    </table>

    <div class="section-title">Expense Details (${rep.expenses.count})</div>
    <table class="items">
      <thead><tr>
        <th class="text-center" style="width:30px">SL</th>
        <th style="width:80px">Date</th>
        <th style="width:110px">Expense No</th>
        <th>Beneficiary</th>
        <th style="width:100px">Category</th>
        <th style="width:80px">Type</th>
        <th style="width:80px">Mode</th>
        <th class="text-right" style="width:100px">Amount</th>
      </tr></thead>
      <tbody>${expenseRows || '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:14px">No expenses this month</td></tr>'}</tbody>
      <tfoot>
        <tr><td colspan="7" class="text-right">Total Expenses =</td><td class="text-right">${bdt(rep.expenses.total)}</td></tr>
      </tfoot>
    </table>

    ${Object.keys(rep.expenses.byCategory).length > 0 ? `
      <div class="section-title">Category Breakdown</div>
      <table class="items">
        <thead><tr>
          <th>Category</th>
          <th class="text-center" style="width:80px">Count</th>
          <th class="text-right" style="width:120px">Total</th>
          <th class="text-right" style="width:80px">%</th>
        </tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    ` : ''}

    <div class="sign-row">
      <div class="sign-cell">
        <div class="line">Prepared By (Warehouse)</div>
      </div>
      <div class="sign-cell">
        <div class="line">Submitted To (Head Office)</div>
      </div>
    </div>

    <div class="regd-office">
      <strong>Regd. Office:</strong> Whirlpool Bangladesh Limited - (Wakil Tower) 6th Floor &amp; 8th Floor; TA 131, Gulshan Badda Link Road; Dhaka-1212.
    </div>
  `
  return openPrintWindow(`Month-End Report — ${monthLabel}`, content)
}
