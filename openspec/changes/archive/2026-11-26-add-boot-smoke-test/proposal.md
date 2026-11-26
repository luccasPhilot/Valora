## Why

No deploy de 26/11/2026 o backend não subiu (`web-push` 4 não tem export padrão) e **derrubou o produto**. O erro só aparece quando o Node de verdade carrega o `dist/`, e nada pegou antes:

- o CI roda o typecheck, o lint e os testes (com `tsx`/Vitest) e só compila o backend com `tsc`: **nunca executa o build compilado**;
- o `deploy.sh` faz `compose up -d --build --wait`, que **troca os containers antes de saber se a imagem nova funciona**. Com a imagem quebrada, o container antigo já se foi, o Compose reinicia o novo em loop e o front nem sobe (depende do backend saudável).

Esta change fecha as duas brechas: o CI sobe a stack de verdade antes de chegar na `main`, e o servidor testa a imagem nova **antes** de trocar os containers, então um build quebrado não derruba mais a versão que está no ar.

## What Changes

- **Verificação de carga no backend:** um comando `node dist/boot-check.js` que carrega todos os módulos compilados (menos o `server.js`, que sobe a API) e valida a configuração do ambiente com o `loadConfig`. Não conecta no banco, não escuta porta, não chama o Pluggy. Sai com erro e diz qual módulo ou qual variável falhou (nunca o valor).
- **Smoke test no `deploy.sh`:** o deploy passa a construir as imagens (`compose build`), rodar o `boot-check` do backend e o `nginx -t` do frontend em containers descartáveis (`compose run --rm --no-deps`) e **só então** fazer o `up -d --wait`. Se qualquer um falhar, o script termina com erro **com os containers antigos ainda no ar**, e avisa isso.
- **Job de boot no CI:** um job `docker-boot` em `.github/workflows/ci.yml` que monta um `infra/.env` de mentira, sobe o `infra/compose.yml` inteiro com `up -d --build --wait`, confere o `/api/v1/health` pelo front, mostra os logs em caso de falha e derruba tudo no fim. Sem push de imagem e sem deploy.
- **Documentação:** `docs/05-deploy.md` (o passo novo do deploy e como ler a falha do smoke test).

### Contraria documentos

- Nenhum. O fluxo do `deploy.sh` em `docs/05-deploy.md` ganha um passo (atualizado na mesma change). As regras do `CLAUDE.md` seguem valendo: o CI continua em runner da GitHub, sem deploy pelo GitHub e sem runner self-hosted; o job de boot não chama o Pluggy (usa credenciais falsas e um `SYNC_CRON` que não dispara hoje).

### Fora do escopo

- **Voltar versão sozinho quando o healthcheck falha, e tag de imagem por versão:** o rollback rápido (`valora-backend:<sha>`, `deploy.sh <ref>` sem rebuild) já está na `harden-infra` (grupo A, I13). Esta change não mexe nisso.
- **O build do Docker no CI sem subir** (B.2 da `harden-infra`): o job de boot desta change já constrói as imagens; quando a `harden-infra` for aplicada, o job de `docker build` dela pode ser removido por redundância.
- **Zero downtime de verdade** (dois backends ao mesmo tempo): exagero para um app de uma pessoa num servidor de casa.
- **Trocar ou atualizar o `@types/web-push`**, e o conserto do import do `web-push` em si: são commits à parte.
- **Chamar o Pluggy de verdade ou conectar no banco real no smoke test do servidor:** o teste só carrega código e valida configuração.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md` nem na "Ordem sugerida" de `docs/08`: nasce do incidente do deploy de 26/11/2026. Complementa o I14 de `docs/08` (o CI não constrói nem executa as imagens) e a `harden-infra` (grupos A e B, mesmos arquivos: `deploy.sh` e `ci.yml`).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `home-server-deploy`: o deploy testa a imagem nova antes de trocar os containers e mantém a versão antiga no ar se o teste falhar.
- `project-tooling`: o CI sobe a stack inteira e confere o healthcheck antes de a mudança chegar na `main`.

## Impact

- **Backend:** `src/shared/boot-check.ts` (a lógica, testável) e `src/boot-check.ts` (a entrada, que vira `dist/boot-check.js`); testes unitários em `test/`. Nenhuma dependência nova.
- **Infra:** `infra/scripts/deploy.sh`; testes do deploy em `infra/scripts/tests/` (o `docker` falso que eles já usam).
- **GitHub:** `.github/workflows/ci.yml` (job novo; a `harden-infra` mexe no mesmo arquivo, então a ordem de aplicação importa e fica descrita no design).
- **Documentação:** `docs/05-deploy.md` (e a seção "Comandos" do `CLAUDE.md` só se algum comando novo surgir; hoje não surge).
