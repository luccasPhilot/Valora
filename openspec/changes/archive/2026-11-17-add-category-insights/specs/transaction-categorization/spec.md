## MODIFIED Requirements

### Requirement: Tela de categorias e regras
A tela "Categorias e regras" (`/categorias-e-regras`), acessível pelo rodapé do menu, MUST mostrar:
- as categorias agrupadas por tipo, com ícone;
- as regras, com padrão, tipo de comparação, categoria e prioridade;
- o mapeamento das categorias do Pluggy.

A tela MUST permitir criar, editar e arquivar categorias, e criar, editar e excluir regras. Ela MUST seguir o Design System, ter os estados carregando, vazio e erro, e ser responsiva. A análise de gastos por categoria MUST NOT ficar nesta tela: é a área "Categorias" (`/categorias`), do menu principal, descrita em `category-insights`.

#### Scenario: Criar regra pela tela
- **WHEN** você cria a regra "contém IFOOD → Alimentação" na tela
- **THEN** a regra aparece na lista e as transações existentes que casam com ela mudam de categoria

#### Scenario: Celular
- **WHEN** a tela é aberta com 320 px de largura
- **THEN** não há rolagem horizontal e os formulários abrem num painel vindo de baixo

#### Scenario: Endereço e menu
- **WHEN** você escolhe "Categorias e regras" no rodapé do menu
- **THEN** a tela abre em `/categorias-e-regras`, com as abas "Categorias", "Regras" e "Pluggy", e o item do rodapé fica ativo

#### Scenario: A análise não está aqui
- **WHEN** você abre a tela de gestão
- **THEN** ela não tem aba de análise, e "Categorias" no menu principal leva à análise
