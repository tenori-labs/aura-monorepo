import { describe, it, expect } from 'vitest';
import { filterPII, reconstructPII, clearPIISession, getPIIPromptInstruction } from './pii-filter';

// ─── filterPII ──────────────────────────────────────────────────────

describe('filterPII', () => {
    it('replaces email addresses with placeholders', () => {
        const [sanitized, sessionId] = filterPII('Contact me at student@college.edu');
        expect(sanitized).not.toContain('student@college.edu');
        expect(sanitized).toContain('[EMAIL_1]');
        expect(sessionId).toBeTruthy();
    });

    it('replaces phone numbers with placeholders', () => {
        const [sanitized] = filterPII('Call me at 9876543210');
        expect(sanitized).not.toContain('9876543210');
    });

    it('returns unchanged text when no PII is present', () => {
        const [sanitized] = filterPII('I feel stressed about exams');
        expect(sanitized).toBe('I feel stressed about exams');
    });

    it('handles empty string input', () => {
        const [sanitized, sessionId] = filterPII('');
        expect(sanitized).toBe('');
        expect(sessionId).toBeTruthy();
    });

    it('replaces multiple PII items with unique placeholders', () => {
        const [sanitized] = filterPII('Email: a@b.com and also c@d.com');
        expect(sanitized).toContain('[EMAIL_1]');
        expect(sanitized).toContain('[EMAIL_2]');
    });
});

// ─── reconstructPII ─────────────────────────────────────────────────

describe('reconstructPII', () => {
    it('restores original PII from placeholders', () => {
        const original = 'My email is student@university.edu';
        const [sanitized, sessionId] = filterPII(original);

        const restored = reconstructPII(sessionId, sanitized);
        expect(restored).toContain('student@university.edu');
    });

    it('returns text unchanged when there are no placeholders', () => {
        const [, sessionId] = filterPII('no PII here');
        const result = reconstructPII(sessionId, 'just plain text');
        expect(result).toBe('just plain text');
    });
});

// ─── clearPIISession ────────────────────────────────────────────────

describe('clearPIISession', () => {
    it('does not throw when clearing a valid session', () => {
        const [, sessionId] = filterPII('test@example.com');
        expect(() => clearPIISession(sessionId)).not.toThrow();
    });

    it('does not throw when clearing a non-existent session', () => {
        expect(() => clearPIISession('nonexistent-session-id')).not.toThrow();
    });
});

// ─── getPIIPromptInstruction ────────────────────────────────────────

describe('getPIIPromptInstruction', () => {
    it('returns a non-empty string', () => {
        const instruction = getPIIPromptInstruction();
        expect(typeof instruction).toBe('string');
        expect(instruction.length).toBeGreaterThan(0);
    });
});
