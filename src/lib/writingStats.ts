/**
 * Live, in-browser counterpart of prepband-backend's
 * app/services/writing_diagnostics.py. Keep the word rule identical:
 * runs of letters/digits, with internal apostrophes or hyphens kept
 * together ("don't" and "well-known" are one word each). The server
 * recounts on every save and at submission, so its figure is the one stored.
 */
const WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export function countWords(text: string): number {
  return (text.match(WORD_RE) ?? []).length;
}

export function countParagraphs(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\n\s*\n/).filter((part) => part.trim()).length;
}
