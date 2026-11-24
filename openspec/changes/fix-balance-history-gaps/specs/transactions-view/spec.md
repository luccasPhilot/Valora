## MODIFIED Requirements

### Requirement: Filtros e busca
A lista MUST aceitar os filtros `from` e `to` (datas), `categoryId`, `type` (`income`, `expense`, `transfer`), `accountId` e `search`. A busca MUST comparar o termo normalizado com `description_normalized` e encontrar o termo em qualquer parte da descrição. O tipo MUST ser decidido pela categoria (`transfer` e `expense`) e, fora delas, pelo sinal do valor: uma entrada numa categoria de despesa (estorno) é `expense`.

#### Scenario: Busca sem acento
- **WHEN** a busca é `farmacia` e existe a transação `FARMÁCIA SÃO JOÃO`
- **THEN** a transação aparece no resultado

#### Scenario: Filtro de despesas
- **WHEN** `type=expense` é pedido
- **THEN** aparecem as transações com valor negativo que não estão numa categoria `transfer` e as transações de qualquer sinal numa categoria `expense`

#### Scenario: Estorno no filtro de receitas
- **WHEN** `type=income` é pedido e existe um estorno de R$ 50,00 em "Compras"
- **THEN** o estorno não aparece

#### Scenario: Filtro de transferências
- **WHEN** `type=transfer` é pedido
- **THEN** só aparecem transações em categorias do tipo `transfer`
