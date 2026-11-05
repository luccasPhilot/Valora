import type { PossibleDuplicatesRepository } from './possible-duplicates.repository.js';

/**
 * Roda na sincronização, só para transações do Open Finance recém-inseridas. Marca a possível
 * duplicata e para por aí: juntar ou manter as duas é decisão sua (`DuplicatesService`).
 */
export class DuplicateDetector {
  constructor(private readonly duplicates: PossibleDuplicatesRepository) {}

  /** Devolve quantas transações foram marcadas. */
  async markPossibleDuplicates(insertedIds: readonly string[]): Promise<number> {
    const candidates = await this.duplicates.findCandidates(insertedIds);
    let marked = 0;
    // Em série, de propósito: cada manual só pode ser apontada por uma transação.
    for (const candidate of candidates) {
      const manualId = await this.duplicates.findClosestFreeManual(candidate);
      if (manualId === null) continue;
      await this.duplicates.mark(candidate.id, manualId);
      marked += 1;
    }
    return marked;
  }
}
