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
      viewBox="60 80 1310 910"
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
        d="M68 232C68 226 90 222 125 222L290 222C410 222 500 282 548 358L700 650L640 880C600 915 520 936 470 931C440 912 415 880 395 845L105 290C90 262 68 240 68 232Z"
        fill={`url(#${leftRibbonGradientId})`}
      />
      <path
        d="M1362 100C1362 95 1340 90 1280 86C1130 80 960 120 878 260L562 885C540 915 500 935 470 931C525 966 605 986 690 986C800 986 920 940 995 830L1010 800L1330 190C1345 160 1358 130 1362 100Z"
        fill={`url(#${rightRibbonGradientId})`}
      />
    </svg>
  );
}
