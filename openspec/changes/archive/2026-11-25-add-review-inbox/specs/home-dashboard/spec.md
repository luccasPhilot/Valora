## ADDED Requirements

### Requirement: Contador "para revisar" no Início
`GET /api/v1/dashboard` MUST trazer `reviewCount`, o mesmo número de `GET /transactions/review-count`. Com `reviewCount` maior que zero, o Início MUST mostrar acima dos cartões o aviso "N para revisar" ("1 para revisar"), que abre a caixa "Para revisar". Com zero, o aviso MUST NOT aparecer.

#### Scenario: Transações novas
- **WHEN** a sincronização da manhã trouxe 12 transações novas
- **THEN** o Início mostra "12 para revisar"

#### Scenario: Caixa zerada
- **WHEN** o usuário revisa tudo e volta ao Início
- **THEN** o aviso não aparece
