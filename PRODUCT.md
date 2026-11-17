# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Um único usuário: o próprio titular, dono do servidor onde o app roda. Abre o Valora no celular e no PC, no dia a dia, para saber como estão suas finanças: saldo, o mês até agora, orçamentos, metas, faturas e patrimônio. Não há outros usuários, cadastro nem login na v1; o acesso é só pela Tailscale.

## Product Purpose

App de finanças pessoais que junta contas, cartões, orçamentos, metas e investimentos num lugar só, com dados que chegam sozinhos pelo Open Finance (Meu Pluggy) e ficam num PostgreSQL próprio, em casa. Sucesso é o titular entender para onde o dinheiro vai e como vai chegar ao fim do mês sem digitar quase nada.

## Positioning

Dados no servidor do próprio titular, regras previsíveis escritas no código (sem IA, a mesma entrada dá sempre o mesmo resultado), só leitura e custo zero. O concorrente mais próximo, o Pierre, é um assistente com IA, de uma empresa que também vende CDB e cartão; o Valora faz orçamento planejado e projeção do mês sem nada disso.

## Operating Context

- Dados via Open Finance, sincronizados uma vez ao dia (mais o botão manual); histórico do Open Finance limitado a 12 meses, então o banco do Valora é a única cópia do que for mais antigo.
- Lançamento manual só como complemento: dinheiro em espécie (conta "Dinheiro", sem saldo) e transações que o Open Finance não trouxe.
- Servidor Linux em casa, Docker Compose, publicado só por `tailscale serve`.

## Capabilities and Constraints

- Áreas: Início, Transações, Contas, Categorias e regras, Orçamentos, Planejamento, Metas, Alertas, Investimentos, Relatórios. Detalhe em `docs/01-produto.md`.
- Dinheiro em centavos inteiros; negativo é saída; transferências internas ficam fora dos totais de receita e despesa.
- Só leitura: nunca pagamento, Pix ou transferência.
- Fora do escopo, inclusive no futuro: IA conversacional, carteira com saldo, multiusuário, canais de chat, uso comercial.
- Interface em pt-BR, fuso America/Sao_Paulo, responsiva de 320 px a monitores largos, tema claro e escuro.

## Brand Commitments

Nome **Valora**. Linha "Clean Fintech + Organic Green", verde como identidade principal; deve parecer fintech moderna e não sistema administrativo nem planilha. A autoridade visual é o `docs/06-design-system.md` e o `docs/design/identidade-visual.md`; este arquivo não os substitui.

## Evidence on Hand

- Documentação de produto, arquitetura, modelo de dados e design system em `docs/`; moodboard em `docs/design/moodboard.png`.
- Uso pessoal: não há depoimentos, clientes, métricas de mercado nem preços, e nada disso deve ser inventado.

## Product Principles

1. **Seus dados, no seu servidor.** Nada depende de um terceiro além do Pluggy como fonte.
2. **Automático primeiro.** Digitar é exceção, não rotina.
3. **Previsível.** Regras explícitas em vez de IA; o número que aparece pode ser conferido à mão.
4. **Só leitura.** O app observa e nunca movimenta dinheiro.
5. **Honesto com os números.** Mostrar o que não entra no cálculo e o que ainda é demonstração, em vez de dado que parece real.

## Accessibility & Inclusion

Sem necessidade específica adicional confirmada. Vale o que o Design System já exige: contraste calculado, nunca só a cor (ícone e texto junto), responsivo de 320 px em diante, nos dois temas.
