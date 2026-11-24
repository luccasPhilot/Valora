## ADDED Requirements

### Requirement: Dependências vigiadas
O repositório MUST ter o Dependabot configurado para o npm do `backend/` e do `frontend/`, para as imagens Docker e para as GitHub Actions, com verificação semanal e atualizações agrupadas. O CI MUST rodar `npm audit --omit=dev --audit-level=high` nas duas partes e falhar com vulnerabilidade alta ou crítica em dependência de produção. As actions dos workflows MUST ser fixadas por SHA, com a versão num comentário.

#### Scenario: Vulnerabilidade alta em produção
- **WHEN** uma dependência de produção do backend tem uma vulnerabilidade alta publicada
- **THEN** o job do backend falha no passo de auditoria

#### Scenario: Ferramenta de build vulnerável
- **WHEN** só uma dependência de desenvolvimento do frontend tem vulnerabilidade
- **THEN** a auditoria passa

#### Scenario: Imagem base nova
- **WHEN** sai um digest novo de `node:26-alpine`
- **THEN** o Dependabot abre um PR agrupado na semana

### Requirement: Imagens construídas no CI
O CI MUST construir as imagens Docker do backend e do frontend a cada push e PR, sem publicar em nenhum registro e sem deploy.

#### Scenario: Dockerfile quebrado
- **WHEN** um commit quebra o `Dockerfile` do frontend
- **THEN** o job de build das imagens falha no CI, antes de chegar ao servidor
