import { bdt, num, date, dateTime } from '@/lib/format'
import type { SalesOrder, Dispatch } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  PDF generators — Delivery Challan & Gate Pass
//  Matches Whirlpool Bangladesh official delivery challan format.
// ═══════════════════════════════════════════════════════════════

const BRAND_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Arial', 'Helvetica', sans-serif;
    margin: 0;
    padding: 28px 32px;
    color: #142032;
    font-size: 11px;
    line-height: 1.4;
  }
  /* ── HEADER ─────────────────────────────────────── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .brand-block { max-width: 60%; }
  .brand-name {
    font-size: 16px;
    font-weight: 800;
    color: #142032;
    letter-spacing: -0.01em;
  }
  .brand-addr {
    font-size: 10px;
    color: #4b5563;
    margin-top: 2px;
    line-height: 1.35;
  }
  .brand-logo {
    text-align: right;
  }
  .brand-logo .logo-text {
    font-size: 18px;
    font-weight: 800;
    color: #eeb111;
    letter-spacing: -0.02em;
  }
  .brand-logo .challan-no {
    font-size: 22px;
    font-weight: 800;
    color: #142032;
    font-family: 'Courier New', monospace;
    margin-top: 4px;
    letter-spacing: 0.05em;
  }
  /* ── BODY (3-column-ish flex) ─────────────────── */
  .body-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  .info-box {
    border: 1px solid #d1d5db;
    padding: 8px 10px;
    border-radius: 3px;
    min-height: 100px;
  }
  .info-box h3 {
    font-size: 9px;
    text-transform: uppercase;
    color: #6b7280;
    margin: 0 0 4px 0;
    letter-spacing: 0.06em;
    font-weight: 700;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
    margin-bottom: 5px;
  }
  .info-box p { margin: 2px 0; font-size: 11px; }
  .info-box .primary { font-weight: 700; font-size: 12px; }
  .info-box .sub { color: #4b5563; font-size: 10px; }
  /* Right column: Delivery Challan box */
  .doc-meta {
    border: 2px solid #eeb111;
    padding: 10px 12px;
    border-radius: 3px;
    background: #fffbeb;
  }
  .doc-meta .doc-title {
    font-size: 14px;
    font-weight: 800;
    color: #eeb111;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #fcd34d;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .doc-meta .meta-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 10px;
  }
  .doc-meta .meta-row .label { color: #6b7280; font-weight: 600; }
  .doc-meta .meta-row .value { font-weight: 700; }
  /* ── DISPATCH DETAILS ─────────────────────────── */
  .section-title {
    background: #142032;
    color: #fff;
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .dispatch-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #d1d5db;
    margin-bottom: 14px;
  }
  .dispatch-col {
    padding: 8px 12px;
  }
  .dispatch-col.left {
    border-right: 1px solid #d1d5db;
  }
  .dispatch-row {
    display: flex;
    padding: 3px 0;
    font-size: 11px;
    border-bottom: 1px dotted #e5e7eb;
  }
  .dispatch-row:last-child { border-bottom: none; }
  .dispatch-row .lbl {
    width: 110px;
    color: #6b7280;
    font-weight: 600;
  }
  .dispatch-row .val {
    flex: 1;
    font-weight: 600;
  }
  .dispatch-row .val.mono { font-family: 'Courier New', monospace; }
  /* ── ITEMS TABLE ─────────────────────────────── */
  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 11px;
  }
  table.items thead th {
    background: #eeb111;
    color: #142032;
    padding: 6px 8px;
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    border: 1px solid #d97706;
  }
  table.items tbody td {
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    vertical-align: top;
  }
  table.items tbody tr:nth-child(even) td {
    background: #fafafa;
  }
  table.items tfoot td {
    padding: 7px 8px;
    border: 1px solid #d97706;
    background: #fef3c7;
    font-weight: 800;
    font-size: 12px;
  }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .mono { font-family: 'Courier New', monospace; }
  /* ── FOOTER ─────────────────────────────────── */
  .notes-box {
    border: 1px solid #d1d5db;
    padding: 8px 10px;
    margin-bottom: 24px;
    font-size: 10px;
    color: #4b5563;
    background: #f9fafb;
  }
  .notes-box strong { color: #142032; }
  .signature-area {
    margin-top: 30px;
    margin-bottom: 24px;
  }
  .receiver-sign {
    text-align: right;
    margin-bottom: 30px;
    font-size: 11px;
    font-style: italic;
    color: #4b5563;
  }
  .sign-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    margin-top: 60px;
  }
  .sign-cell {
    text-align: center;
    font-size: 10px;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .sign-cell .line {
    border-top: 1px solid #142032;
    padding-top: 4px;
    margin-top: 0;
  }
  .regd-office {
    border-top: 1px solid #d1d5db;
    padding-top: 8px;
    margin-top: 20px;
    font-size: 9px;
    color: #6b7280;
    text-align: center;
    line-height: 1.4;
  }
  .regd-office strong { color: #142032; }
  @media print {
    body { padding: 12px 18px; }
    .no-print { display: none; }
  }
  @page { margin: 12mm; }
`

function openPrintWindow(title: string, css: string, content: string) {
  const w = window.open('', '_blank', 'width=820,height=1100')
  if (!w) {
    alert('Please allow pop-ups to print the document.')
    return false
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${content}</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => {
    try { w.print() } catch (e) {}
  }, 400)
  return true
}

// ─── Helper: format dispatch time ─────────────────────────────
function dispatchTime(d: any): string {
  if (!d?.dispatchedAt) return '—'
  try {
    const dt = new Date(d.dispatchedAt)
    return dt.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch {
    return '—'
  }
}

// ─── Helper: get Transport Vendor name (stored in notes or via lookup) ──
// The dispatch object may have transportVendorName passed via notes convention:
//   notes = "vendor:Polash Transport|lock:562909"
// Or the dialog may have set courierName (for courier) — for transport, we
// piggyback on notes since the schema doesn't have a dedicated field yet.
function parseTransportMeta(d: any): { vendor?: string; lockNo?: string } {
  if (!d?.notes) return {}
  const out: any = {}
  const parts = d.notes.split('|')
  for (const p of parts) {
    const [k, v] = p.split(':')
    if (k?.trim() === 'vendor') out.vendor = v?.trim()
    if (k?.trim() === 'lock') out.lockNo = v?.trim()
  }
  return out
}

// ─── Delivery Challan ────────────────────────────────────────────
export function printDeliveryChallan(so: SalesOrder, dispatch: Dispatch) {
  const isTransport = dispatch.deliveryMethod === 'transport'
  const meta = parseTransportMeta(dispatch)
  const transportVendor = meta.vendor || '—'
  const lockNo = meta.lockNo || '—'

  const rows = (dispatch.items || []).map((it: any, i: number) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${it.product?.name || '—'}</td>
      <td class="mono text-center">${it.product?.sku || '—'}</td>
      <td>${it.product?.category || '—'}</td>
      <td class="text-right">${num(it.quantity)}</td>
      <td class="text-center">${it.product?.unit || 'PCS'}</td>
      <td></td>
    </tr>
  `).join('')

  const customer = so.customer as any
  const content = `
    <!-- HEADER -->
    <div class="header">
      <div class="brand-block">
        <div class="brand-name">Whirlpool Bangladesh Limited</div>
        <div class="brand-addr">
          Central Warehouse,<br>
          Kanchpur, Madanpur, Narayangonj-1411, Dhaka
        </div>
      </div>
      <div class="brand-logo">
        <div class="logo-text">Whirlpool</div>
        <div class="challan-no">${dispatch.challanNo || dispatch.dispatchNo}</div>
      </div>
    </div>

    <!-- BODY: BILL TO | SHIP TO | DELIVERY CHALLAN META -->
    <div class="body-grid">
      <div class="info-box">
        <h3>Bill To</h3>
        <p class="primary">${customer?.name || '—'}</p>
        <p class="sub">${customer?.code || ''}</p>
        <p class="sub">${customer?.email || ''}</p>
        <p class="sub">${customer?.phone || ''}</p>
      </div>
      <div class="info-box">
        <h3>Ship To</h3>
        <p class="primary">${customer?.name || '—'}</p>
        <p class="sub">${customer?.address || '—'}</p>
        <p class="sub">${customer?.city || ''}${customer?.phone ? ' · ' + customer.phone : ''}</p>
      </div>
      <div class="doc-meta">
        <div class="doc-title">Delivery Challan</div>
        <div class="meta-row"><span class="label">Date</span><span class="value">${date(dispatch.dispatchedAt)}</span></div>
        <div class="meta-row"><span class="label">PO No</span><span class="value">${so.notes?.match(/PO:\s*([^|]+)/i)?.[1]?.trim() || '(Project Sales)'}</span></div>
        <div class="meta-row"><span class="label">Invoice No</span><span class="value mono">${so.sapInvoiceRef || '—'}</span></div>
        <div class="meta-row"><span class="label">Dispatch Time</span><span class="value">${dispatchTime(dispatch)}</span></div>
        <div class="meta-row"><span class="label">Delivery Mode</span><span class="value" style="text-transform:capitalize">${dispatch.deliveryMethod}</span></div>
      </div>
    </div>

    <!-- DISPATCH DETAILS -->
    <div class="section-title">Dispatch Details</div>
    <div class="dispatch-grid">
      <div class="dispatch-col left">
        ${isTransport ? `
          <div class="dispatch-row"><span class="lbl">Vehicle No</span><span class="val mono">${dispatch.vehicleNo || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Driver</span><span class="val">${dispatch.driverName || '—'}${dispatch.driverPhone ? ' | ' + dispatch.driverPhone : ''}</span></div>
          <div class="dispatch-row"><span class="lbl">Lock No</span><span class="val mono">${lockNo}</span></div>
        ` : `
          <div class="dispatch-row"><span class="lbl">Courier</span><span class="val">${dispatch.courierName || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Tracking No</span><span class="val mono">${dispatch.trackingNumber || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Lock No</span><span class="val mono">${lockNo}</span></div>
        `}
      </div>
      <div class="dispatch-col">
        ${isTransport ? `
          <div class="dispatch-row"><span class="lbl">Transport Vendor</span><span class="val">${transportVendor}</span></div>
          <div class="dispatch-row"><span class="lbl">Prepared By</span><span class="val">${dispatch.dispatchedBy || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Challan No</span><span class="val mono">${dispatch.challanNo || dispatch.dispatchNo}</span></div>
        ` : `
          <div class="dispatch-row"><span class="lbl">Prepared By</span><span class="val">${dispatch.dispatchedBy || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Challan No</span><span class="val mono">${dispatch.challanNo || dispatch.dispatchNo}</span></div>
          <div class="dispatch-row"><span class="lbl">Dispatch No</span><span class="val mono">${dispatch.dispatchNo}</span></div>
        `}
      </div>
    </div>

    <!-- ITEMS DISPATCHED -->
    <div class="section-title">Items Dispatched</div>
    <table class="items">
      <thead>
        <tr>
          <th class="text-center" style="width:36px">SL</th>
          <th>Description</th>
          <th class="text-center" style="width:100px">Material Code</th>
          <th style="width:100px">Category</th>
          <th class="text-right" style="width:50px">Qty</th>
          <th class="text-center" style="width:50px">Unit</th>
          <th style="width:120px">Remarks</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="text-right">Total Qty =</td>
          <td class="text-right">${num(dispatch.totalQty)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>

    <!-- NOTES -->
    <div class="notes-box">
      <strong>Notes:</strong> Acknowledgement receipt of Goods: Goods received in following described order and condition
      ${dispatch.notes && !dispatch.notes.includes('vendor:') ? '<br><strong>Dispatch Notes:</strong> ' + dispatch.notes : ''}
    </div>

    <!-- SIGNATURE -->
    <div class="signature-area">
      <div class="receiver-sign">Receiver Sign with Seal &amp; Date..</div>
      <div class="sign-row">
        <div class="sign-cell"><div class="line">Security</div></div>
        <div class="sign-cell"><div class="line">Authorised By</div></div>
      </div>
    </div>

    <!-- REGD OFFICE -->
    <div class="regd-office">
      <strong>Regd. Office:</strong> Whirlpool Bangladesh Limited - (Wakil Tower) 6th Floor &amp; 8th Floor; TA 131, Gulshan Badda Link Road; Dhaka-1212.
    </div>
  `
  return openPrintWindow(`Delivery Challan — ${dispatch.challanNo || dispatch.dispatchNo}`, BRAND_CSS, content)
}

// ─── Gate Pass ──────────────────────────────────────────────────
const GATE_PASS_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Arial', 'Helvetica', sans-serif;
    margin: 0;
    padding: 28px 32px;
    color: #142032;
    font-size: 11px;
    line-height: 1.4;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .brand-block { max-width: 60%; }
  .brand-name { font-size: 16px; font-weight: 800; color: #142032; }
  .brand-addr { font-size: 10px; color: #4b5563; margin-top: 2px; line-height: 1.35; }
  .gp-box {
    border: 3px solid #dc2626;
    padding: 10px 14px;
    border-radius: 4px;
    text-align: center;
    background: #fef2f2;
  }
  .gp-box .gp-title {
    font-size: 18px;
    font-weight: 800;
    color: #dc2626;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .gp-box .gp-no {
    font-size: 13px;
    font-weight: 700;
    color: #142032;
    font-family: 'Courier New', monospace;
    margin-top: 3px;
  }
  .gp-box .gp-date {
    font-size: 10px;
    color: #6b7280;
    margin-top: 2px;
  }
  .body-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  .info-box {
    border: 1px solid #d1d5db;
    padding: 8px 10px;
    border-radius: 3px;
    min-height: 90px;
  }
  .info-box h3 {
    font-size: 9px;
    text-transform: uppercase;
    color: #6b7280;
    margin: 0 0 4px 0;
    letter-spacing: 0.06em;
    font-weight: 700;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
    margin-bottom: 5px;
  }
  .info-box p { margin: 2px 0; font-size: 11px; }
  .info-box .primary { font-weight: 700; font-size: 12px; }
  .info-box .sub { color: #4b5563; font-size: 10px; }
  .section-title {
    background: #dc2626;
    color: #fff;
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .dispatch-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #d1d5db;
    margin-bottom: 14px;
  }
  .dispatch-col { padding: 8px 12px; }
  .dispatch-col.left { border-right: 1px solid #d1d5db; }
  .dispatch-row {
    display: flex;
    padding: 3px 0;
    font-size: 11px;
    border-bottom: 1px dotted #e5e7eb;
  }
  .dispatch-row:last-child { border-bottom: none; }
  .dispatch-row .lbl { width: 110px; color: #6b7280; font-weight: 600; }
  .dispatch-row .val { flex: 1; font-weight: 600; }
  .dispatch-row .val.mono { font-family: 'Courier New', monospace; }
  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 11px;
  }
  table.items thead th {
    background: #dc2626;
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    border: 1px solid #991b1b;
  }
  table.items tbody td {
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    vertical-align: top;
  }
  table.items tfoot td {
    padding: 7px 8px;
    border: 1px solid #991b1b;
    background: #fee2e2;
    font-weight: 800;
    font-size: 12px;
  }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .mono { font-family: 'Courier New', monospace; }
  .instructions {
    border: 1px dashed #9ca3af;
    padding: 8px 10px;
    margin-bottom: 24px;
    font-size: 10px;
    color: #4b5563;
    background: #fffbeb;
  }
  .instructions strong { color: #142032; }
  .sign-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 30px;
    margin-top: 60px;
  }
  .sign-cell {
    text-align: center;
    font-size: 10px;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .sign-cell .line {
    border-top: 1px solid #142032;
    padding-top: 4px;
  }
  .regd-office {
    border-top: 1px solid #d1d5db;
    padding-top: 8px;
    margin-top: 20px;
    font-size: 9px;
    color: #6b7280;
    text-align: center;
    line-height: 1.4;
  }
  .regd-office strong { color: #142032; }
  @media print { body { padding: 12px 18px; } }
  @page { margin: 12mm; }
`

export function printGatePass(so: SalesOrder, dispatch: Dispatch) {
  const isTransport = dispatch.deliveryMethod === 'transport'
  const meta = parseTransportMeta(dispatch)
  const transportVendor = meta.vendor || '—'
  const lockNo = meta.lockNo || '—'

  const rows = (dispatch.items || []).map((it: any, i: number) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${it.product?.name || '—'}</td>
      <td class="mono text-center">${it.product?.sku || '—'}</td>
      <td>${it.product?.category || '—'}</td>
      <td class="text-right">${num(it.quantity)}</td>
      <td class="text-center">${it.product?.unit || 'PCS'}</td>
    </tr>
  `).join('')

  const customer = so.customer as any
  const content = `
    <!-- HEADER -->
    <div class="header">
      <div class="brand-block">
        <div class="brand-name">Whirlpool Bangladesh Limited</div>
        <div class="brand-addr">
          Central Warehouse,<br>
          Kanchpur, Madanpur, Narayangonj-1411, Dhaka
        </div>
      </div>
      <div class="gp-box">
        <div class="gp-title">Gate Pass</div>
        <div class="gp-no">GP-${dispatch.dispatchNo}</div>
        <div class="gp-date">${dispatchTime(dispatch)}</div>
      </div>
    </div>

    <!-- BODY: BILL TO | SHIP TO | META -->
    <div class="body-grid">
      <div class="info-box">
        <h3>Delivery To (Dealer)</h3>
        <p class="primary">${customer?.name || '—'}</p>
        <p class="sub">${customer?.code || ''}</p>
        <p class="sub">${customer?.city || ''}</p>
      </div>
      <div class="info-box">
        <h3>Reference</h3>
        <p>SO: <strong class="mono">${so.soNumber}</strong></p>
        <p>Challan: <strong class="mono">${dispatch.challanNo || '—'}</strong></p>
        <p>SAP Invoice: <strong class="mono">${so.sapInvoiceRef || '—'}</strong></p>
      </div>
      <div class="info-box">
        <h3>Delivery Mode</h3>
        <p class="primary" style="text-transform:capitalize">${dispatch.deliveryMethod}</p>
        ${isTransport ? `<p class="sub">Vehicle: <strong class="mono">${dispatch.vehicleNo || '—'}</strong></p>` : `<p class="sub">Courier: <strong>${dispatch.courierName || '—'}</strong></p>`}
      </div>
    </div>

    <!-- DISPATCH DETAILS -->
    <div class="section-title">Dispatch Details</div>
    <div class="dispatch-grid">
      <div class="dispatch-col left">
        ${isTransport ? `
          <div class="dispatch-row"><span class="lbl">Vehicle No</span><span class="val mono" style="font-size:13px">${dispatch.vehicleNo || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Driver</span><span class="val">${dispatch.driverName || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Driver Phone</span><span class="val">${dispatch.driverPhone || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Lock No</span><span class="val mono">${lockNo}</span></div>
        ` : `
          <div class="dispatch-row"><span class="lbl">Courier</span><span class="val">${dispatch.courierName || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Tracking No</span><span class="val mono">${dispatch.trackingNumber || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Lock No</span><span class="val mono">${lockNo}</span></div>
        `}
      </div>
      <div class="dispatch-col">
        ${isTransport ? `
          <div class="dispatch-row"><span class="lbl">Transport Vendor</span><span class="val">${transportVendor}</span></div>
          <div class="dispatch-row"><span class="lbl">Prepared By</span><span class="val">${dispatch.dispatchedBy || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Dispatch No</span><span class="val mono">${dispatch.dispatchNo}</span></div>
          <div class="dispatch-row"><span class="lbl">Total Units</span><span class="val">${num(dispatch.totalQty)}</span></div>
        ` : `
          <div class="dispatch-row"><span class="lbl">Prepared By</span><span class="val">${dispatch.dispatchedBy || '—'}</span></div>
          <div class="dispatch-row"><span class="lbl">Dispatch No</span><span class="val mono">${dispatch.dispatchNo}</span></div>
          <div class="dispatch-row"><span class="lbl">Total Units</span><span class="val">${num(dispatch.totalQty)}</span></div>
        `}
      </div>
    </div>

    <!-- ITEMS -->
    <div class="section-title">Items Authorized for Exit</div>
    <table class="items">
      <thead>
        <tr>
          <th class="text-center" style="width:36px">SL</th>
          <th>Description</th>
          <th class="text-center" style="width:100px">Material Code</th>
          <th style="width:100px">Category</th>
          <th class="text-right" style="width:60px">Qty</th>
          <th class="text-center" style="width:50px">Unit</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="text-right">Total Qty =</td>
          <td class="text-right">${num(dispatch.totalQty)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- INSTRUCTIONS -->
    <div class="instructions">
      <strong>⚠ Gate Pass Instructions:</strong> This gate pass authorizes the removal of the above goods from the Whirlpool Bangladesh warehouse.
      Security personnel must verify the vehicle number, driver identity, and quantities match before allowing exit.
      Gate pass must be retained by security and submitted with daily log.
    </div>

    <!-- SIGNATURES -->
    <div class="sign-row">
      <div class="sign-cell"><div class="line">Prepared By (Warehouse)</div></div>
      <div class="sign-cell"><div class="line">Security Check</div></div>
      <div class="sign-cell"><div class="line">Driver / Courier Sign</div></div>
    </div>

    <!-- REGD OFFICE -->
    <div class="regd-office">
      <strong>Regd. Office:</strong> Whirlpool Bangladesh Limited - (Wakil Tower) 6th Floor &amp; 8th Floor; TA 131, Gulshan Badda Link Road; Dhaka-1212.
    </div>
  `
  return openPrintWindow(`Gate Pass — ${dispatch.dispatchNo}`, GATE_PASS_CSS, content)
}
