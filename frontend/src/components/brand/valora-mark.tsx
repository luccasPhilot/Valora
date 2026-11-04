import { useId } from 'react';

interface ValoraMarkProps {
  className?: string;
}

// Símbolo do Valora: um "V" de duas fitas, a da esquerda mais escura e a da direita mais clara.
// Desenhado a partir do logotipo enviado pelo usuário. É a única peça do app com degradê;
// as cores vêm dos tokens --logo-*, para acompanhar o tema.
export function ValoraMark({ className }: ValoraMarkProps) {
  const leftRibbonGradientId = useId();
  const rightRibbonGradientId = useId();

  return (
    <svg
      viewBox="0 0 100 72"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={leftRibbonGradientId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-ribbon)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-ribbon-deep)' }} />
        </linearGradient>
        <linearGradient id={rightRibbonGradientId} x1="0.9" y1="0" x2="0.2" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-ribbon-light)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-ribbon)' }} />
        </linearGradient>
      </defs>
      <path
        d="M0.6 12.3H16C26 12.3 33 16 37 24.6L48.3 45.2L40 61C38 65 36 67 34 67C31 67 29 65 26.8 62.5L1.5 14.5Q-0.5 12.3 0.6 12.3Z"
        fill={`url(#${leftRibbonGradientId})`}
      />
      <path
        d="M35.5 66.5L47 45L61 18.5C66 9 73 3.5 83 2.4C90 1.7 96 2 100 2.8C98 5 96.5 7.5 95.5 9.5L72.5 52.5C67 62 59 68.5 48 71.2C42 72 37 70.5 35.5 66.5Z"
        fill={`url(#${rightRibbonGradientId})`}
      />
    </svg>
  );
}
