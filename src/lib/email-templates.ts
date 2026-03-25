/**
 * Stancil Store email templates.
 * All templates return an HTML string ready for sendEmail().
 */

export const STORE_ADMIN_EMAIL = 'store@stancilservices.com';

function fmt(amount: number): string {
  return '$' + (amount || 0).toFixed(2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function wrapInLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:#0f2b5b;padding:24px 32px;border-radius:12px 12px 0 0;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:-0.3px;">
            Stancil Services Store
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
          ${body}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            This is an automated message from the Stancil Employee Store.<br />
            Do not reply to this email — contact <a href="mailto:${STORE_ADMIN_EMAIL}" style="color:#2563eb;">${STORE_ADMIN_EMAIL}</a> with questions.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function itemsTable(items: OrderItem[]): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">
        ${item.product_name}
        ${[item.product_size, item.color].filter(Boolean).join(' / ')
          ? `<br /><span style="font-size:12px;color:#6b7280;">${[item.product_size, item.color].filter(Boolean).join(' / ')}</span>`
          : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;font-weight:600;">${fmt(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Item</th>
          <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
          <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export interface OrderItem {
  product_name: string;
  product_size: string | null;
  color: string | null;
  quantity: number;
  price: number;
}

export interface OrderRecord {
  id: number;
  created_at: string;
  employee_email: string;
  total_amount: number;
  credit_used: number;
  out_of_pocket: number;
  order_notes: string | null;
  location_selected: string | null;
  manager_selected_name: string | null;
  manager_selected_email: string | null;
}

export interface EmployeeInfo {
  display_name?: string;
  first_name?: string;
  last_name?: string;
}

function employeeName(info: EmployeeInfo, email: string): string {
  return info.display_name
    || [info.first_name, info.last_name].filter(Boolean).join(' ')
    || email;
}

/**
 * Order placed — sent to employee + manager + store admin (BCC).
 */
export function orderConfirmationEmail(
  order: OrderRecord,
  items: OrderItem[],
  employee: EmployeeInfo
): string {
  const name = employeeName(employee, order.employee_email);

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0f2b5b;">Order Received</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hi ${name}, your order has been submitted and is being processed.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="font-size:13px;color:#6b7280;">Order #</td>
        <td style="font-size:14px;color:#111827;font-weight:600;text-align:right;">#${order.id}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#6b7280;padding-top:6px;">Date</td>
        <td style="font-size:14px;color:#111827;text-align:right;padding-top:6px;">${formatDate(order.created_at)}</td>
      </tr>
      ${order.location_selected ? `
      <tr>
        <td style="font-size:13px;color:#6b7280;padding-top:6px;">Location</td>
        <td style="font-size:14px;color:#111827;text-align:right;padding-top:6px;">${order.location_selected}</td>
      </tr>` : ''}
      ${order.manager_selected_name ? `
      <tr>
        <td style="font-size:13px;color:#6b7280;padding-top:6px;">Manager</td>
        <td style="font-size:14px;color:#111827;text-align:right;padding-top:6px;">${order.manager_selected_name}</td>
      </tr>` : ''}
    </table>

    <h3 style="margin:0 0 4px;font-size:15px;color:#0f2b5b;">Items Ordered</h3>
    ${itemsTable(items)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="font-size:13px;color:#6b7280;">Order Total</td>
        <td style="font-size:14px;color:#111827;font-weight:600;text-align:right;">${fmt(order.total_amount)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#16a34a;padding-top:6px;">Credit Applied</td>
        <td style="font-size:14px;color:#16a34a;font-weight:600;text-align:right;padding-top:6px;">-${fmt(order.credit_used)}</td>
      </tr>
      <tr>
        <td style="font-size:15px;color:#0f2b5b;font-weight:700;padding-top:10px;border-top:2px solid #e5e7eb;">Out-of-Pocket</td>
        <td style="font-size:15px;color:#0f2b5b;font-weight:700;text-align:right;padding-top:10px;border-top:2px solid #e5e7eb;">${fmt(order.out_of_pocket)}</td>
      </tr>
    </table>

    ${order.out_of_pocket > 0 ? `
    <div style="margin-top:20px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;">
      <strong>Note:</strong> The out-of-pocket amount of ${fmt(order.out_of_pocket)} will be coordinated by HR / payroll.
    </div>` : ''}

    ${order.order_notes ? `
    <div style="margin-top:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Order Notes</p>
      <p style="margin:0;font-size:14px;color:#374151;">${order.order_notes}</p>
    </div>` : ''}
  `;

  return wrapInLayout(`Stancil Store — Order #${order.id} Received`, body);
}

/**
 * Order fulfilled — sent to employee + manager.
 */
export function orderFulfilledEmail(
  order: OrderRecord,
  items: OrderItem[],
  employee: EmployeeInfo
): string {
  const name = employeeName(employee, order.employee_email);

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0f2b5b;">Order Fulfilled!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hi ${name}, great news — your order #${order.id} has been fulfilled.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="font-size:13px;color:#6b7280;">Order #</td>
        <td style="font-size:14px;color:#111827;font-weight:600;text-align:right;">#${order.id}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#6b7280;padding-top:6px;">Original Order Date</td>
        <td style="font-size:14px;color:#111827;text-align:right;padding-top:6px;">${formatDate(order.created_at)}</td>
      </tr>
      ${order.location_selected ? `
      <tr>
        <td style="font-size:13px;color:#6b7280;padding-top:6px;">Location</td>
        <td style="font-size:14px;color:#111827;text-align:right;padding-top:6px;">${order.location_selected}</td>
      </tr>` : ''}
    </table>

    <h3 style="margin:0 0 4px;font-size:15px;color:#0f2b5b;">Items</h3>
    ${itemsTable(items)}

    ${order.order_notes ? `
    <div style="margin-top:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Notes from Admin</p>
      <p style="margin:0;font-size:14px;color:#374151;">${order.order_notes}</p>
    </div>` : ''}

    <div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:14px;color:#15803d;">
      If you have any questions about your order, contact <a href="mailto:${STORE_ADMIN_EMAIL}" style="color:#15803d;font-weight:600;">${STORE_ADMIN_EMAIL}</a>.
    </div>
  `;

  return wrapInLayout(`Stancil Store — Order #${order.id} Fulfilled`, body);
}
