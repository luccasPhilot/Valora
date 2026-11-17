import { useEffect } from 'react';

const APP_NAME = 'Valora';

/**
 * Título da aba do navegador: "<título> | Valora". Ao sair da tela, volta para o nome do app.
 * Sem título, não mexe em nada (a tela que cuida do próprio título fica sozinha).
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} | ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
