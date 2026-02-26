'use client';

/**
 * A small CSS-only loading spinner for use inside buttons.
 * Renders as a 16×16 spinning ring that inherits the current text color.
 */
export function Spinner({ size = 16 }: { size?: number }) {
    return (
        <span
            role="status"
            aria-label="Loading"
            style={{
                display: 'inline-block',
                width: size,
                height: size,
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spinner-rotate 0.6s linear infinite',
            }}
        />
    );
}
