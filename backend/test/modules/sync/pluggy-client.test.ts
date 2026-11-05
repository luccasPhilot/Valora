import { describe, expect, it } from 'vitest';

import { PluggyClient, PluggyResponseError } from '../../../src/modules/sync/pluggy-client.js';
import type { SyncedTransaction } from '../../../src/modules/sync/sync.types.js';
import {
  FakePluggySdk,
  fixturesRecordedAt,
  loadPluggyFixtures,
  type PluggyItemFixture,
  type PluggyTransactionFixture,
} from '../../helpers/fake-pluggy-sdk.js';

const WHOLE_YEAR = { from: '2025-01-01', to: '2026-12-31' };

function buildClient(fixtures: PluggyItemFixture[] = loadPluggyFixtures()): PluggyClient {
  return new PluggyClient(new FakePluggySdk(fixtures), () => fixturesRecordedAt(fixtures));
}

function fixtureAt(fixtures: readonly PluggyItemFixture[], index: number): PluggyItemFixture {
  const fixture = fixtures[index];
  if (!fixture) throw new Error(`Fixture: item ${index} não existe`);
  return fixture;
}

function firstTransactionOf(fixture: PluggyItemFixture): PluggyTransactionFixture {
  const [first] = fixture.transactions;
  if (!first) throw new Error('Fixture: item sem transações');
  return first;
}

// O cartão com mais transações: algumas contas das fixtures não têm nenhuma.
function busiestCardAccountIdOf(fixture: PluggyItemFixture): string {
  const transactionCount = (accountId: string) =>
    fixture.transactions.filter((transaction) => transaction.accountId === accountId).length;
  const [busiest] = fixture.accounts
    .filter((account) => account.type === 'CREDIT')
    .sort((left, right) => transactionCount(right.id) - transactionCount(left.id));
  if (!busiest) throw new Error('Fixture: item sem cartão');
  return busiest.id;
}

// O item 3 tem compras (DEBIT, positivas no Pluggy) e estornos (CREDIT, negativos) no cartão.
async function cardTransactions(type: 'DEBIT' | 'CREDIT'): Promise<SyncedTransaction[]> {
  const fixtures = loadPluggyFixtures();
  const itemWithCard = fixtureAt(fixtures, 2);
  const cardAccountId = busiestCardAccountIdOf(itemWithCard);
  const typeById = new Map(itemWithCard.transactions.map((tx) => [tx.id, tx.type]));
  const transactions = await buildClient(fixtures).listTransactions(cardAccountId, WHOLE_YEAR);
  return transactions.filter(
    (transaction) => typeById.get(transaction.pluggyTransactionId) === type,
  );
}

describe('PluggyClient.getItem', () => {
  it('should_return_ok_connection_when_item_is_updated', async () => {
    // Arrange
    const client = buildClient();
    // Act
    const overview = await client.getItem('item-1');
    // Assert
    expect(overview.connection.status).toBe('ok');
  });

  it('should_hide_the_connector_logo_when_connector_is_meu_pluggy', async () => {
    // Arrange
    const client = buildClient();
    // Act
    const overview = await client.getItem('item-1');
    // Assert
    expect(overview.institutionLogoUrl).toBeNull();
  });
});

describe('PluggyClient.listAccounts', () => {
  it('should_take_the_institution_name_from_the_bank_account_when_connector_is_meu_pluggy', async () => {
    // Arrange
    const client = buildClient();
    // Act
    const accountList = await client.listAccounts('item-2');
    // Assert
    expect(accountList.institutionName).toBe('Banco B');
  });

  it('should_trim_card_names_when_pluggy_sends_trailing_spaces', async () => {
    // Arrange
    const client = buildClient();
    // Act
    const accountList = await client.listAccounts('item-2');
    // Assert
    expect(accountList.accounts.map((account) => account.name)).toEqual([
      'Banco B',
      'CARTAO ACC-3',
      'CARTAO ACC-4',
    ]);
  });

  it('should_map_card_accounts_to_credit_card_when_pluggy_type_is_credit', async () => {
    // Arrange
    const client = buildClient();
    // Act
    const accountList = await client.listAccounts('item-2');
    // Assert
    expect(accountList.accounts.map((account) => account.type)).toEqual([
      'checking',
      'credit_card',
      'credit_card',
    ]);
  });
});

describe('PluggyClient.listTransactions', () => {
  it('should_store_card_purchases_as_negative_when_pluggy_sends_them_positive', async () => {
    // Arrange & Act
    const purchases = await cardTransactions('DEBIT');
    // Assert
    expect({
      hasPurchases: purchases.length > 0,
      areAllNegative: purchases.every((purchase) => purchase.amountCents < 0),
    }).toEqual({ hasPurchases: true, areAllNegative: true });
  });

  it('should_store_card_refunds_as_positive_when_pluggy_sends_them_negative', async () => {
    // Arrange & Act
    const refunds = await cardTransactions('CREDIT');
    // Assert
    expect({
      hasRefunds: refunds.length > 0,
      areAllPositive: refunds.every((refund) => refund.amountCents > 0),
    }).toEqual({ hasRefunds: true, areAllPositive: true });
  });

  it('should_normalize_every_description_when_transactions_are_listed', async () => {
    // Arrange
    const fixtures = loadPluggyFixtures();
    const checkingAccountId = firstTransactionOf(fixtureAt(fixtures, 0)).accountId;
    const notNormalized = /[a-zà-ú]|^\s|\s$|\s{2}/;
    // Act
    const transactions = await buildClient(fixtures).listTransactions(
      checkingAccountId,
      WHOLE_YEAR,
    );
    // Assert
    expect(transactions.some((tx) => notNormalized.test(tx.descriptionNormalized))).toBe(false);
  });

  it('should_fail_with_field_path_only_when_a_transaction_has_no_amount', async () => {
    // Arrange
    const fixtures = loadPluggyFixtures();
    const firstItem = fixtureAt(fixtures, 0);
    const { amount: _amount, ...withoutAmount } = firstTransactionOf(firstItem);
    firstItem.transactions = [withoutAmount, ...firstItem.transactions.slice(1)];
    // Act
    const call = buildClient(fixtures).listTransactions(withoutAmount.accountId, WHOLE_YEAR);
    // Assert
    await expect(call).rejects.toThrow(new PluggyResponseError('transações', ['amount']).message);
  });
});

describe('PluggyClient.listInvestments', () => {
  it('should_return_every_investment_of_the_item_when_pluggy_has_them', async () => {
    // Arrange
    const fixtures = loadPluggyFixtures();
    const client = buildClient(fixtures);
    // Act
    const investments = await client.listInvestments('item-3');
    // Assert
    expect(investments).toHaveLength(fixtureAt(fixtures, 2).investments.length);
  });
});
