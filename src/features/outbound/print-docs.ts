import { bdt, num, date, dateTime } from '@/lib/format'
import type { SalesOrder, Dispatch } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  PDF generators — Delivery Challan & Gate Pass
//  Opens a print-ready window with Whirlpool branding.
// ═══════════════════════════════════════════════════════════════

const BRAND_HTML = `
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 32px; color: #142032; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0c389f; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 700; color: #0c389f; }
    .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 24px; margin: 0; color: #0c389f; }
    .doc-title .doc-no { font-size: 14px; font-weight: 600; margin-top: 4px; }
    .doc-title .doc-date { font-size: 11px; color: #6b7280; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .info-box { border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; }
    .info-box h3 { font-size: 10px; text-transform: uppercase; color: #6b7280; margin: 0 0 6px 0; letter-spacing: 0.05em; }
    .info-box p { margin: 2px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    th { background: #0c389f; color: white; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    .total-row { font-weight: 700; background: #f3f4f6; }
    .footer { margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
    .sign-box { text-align: center; }
    .sign-line { border-top: 1px solid #142032; margin-top: 40px; padding-top: 6px; font-size: 11px; color: #6b7280; }
    .meta-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-transport { background: #dbeafe; color: #1e40af; }
    .badge-courier { background: #fef3c7; color: #92400e; }
    @media print { body { margin: 16px; } }
  </style>
`

function openPrintWindow(title: string, content: string) {
  const w = window.open('', '_blank', 'width=800,height=1000')
  if (!w) return false
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${BRAND_HTML}</head><body>${content}</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
  return true
}

