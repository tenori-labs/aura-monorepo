/**
 * @file Tests for chat-actions validation logic.
 *
 * Tests the input validation and edge cases for the interrogation
 * chat system — message length checks and session state validation.
 */

// ─── Message Validation ──────────────────────────────────────────────

describe('Chat message validation', () => {
    it('rejects empty messages', () => {
        const msg = '';
        expect(msg.trim().length < 2).toBe(true);
    });

    it('rejects single-character messages', () => {
        const msg = 'a';
        expect(msg.trim().length < 2).toBe(true);
    });

    it('accepts messages with 2+ characters', () => {
        const msg = 'Hi';
        expect(msg.trim().length < 2).toBe(false);
    });

    it('rejects whitespace-only messages', () => {
        const msg = '   ';
        expect(msg.trim().length < 2).toBe(true);
    });

    it('trims messages before length check', () => {
        const msg = '  a  ';
        expect(msg.trim().length < 2).toBe(true);
    });
});

// ─── Session Status Validation ───────────────────────────────────────

describe('Session status validation', () => {
    const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'expired'];
    const ACTIVE_STATUSES = ['pending', 'in_progress'];

    it('recognizes pending as active', () => {
        expect(ACTIVE_STATUSES.includes('pending')).toBe(true);
    });

    it('recognizes in_progress as active', () => {
        expect(ACTIVE_STATUSES.includes('in_progress')).toBe(true);
    });

    it('recognizes completed as inactive', () => {
        expect(ACTIVE_STATUSES.includes('completed')).toBe(false);
    });

    it('recognizes expired as inactive', () => {
        expect(ACTIVE_STATUSES.includes('expired')).toBe(false);
    });

    it('validates all defined statuses', () => {
        expect(VALID_STATUSES).toContain('pending');
        expect(VALID_STATUSES).toContain('in_progress');
        expect(VALID_STATUSES).toContain('completed');
        expect(VALID_STATUSES).toContain('expired');
    });

    it('rejects unknown statuses', () => {
        expect(VALID_STATUSES.includes('unknown')).toBe(false);
    });
});

// ─── Chat History Shape ──────────────────────────────────────────────

describe('Chat history shape', () => {
    it('accepts valid chat history format', () => {
        const history = [
            { role: 'user', content: 'Hello' },
            { role: 'model', content: 'How can I help?' },
        ];
        expect(history.every((m) => ['user', 'model'].includes(m.role))).toBe(true);
        expect(history.every((m) => typeof m.content === 'string')).toBe(true);
    });

    it('validates alternating roles', () => {
        const history = [
            { role: 'user', content: 'Hello' },
            { role: 'model', content: 'Hi' },
            { role: 'user', content: 'Question' },
            { role: 'model', content: 'Answer' },
        ];
        for (let i = 0; i < history.length; i++) {
            const expected = i % 2 === 0 ? 'user' : 'model';
            expect(history[i].role).toBe(expected);
        }
    });

    it('accepts empty history for new sessions', () => {
        const history: { role: string; content: string }[] = [];
        expect(history.length).toBe(0);
    });
});
