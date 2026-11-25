/** Word error rate for the Speech lab benchmark (Phase 5 step 5.1). */

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** (substitutions + deletions + insertions) / reference length, via edit distance. */
export function wordErrorRate(reference: string, hypothesis: string): number | null {
  const ref = normalizeWords(reference);
  const hyp = normalizeWords(hypothesis);
  if (ref.length === 0) return null;
  let previous = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= hyp.length; j += 1) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[hyp.length] / ref.length;
}
