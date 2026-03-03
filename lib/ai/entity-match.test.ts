import { normalizeEntityName, stringMatchEntities } from './entity-match';

// ─── normalizeEntityName ────────────────────────────────────────────

describe('normalizeEntityName', () => {
    it('strips titles and lowercases', () => {
        expect(normalizeEntityName('Mr. Arjun Mehta')).toEqual(['arjun', 'mehta']);
        expect(normalizeEntityName('Prof. Kumar')).toEqual(['kumar']);
        expect(normalizeEntityName('Dr. Ananya Rao')).toEqual(['ananya', 'rao']);
    });

    it('strips filler words', () => {
        expect(normalizeEntityName('the hostel warden')).toEqual(['hostel', 'warden']);
        expect(normalizeEntityName('our class teacher')).toEqual(['class', 'teacher']);
    });

    it('removes punctuation', () => {
        expect(normalizeEntityName('Prof. R.K. Sharma')).toEqual(['r', 'k', 'sharma']);
    });

    it('handles empty or whitespace', () => {
        expect(normalizeEntityName('')).toEqual([]);
        expect(normalizeEntityName('   ')).toEqual([]);
    });

    it('handles name with "sir" suffix', () => {
        expect(normalizeEntityName('Rajesh sir')).toEqual(['rajesh']);
    });
});

// ─── stringMatchEntities ────────────────────────────────────────────

describe('stringMatchEntities', () => {
    it('matches same name with different titles', () => {
        expect(stringMatchEntities('Mr. Arjun Mehta', 'Arjun Mehta')).toBe('match');
        expect(stringMatchEntities('Prof. Kumar', 'Professor Kumar')).toBe('match');
        expect(stringMatchEntities('Dr. Ananya Rao', 'Mrs. Ananya Rao')).toBe('match');
    });

    it('rejects clearly different entities', () => {
        expect(stringMatchEntities('Mr. Arjun Mehta', 'hostel warden')).toBe('reject');
        expect(stringMatchEntities('Prof. Kumar', 'cafeteria manager')).toBe('reject');
        expect(stringMatchEntities('Rajesh sir', 'hostel warden')).toBe('reject');
    });

    it('returns unclear for partial overlap', () => {
        expect(stringMatchEntities('Kumar from hostel', 'Kumar from department')).toBe('unclear');
    });

    it('returns unclear when a name normalizes to empty', () => {
        expect(stringMatchEntities('Mr.', 'hostel warden')).toBe('unclear');
        expect(stringMatchEntities('the', 'Prof.')).toBe('unclear');
    });

    it('handles role-based names with overlap', () => {
        expect(stringMatchEntities('the warden', 'hostel warden')).toBe('match');
    });
});
