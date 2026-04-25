import { chunkText, overlapScore } from './lib/utils.mjs';

export function buildChunks(sources) {
  const chunks = [];
  for (const source of sources || []) {
    const pieces = chunkText(source.content || '');
    for (const piece of pieces) {
      chunks.push({
        id: `${source.id}_chunk_${piece.index}`,
        sourceId: source.id,
        title: source.title,
        origin: source.origin,
        kind: source.kind,
        url: source.url || null,
        chunkIndex: piece.index,
        text: piece.text
      });
    }
  }
  return chunks;
}

export function rankChunks(chunks, query, limit = 6) {
  return [...(chunks || [])]
    .map((chunk) => ({
      ...chunk,
      score: overlapScore(query, `${chunk.title}\n${chunk.text}`)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
