import { useMutation } from '@tanstack/react-query';
import { Database, Download, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { downloadAllData } from '@/lib/api/exports';
import { downloadFile } from '@/lib/download-file';

/** Busca o `.zip` na API e entrega ao navegador; devolve o nome do arquivo baixado. */
function useDownloadAllData() {
  return useMutation({
    // Fora do mapa de invalidação: só lê o banco, nenhuma tela muda.
    mutationFn: async () => {
      const { file, fileName } = await downloadAllData();
      downloadFile(file, fileName);
      return fileName;
    },
  });
}

/** "Baixar meus dados", em Ajustes: a cópia de todas as tabelas, para guardar ou reprocessar. */
export function DataExportSection() {
  const download = useDownloadAllData();
  return (
    <section
      aria-labelledby="data-export-heading"
      className="space-y-3 rounded-lg border bg-card p-5 shadow-card"
    >
      <h2 id="data-export-heading" className="type-label flex items-center gap-2">
        <Database className="size-4 text-primary" aria-hidden="true" />
        Seus dados
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Um arquivo .zip com todas as tabelas do Valora em CSV, com os valores em centavos. Serve
        para guardar uma cópia ou levar para outra ferramenta. Para abrir no Excel, use “Exportar
        CSV” em Transações.
      </p>
      <Button
        variant="outline"
        disabled={download.isPending}
        aria-busy={download.isPending}
        onClick={() => download.mutate()}
      >
        {download.isPending ? (
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Download aria-hidden="true" />
        )}
        {download.isPending ? 'Preparando…' : 'Baixar meus dados'}
      </Button>
      <div aria-live="polite">
        {download.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Não deu para baixar os dados. Tente de novo.
          </p>
        ) : null}
        {download.isSuccess ? (
          <p className="text-sm text-muted-foreground">{download.data} baixado.</p>
        ) : null}
      </div>
    </section>
  );
}
