function buildReceiptText(order) {
  const lines = [];
  lines.push(`${order.tenant_id.toUpperCase()} — ORDER RECEIPT`);
  lines.push(`Customer: ${order.customer_name}`);
  lines.push(`Fulfillment: ${order.fulfillment}`);
  if (order.phone) lines.push(`Phone: ${order.phone}`);
  lines.push('-----------------------------');
  for (const item of order.items) {
    const lineTotal = (item.unit_price * item.quantity).toFixed(2);
    lines.push(`${item.quantity}x ${item.name} - $${lineTotal}${item.notes ? ' (' + item.notes + ')' : ''}`);
  }
  lines.push('-----------------------------');
  lines.push(`Subtotal: $${order.subtotal.toFixed(2)} ${order.currency}`);
  lines.push(`Confirmed: ${order.confirmed_at}`);
  return lines.join('\n');
}

module.exports = { buildReceiptText };