// ─── Delivery Challan ────────────────────────────────────────────
export function printDeliveryChallan(so: SalesOrder, dispatch: Dispatch) {
  const isTransport = dispatch.deliveryMethod === 'transport'
  const rows = (dispatch.items || []).map((it, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-family:monospace">${it.product?.sku || '—'}</td>
      <td>${it.product?.name || '—'}</td>
      <td style="text-align:right">${num(it.quantity)}</td>
      <td style="text-align:right">${bdt(it.unitPrice)}</td>
      <td style="text-align:right;font-weight:600">${bdt(it.quantity * it.unitPrice)}</td>
    </tr>
  `).join('')

  const content = `
    <div class="header">
      <div>
        <div class="brand">Whirlpool Bangladesh</div>
        <div class="brand-sub">Warehouse Management System</div>
      </div>
      <div class="doc-title">
        <h1>Delivery Challan</h1>
        <div class="doc-no">${dispatch.challanNo || dispatch.dispatchNo}</div>
        <div class="doc-date">${dateTime(dispatch.dispatchedAt)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h3>Delivered To (Dealer)</h3>
        <p><strong>${so.customer?.name || '—'}</strong></p>
        <p>Code: ${so.customer?.code || '—'}</p>
        <p>City: ${so.customer?.city || '—'}</p>
      </div>
      <div class="info-box">
        <h3>Delivery Method</h3>
        <p><span class="badge ${isTransport ? 'badge-transport' : 'badge-courier'}">${dispatch.deliveryMethod}</span></p>
        ${isTransport ? `
          <p>Vehicle: <strong style="font-family:monospace">${dispatch.vehicleNo || '—'}</strong></p>
          <p>Driver: ${dispatch.driverName || '—'}</p>
          <p>Phone: ${dispatch.driverPhone || '—'}</p>
        ` : `
          <p>Courier: <strong>${dispatch.courierName || '—'}</strong></p>
          <p>Tracking: <span style="font-family:monospace">${dispatch.trackingNumber || '—'}</span></p>
        `}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h3>Reference</h3>
        <p>SO: ${so.soNumber}</p>
        <p>Invoice: ${so.invoiceNo || '—'}</p>
        <p>Dispatch: ${dispatch.dispatchNo}</p>
      </div>
      <div class="info-box">
        <h3>Dispatched By</h3>
        <p>${dispatch.dispatchedBy || '—'}</p>
        <p>Notes: ${dispatch.notes || '—'}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px;text-align:center">#</th>
          <th style="width:120px">SKU</th>
          <th>Product</th>
          <th style="text-align:right;width:60px">Qty</th>
          <th style="text-align:right;width:100px">Unit Price</th>
          <th style="text-align:right;width:120px">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" style="text-align:right">Total</td>
          <td style="text-align:right">${num(dispatch.totalQty)}</td>
          <td></td>
          <td style="text-align:right">${bdt(dispatch.totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footer">
      <div class="sign-box"><div class="sign-line">Prepared By</div></div>
      <div class="sign-box"><div class="sign-line">Authorized Signature</div></div>
      <div class="sign-box"><div class="sign-line">Received By (Dealer)</div></div>
    </div>

    <div class="meta-footer">
      Whirlpool Bangladesh · WMS · Delivery Challan ${dispatch.challanNo || dispatch.dispatchNo} · Generated ${new Date().toLocaleString('en-GB')}
    </div>
  `
  return openPrintWindow(`Delivery Challan — ${dispatch.dispatchNo}`, content)
}

// ─── Gate Pass ──────────────────────────────────────────────────
export function printGatePass(so: SalesOrder, dispatch: Dispatch) {
  const isTransport = dispatch.deliveryMethod === 'transport'
  const rows = (dispatch.items || []).map((it, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-family:monospace">${it.product?.sku || '—'}</td>
      <td>${it.product?.name || '—'}</td>
      <td style="text-align:right;font-weight:600">${num(it.quantity)}</td>
    </tr>
  `).join('')

  const content = `
    <div class="header">
      <div>
        <div class="brand">Whirlpool Bangladesh</div>
        <div class="brand-sub">Warehouse Management System · Gate Pass</div>
      </div>
      <div class="doc-title">
        <h1 style="color:#dc2626">GATE PASS</h1>
        <div class="doc-no">GP-${dispatch.dispatchNo}</div>
        <div class="doc-date">${dateTime(dispatch.dispatchedAt)}</div>
      </div>
    </div>

    <div style="border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:20px;background:#fef2f2">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <p style="margin:4px 0"><strong>Gate Pass No:</strong> GP-${dispatch.dispatchNo}</p>
          <p style="margin:4px 0"><strong>Date:</strong> ${date(dispatch.dispatchedAt)}</p>
          <p style="margin:4px 0"><strong>Time:</strong> ${new Date(dispatch.dispatchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div>
          <p style="margin:4px 0"><strong>Delivery To:</strong> ${so.customer?.name || '—'}</p>
          <p style="margin:4px 0"><strong>SO Number:</strong> ${so.soNumber}</p>
          <p style="margin:4px 0"><strong>Challan:</strong> ${dispatch.challanNo || '—'}</p>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid #fecaca;margin:12px 0" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <p style="margin:4px 0"><strong>Method:</strong> <span class="badge ${isTransport ? 'badge-transport' : 'badge-courier'}">${dispatch.deliveryMethod}</span></p>
          ${isTransport ? `<p style="margin:4px 0"><strong>Vehicle No:</strong> <span style="font-family:monospace;font-size:16px;font-weight:700">${dispatch.vehicleNo || '—'}</span></p>` : `<p style="margin:4px 0"><strong>Courier:</strong> ${dispatch.courierName || '—'}</p>`}
        </div>
        <div>
          ${isTransport ? `<p style="margin:4px 0"><strong>Driver:</strong> ${dispatch.driverName || '—'}</p><p style="margin:4px 0"><strong>Phone:</strong> ${dispatch.driverPhone || '—'}</p>` : `<p style="margin:4px 0"><strong>Tracking:</strong> <span style="font-family:monospace">${dispatch.trackingNumber || '—'}</span></p>`}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px;text-align:center">#</th>
          <th style="width:120px">SKU</th>
          <th>Product Description</th>
          <th style="text-align:right;width:80px">Qty</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" style="text-align:right">Total Cartons / Units</td>
          <td style="text-align:right">${num(dispatch.totalQty)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top:16px;padding:12px;border:1px dashed #9ca3af;border-radius:4px;font-size:12px;color:#6b7280">
      <strong>Instructions:</strong> This gate pass authorizes the removal of the above goods from the Whirlpool Bangladesh warehouse.
      Security personnel must verify the vehicle number and quantities before allowing exit.
    </div>

    <div class="footer">
      <div class="sign-box"><div class="sign-line">Prepared By (Warehouse)</div></div>
      <div class="sign-box"><div class="sign-line">Security Check</div></div>
      <div class="sign-box"><div class="sign-line">Driver / Courier Signature</div></div>
    </div>

    <div class="meta-footer">
      Whirlpool Bangladesh · WMS · Gate Pass GP-${dispatch.dispatchNo} · Generated ${new Date().toLocaleString('en-GB')}
    </div>
  `
  return openPrintWindow(`Gate Pass — ${dispatch.dispatchNo}`, content)
}
