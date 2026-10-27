import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Drawer,
  Flex,
  Icon,
  Select,
  Table,
  Text,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { Printer, Xmark } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { useTranslation } from '@/shared/i18n';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import { usePageObjectChoice } from '@/shared/object-selection';
import { useObjects } from '@/features/objects/api';
import { MEALS, type MealId } from '@/features/menu/types';
import { formatDate } from '@/features/warehouse/format';
import { useAccounts } from './api';
import type { Account } from './types';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import './accounts-route.css';
import './accounts-drawer.css';

/** Значение фильтра «Все объекты». */
const ALL_OBJECTS = 'all';

/** Строка таблицы: счёт в том виде, в каком его показывают таблица и панель. */
interface AccountRow {
  objectId: string;
  /** ДД.ММ.ГГГГ. */
  date: string;
  organization: string;
  passed: number;
  charged: number;
  meals: {
    mealId: MealId;
    passed: number;
    charged: number;
    diets: { name: string; passed: number; charged: number }[];
  }[];
}

function toRow(account: Account): AccountRow {
  return {
    objectId: account.objectId,
    date: formatDate(account.date),
    organization: account.objectName,
    passed: account.passed,
    charged: account.charged,
    meals: (account.meals ?? []).map((meal) => ({
      mealId: meal.mealId,
      passed: meal.passed,
      charged: meal.charged,
      diets: (meal.diets ?? []).map((diet) => ({
        name: diet.dietName,
        passed: diet.passed,
        charged: diet.charged,
      })),
    })),
  };
}

