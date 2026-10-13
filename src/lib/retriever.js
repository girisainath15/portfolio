// A deliberately small retriever for the "ask" console: keyword + IDF scoring over résumé chunks.
// Runs entirely in the browser. It shows its retrieval trace, so nobody mistakes it for an LLM.

const STOP = new Set(
  'a an the is are was were be been being do does did you your yours i me my mine of to in on for and or with what whats how who where when which why can could would should will tell about at as it its this that these those from by have has had any some there their them they we us our please much many more most did done give me know'.split(
    ' ',
  ),
);

// Words that say "tell me about you" but not *what* — they count, just less than specific terms.
const GENERIC = new Set(['experience', 'work', 'job', 'years', 'role', 'current', 'about', 'use']);

export function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

// Exact match, or a close inflection (agent/agents, retriever/retrievers) — not "fast" → "fastapi".
const matches = (token, word) =>
  token === word ||
  (Math.min(token.length, word.length) >= 5 &&
    Math.abs(token.length - word.length) <= 3 &&
    (word.startsWith(token) || token.startsWith(word)));

export function createRetriever(chunks) {
  const docs = chunks.map((c) => ({ chunk: c, keys: c.keys, words: new Set(tokenize(c.text)) }));
  const n = docs.length;
  const idf = (token) => {
    const df = docs.filter((d) => d.keys.some((k) => matches(token, k)) || [...d.words].some((w) => matches(token, w))).length;
    return Math.log(1 + n / (1 + df));
  };

  return function retrieve(query) {
    const tokens = [...new Set(tokenize(query))];
    if (!tokens.length) return { tokens, hits: [], best: null };
    const weights = tokens.map((t) => idf(t) * (GENERIC.has(t) ? 0.5 : 1));
    const ceiling = weights.reduce((s, w) => s + 2 * w, 0) || 1;
    const hits = docs
      .map((d) => {
        let raw = 0;
        tokens.forEach((t, i) => {
          if (d.keys.some((k) => matches(t, k))) raw += 2 * weights[i];
          else if ([...d.words].some((w) => matches(t, w))) raw += 0.6 * weights[i];
        });
        return { id: d.chunk.id, source: d.chunk.source, text: d.chunk.text, raw, score: raw / ceiling };
      })
      .filter((h) => h.raw > 0)
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 3);
    const best = hits[0] && hits[0].score >= 0.18 ? hits[0] : null;
    return { tokens, hits, best };
  };
}
