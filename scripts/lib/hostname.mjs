// Validates a bare hostname (no scheme, no path, no port, no userinfo) — labels of 1-63
// alphanumeric-or-hyphen chars, never starting/ending with a hyphen, at least two labels
// (so a single word like "localhost" is rejected — this is only used for public authorized
// domains, which always have a dot). Case-insensitive; IDN/punycode hosts are ASCII already
// by the time they'd reach this, so no unicode handling is needed.
const HOST = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function isHostname(s) {
  return typeof s === 'string' && HOST.test(s);
}
