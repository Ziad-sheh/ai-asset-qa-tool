export function sanitize(text) {
  return text ? text.replace(/[<>]/g, '') : '';
}
