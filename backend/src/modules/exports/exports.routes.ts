import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { ExportsService } from './exports.service.js';

const ZIP_CONTENT_TYPE = 'application/zip';
// Dado financeiro: nada de guardar o arquivo em cache do navegador ou de proxy.
const NO_STORE = 'no-store';

/**
 * `GET /exports/all.zip`: um arquivo, não uma listagem, por isso não é paginado (exceção registrada
 * em docs/03-arquitetura.md, "Decisões").
 */
export function exportsRoutes(service: ExportsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/exports/all.zip', async (request, reply) => {
      const dataExport = await service.exportAll();
      request.log.info({ rowCounts: dataExport.rowCounts }, 'exports created');
      return reply
        .header('content-type', ZIP_CONTENT_TYPE)
        .header('content-disposition', `attachment; filename="${dataExport.fileName}"`)
        .header('cache-control', NO_STORE)
        .send(Buffer.from(dataExport.content));
    });
  };
}
