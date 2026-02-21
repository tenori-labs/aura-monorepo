import { cn } from './utils';

describe('cn', () => {
    it('merges multiple class strings', () => {
        expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
    });

    it('handles conditional classes via objects', () => {
        const result = cn('base', { active: true, disabled: false });
        expect(result).toContain('base');
        expect(result).toContain('active');
        expect(result).not.toContain('disabled');
    });

    it('resolves Tailwind conflicts by keeping the last class', () => {
        const result = cn('px-4', 'px-2');
        expect(result).toBe('px-2');
    });

    it('handles empty inputs gracefully', () => {
        expect(cn()).toBe('');
    });

    it('filters out falsy values', () => {
        expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar');
    });

    it('handles array inputs', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    // Type safety
    it('handles numeric input without crashing', () => {
        expect(() => cn(123 as any)).not.toThrow();
    });

    it('handles object-only input', () => {
        expect(cn({ active: true, hidden: false })).toBe('active');
    });
});
