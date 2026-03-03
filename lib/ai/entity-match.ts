import { embedText } from '@/lib/ai/embedding';
import { cosineSimilarity } from '@/lib/ai/flows/similarity-utils';

/**
 * Entity name matching for shadow case deduplication.
 *
 * Uses a tiered approach for maximum accuracy with minimum API calls:
 * 1. Quick string match (free) — handles exact/near-exact names
 * 2. Embedding comparison (2 API calls) — handles linguistic variations
 *
 * Examples:
 *   "Mr. Arjun Mehta" vs "hostel warden"    → false (different person)
 *   "Mr. Arjun Mehta" vs "Arjun Mehta"      → true  (string match)
 *   "Prof. Kumar"     vs "Professor Kumar"   → true  (string match after title strip)
 *   "the HOD"         vs "Head of Department"→ true  (embedding match)
 *   "our class teacher" vs "Mrs. Sharma"     → false (embedding match fails)
 */

/** Titles and filler words to strip during normalization */
const TITLE_WORDS = new Set([
    'mr', 'mrs', 'ms', 'dr', 'prof', 'professor', 'sir', 'madam',
    'shri', 'smt', 'the', 'our', 'a', 'an', 'that', 'this',
]);

/**
 * Normalize an entity name for string comparison.
 * Strips titles, lowercases, removes extra whitespace.
 *
 * "Mr. Arjun Mehta" → ["arjun", "mehta"]
 * "Prof. Kumar"     → ["kumar"]
 * "hostel warden"   → ["hostel", "warden"]
 */
export function normalizeEntityName(name: string): string[] {
    return name
        .toLowerCase()
        .replace(/[.,\-()'"]/g, ' ')  // Remove punctuation
        .split(/\s+/)
        .filter((word) => word.length > 0 && !TITLE_WORDS.has(word));
}

/**
 * Quick string-based entity match.
 *
 * Returns:
 *   'match'   — names clearly refer to the same entity
 *   'reject'  — names clearly refer to different entities
 *   'unclear' — can't determine from strings alone (needs embedding)
 */
export function stringMatchEntities(
    nameA: string,
    nameB: string
): 'match' | 'reject' | 'unclear' {
    const tokensA = normalizeEntityName(nameA);
    const tokensB = normalizeEntityName(nameB);

    // If either name normalizes to empty, can't determine
    if (tokensA.length === 0 || tokensB.length === 0) {
        return 'unclear';
    }

    // Check if all tokens of the shorter name appear in the longer
    const [shorter, longer] = tokensA.length <= tokensB.length
        ? [tokensA, tokensB]
        : [tokensB, tokensA];

    const longerSet = new Set(longer);
    const matchingTokens = shorter.filter((t) => longerSet.has(t));

    // If ALL tokens of the shorter name are in the longer → match
    // "Arjun Mehta" vs "Mr. Arjun Mehta" → all of ["arjun", "mehta"] in longer
    if (matchingTokens.length === shorter.length) {
        return 'match';
    }

    // If ZERO tokens overlap → likely different entities
    // "arjun mehta" vs "hostel warden" → 0 overlap
    if (matchingTokens.length === 0) {
        return 'reject';
    }

    // Partial overlap → unclear, need embedding
    // e.g., "Kumar from hostel" vs "Kumar from department"
    return 'unclear';
}

/** Minimum cosine similarity for entity name embeddings to be considered a match */
const ENTITY_EMBEDDING_THRESHOLD = 0.85;

/**
 * Determine if two entity names refer to the same person/entity.
 *
 * Tiered approach:
 * 1. String match (free) — if conclusive, return immediately
 * 2. Embedding comparison — for ambiguous cases
 *
 * @param newEntityName - Entity name from the new report
 * @param existingEntityName - Entity name from the matched shadow case
 * @returns true if they likely refer to the same entity
 */
export async function entityNamesMatch(
    newEntityName: string,
    existingEntityName: string
): Promise<boolean> {
    // Gate 1: Quick string match
    const stringResult = stringMatchEntities(newEntityName, existingEntityName);
    if (stringResult === 'match') return true;
    if (stringResult === 'reject') return false;

    // Gate 2: Embedding comparison (only for 'unclear' cases)
    try {
        const [embA, embB] = await Promise.all([
            embedText(newEntityName),
            embedText(existingEntityName),
        ]);
        const similarity = cosineSimilarity(embA, embB);
        return similarity >= ENTITY_EMBEDDING_THRESHOLD;
    } catch {
        // If embedding fails, be conservative — don't merge
        return false;
    }
}
