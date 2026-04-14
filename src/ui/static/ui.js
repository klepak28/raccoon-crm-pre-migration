export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function badge(label, tone = 'neutral') {
  return `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;
}

export function chips(tags = []) {
  if (!tags.length) return '<span class="muted">No tags</span>';
  return `<div class="chip-row">${tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}</div>`;
}

export function emptyState(title, body, actionHtml = '') {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      ${actionHtml}
    </div>
  `;
}

export function statusMessage(message, tone = 'info') {
  if (!message) return '';
  return `<div class="notice notice-${tone}">${escapeHtml(message)}</div>`;
}

export function setFlash(message, tone = 'success') {
  sessionStorage.setItem('crm.flash', JSON.stringify({ message, tone }));
}

export function consumeFlash() {
  const raw = sessionStorage.getItem('crm.flash');
  if (!raw) return null;
  sessionStorage.removeItem('crm.flash');
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function formatAddress(address) {
  return [address?.street, address?.unit, address?.city, address?.state, address?.zip].filter(Boolean).join(', ');
}
