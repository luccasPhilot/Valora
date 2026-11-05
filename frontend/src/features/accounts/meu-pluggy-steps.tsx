const STEPS: readonly string[] = [
  'Crie uma conta no Meu Pluggy (meu.pluggy.ai) e conecte cada banco.',
  'No painel de desenvolvedor do Pluggy (dashboard.pluggy.ai), crie uma aplicação e copie o id de cada banco conectado.',
  'Coloque os ids em PLUGGY_ITEM_IDS, no .env do servidor, e reinicie o Valora.',
  'Toque no status de atualização, no topo da tela, para sincronizar.',
];

/** O passo a passo resumido de docs/02-open-finance.md, para quando ainda não há nenhum banco. */
export function MeuPluggySteps() {
  return (
    <ol className="max-w-prose list-decimal space-y-2 pl-5 text-left text-sm text-muted-foreground">
      {STEPS.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}
