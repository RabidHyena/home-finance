import { CATEGORIES, CATEGORY_LABELS } from '../types';
import { TransactionListPage } from './TransactionListPage';

export function TransactionsPage() {
  return (
    <TransactionListPage
      type="expense"
      title="Расходы"
      categories={CATEGORIES}
      categoryLabels={CATEGORY_LABELS}
      emptyLabel="Нет транзакций"
      allLoadedLabel="Все транзакции загружены"
      createTitle="Новая транзакция"
      exportPrefix="transactions"
      deleteAllTitle="Удалить все транзакции"
      deleteAllMessage={(total) => `Вы уверены, что хотите удалить все ${total} транзакций? Это действие нельзя отменить.`}
      deleteOneTitle="Удалить транзакцию"
      deleteOneMessage="Вы уверены, что хотите удалить эту транзакцию? Это действие нельзя отменить."
      toasts={{
        created: 'Транзакция добавлена',
        createError: 'Не удалось создать транзакцию',
        updated: 'Транзакция обновлена',
        updateError: 'Не удалось обновить транзакцию',
        deleted: 'Транзакция удалена',
        deleteError: 'Не удалось удалить транзакцию',
        allDeleted: 'Все расходы удалены',
        allDeleteError: 'Не удалось удалить расходы',
        loadError: 'Не удалось загрузить транзакции. Попробуйте обновить страницу.',
      }}
    />
  );
}
