import { ExternalLink } from 'lucide-react';

const MEU_PLUGGY_URL = 'https://meu.pluggy.ai';

/** Como reconectar um banco que parou de sincronizar: o Valora só lê, quem renova é o Meu Pluggy. */
export function ReconnectHelp() {
  return (
    <div className="space-y-2 rounded-md bg-warning-surface p-3 text-sm text-warning">
      <p className="font-semibold">Como reconectar</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Abra o{' '}
          <a
            href={MEU_PLUGGY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Meu Pluggy
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>{' '}
          e refaça a autorização deste banco.
        </li>
        <li>Volte aqui e toque no status de atualização, no topo da tela, para sincronizar.</li>
      </ol>
    </div>
  );
}
