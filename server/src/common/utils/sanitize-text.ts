/** Strip HTML tags and control chars from user-provided text (XSS / log injection mitigation). */
export function sanitizePlainText(value: string, maxLength = 500): string {
  return value
    .replace(/[\0-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
}
