import { INCOME_CATEGORIES, INCOME_CATEGORY_LABELS } from '../types';
import { TransactionListPage } from './TransactionListPage';

export function IncomePage() {
  return (
    <TransactionListPage
      type="income"
      title="Доходы"
      titleColor="#22d3ee"
      buttonColor="#22d3ee"
      categories={INCOME_CATEGORIES}
      categoryLabels={INCOME_CATEGORY_LABELS}
      emptyLabel="Нет доходов"
      allLoadedLabel="Все доходы загружены"
      createTitle="Новый доход"
      exportPrefix="income"
      deleteAllTitle="Удалить все доходы"
      deleteAllMessage={(total) => `Вы уверены, что хотите удалить все ${total} записей о доходах? Это действие нельзя отменить.`}
      deleteOneTitle="Удалить запись"
      deleteOneMessage="Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить."
      toasts={{
        created: 'Доход добавлен',
        createError: 'Не удалось создать запись',
        updated: 'Запись обновлена',
        updateError: 'Не удалось обновить запись',
        deleted: 'Запись удалена',
        deleteError: 'Не удалось удалить запись',
        allDeleted: 'Все доходы удалены',
        allDeleteError: 'Не удалось удалить доходы',
        loadError: 'Не удалось загрузить доходы. Попробуйте обновить страницу.',
      }}
    />
  );
}
