import logo from './normula-icon.png';

/**
 * Логотип Normula.
 */
export function Logo({ height = 28, label }: { height?: number; label?: string }) {
  const size = height;
  return (
    <img
      src={logo}
      width={size}
      height={size}
      alt={label ?? 'Normula'}
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}