export function AccountsRoute() {
  const { current, organizationFeatures } = useOrganizations();
  const { t } = useTranslation();
  const height = useDrawerHeight();
  const [selected, setSelected] = useState<AccountRow | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AccountRow | null>(null);
  const allowCloseRef = useRef(false);

  // Фильтр живёт на клиенте: счета приходят целиком.
  const objects = useObjects();
  const accounts = useAccounts();

  const mealLabel = (mealId: MealId): string => {
    const def = MEALS.find((item) => item.id === mealId);
    return def ? t(def.labelKey) : mealId;
  };

  const objectOptions = useMemo(() => {
    const all = objects.data?.objects ?? [];
    return all.map((object) => ({ value: object.id, content: object.name }));
  }, [objects.data]);
  const { objectId, setObjectIdLocal: setObjectId } = usePageObjectChoice(
    objectOptions,
    ALL_OBJECTS
  );
  const multipleObjectsEnabled = organizationFeatures?.objectsEnabled === true;
  const activeObjectId = multipleObjectsEnabled
    ? objectId
    : (objects.data?.objects.find((object) => !object.parentObjectId)?.id ?? ALL_OBJECTS);

  const objectFilterOptions = useMemo(
    () => [{ value: ALL_OBJECTS, content: t('accounts.allObjects') }, ...objectOptions],
    [objectOptions, t]
  );

  const rows = useMemo(() => {
    const byId = new Map((objects.data?.objects ?? []).map((object) => [object.id, object]));

    return (accounts.data?.accounts ?? []).map(toRow).filter((row) => {
      if (!multipleObjectsEnabled) {
        return byId.has(row.objectId);
      }
      if (activeObjectId === ALL_OBJECTS) return true;
      // Счёт выписан подобъекту; выбор родительского объекта показывает
      // все его счета.
      const rowObject = byId.get(row.objectId);
      return row.objectId === activeObjectId || rowObject?.parentObjectId === activeObjectId;
    });
  }, [activeObjectId, multipleObjectsEnabled, objects.data, accounts.data]);

  useEffect(() => {
    if (!selected) {
      setOpen(false);
      return;
    }

    setView(selected);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;

    allowCloseRef.current = false;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
    // Зависимость сужена намеренно: панель раскрывается при смене
    // организации, а не на каждое обновление объекта selected — иначе
    // анимация проигрывалась бы заново на ровном месте.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.organization]);

  useEffect(() => {
    if (open || !view || selected) return;
    const timer = window.setTimeout(() => {
      setView(null);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, view, selected]);

  const requestClose = () => {
    allowCloseRef.current = true;
    setOpen(false);
    setSelected(null);
  };

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  return (
    <div className="ac-page">
      <Flex className="ac-page__toolbar" alignItems="center" gap={2} wrap>
        {multipleObjectsEnabled && (
          <Select
            size="l"
            width={280}
            label={t('accounts.objectLabel')}
            value={[objectId]}
            onUpdate={(value) => setObjectId(value[0] ?? ALL_OBJECTS)}
            options={objectFilterOptions}
            disabled={objects.isPending}
          />
        )}
        <Text variant="body-1" color="secondary">
          {activeObjectId === ALL_OBJECTS
            ? t('accounts.totalAccounts', { count: rows.length })
            : t('accounts.found', { count: rows.length })}
        </Text>
      </Flex>
      <div className="ac-page__scroll">
        {accounts.isPending && <LoadingState />}
        {accounts.isError && (
          <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
        )}
        {accounts.isSuccess && <AccountsTable rows={rows} onOpen={(row) => setSelected(row)} />}
      </div>

      <Drawer
        open={open}
        onOpenChange={(nextOpen, _event, reason) => {
          if (nextOpen) {
            setOpen(true);
            return;
          }

          if (allowCloseRef.current || reason === 'outside-press' || reason === 'escape-key') {
            setOpen(false);
            setSelected(null);
          }
        }}
        placement="bottom"
        size={height}
        maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
        contentOverflow="auto"
        className="accounts-drawer"
        contentClassName="accounts-drawer__panel"
      >
        {view && (
          <div className="accounts-drawer__card">
            <div className="accounts-drawer__header">
              <Text variant="subheader-2">{view.organization}</Text>
              <Button view="flat" size="l" onClick={requestClose} aria-label={t('common.close')}>
                <Icon data={Xmark} size={20} />
              </Button>
            </div>
            <div className="accounts-drawer__body">
              {view.meals.map((meal) => (
                <div key={meal.mealId} className="accounts-drawer__meal-card">
                  <div className="accounts-drawer__meal-head">
                    <Text variant="subheader-2">{mealLabel(meal.mealId)}</Text>
                    <div className="accounts-drawer__meal-totals">
                      <Text variant="body-2">
                        {t('accounts.passedPeople', { count: meal.passed })}
                      </Text>
                      <Text variant="body-2">
                        {t('accounts.chargedRub', {
                          amount: meal.charged.toLocaleString('cs-CZ'),
                        })}
                      </Text>
                    </div>
                  </div>
                  <table
                    className="admin-table accounts-drawer__diets"
                    aria-label={t('nav.items.diets')}
                  >
                    <tbody>
                      {meal.diets.map((diet) => (
                        <tr key={diet.name}>
                          <td>{diet.name}</td>
                          <td style={{ textAlign: 'right' }}>
                            {t('accounts.people', { count: diet.passed })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {t('accounts.amountRub', {
                              amount: diet.charged.toLocaleString('cs-CZ'),
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div className="accounts-drawer__footer">
              <div className="accounts-drawer__footer-inner">
                <Button view="normal" size="l" onClick={() => window.print()}>
                  <Icon data={Printer} size={16} />
                  {t('accounts.print')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/** Шапка таблицы закреплена, скроллится только список строк. */
function AccountsTable({
  rows,
  onOpen,
}: {
  rows: AccountRow[];
  onOpen: (row: AccountRow) => void;
}) {
  const { t } = useTranslation();
  const columns: TableColumnConfig<AccountRow>[] = [
    {
      id: 'date',
      name: t('common.date'),
      template: (row) => <Text variant="body-2">{row.date}</Text>,
    },
    {
      id: 'organization',
      name: t('accounts.colOrganization'),
      template: (row) => <Text variant="body-2">{row.organization}</Text>,
    },
    {
      id: 'passed',
      name: t('accounts.colPassed'),
      align: 'end',
      template: (row) => (
        <Text variant="body-2">{t('accounts.people', { count: row.passed })}</Text>
      ),
    },
    {
      id: 'charged',
      name: t('accounts.colCharged'),
      align: 'end',
      template: (row) => (
        <Text variant="body-2">
          {t('accounts.amountRub', { amount: row.charged.toLocaleString('cs-CZ') })}
        </Text>
      ),
    },
  ];

  return (
    <>
      <div className="ac-page__header">
        <Table width="max" className="admin-table" data={[]} columns={columns} />
      </div>
      <div className="admin-table-wrap">
        <Table
          width="max"
          className="admin-table ac-page__table-body"
          data={rows}
          onRowClick={onOpen}
          columns={columns}
        />
      </div>
    </>
  );
}
