import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  Label,
  Select,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { ArrowRotateLeft, ChevronLeft, ChevronRight, Printer } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { useOrganizations } from '@/shared/auth';
import { useApi } from '@/shared/api/use-api';
import { useObjectSelection } from '@/shared/object-selection';
import { NoOrganizationSelectedState } from '@/shared/ui/states';
import { useObjects } from '@/features/objects/api';
import { useDiets } from '@/features/diets/api';
import { fetchAllReceipts, fetchReceiptsByIds } from '@/features/warehouse/api';
import { formatDate } from '@/features/warehouse/format';
import type { GroupDiet, ObjectItem } from '@/features/objects/types';
import type { Diet } from '@/features/diets/types';
import { useSchedule } from '@/features/menu/api';
import {
  dateForCycleDay,
  formatDateRange,
  shiftIsoDate,
  startOfWeekMonday,
} from '@/features/menu/dates';
import { MEALS, type Dish, type MealId } from '@/features/menu/types';
import { JournalDrawer } from './journal-drawer';
import { downloadJournalDoc, journalColumns, type JournalPrintColumn } from './journal-print';
import { byReceiptDate, receiptInPeriod, receiptRowValues } from './receipt-fill';
import { AUTO_JOURNALS, JOURNAL_SOURCE_KEYS, type AutoJournal } from './types';
import './journals-route.css';

/** Окно печати журналов — неделя. */
const JOURNAL_PERIOD_DAYS = 7;
/** Минимум пустых строк в форме, чтобы было куда дописывать от руки. */
const MIN_PRINT_ROWS = 10;

/** Журналы, чья строка — партия накладной склада, а не приём пищи из меню. */
const WAREHOUSE_FILL_JOURNALS = new Set(['journ-02']);

/** Готовые строки журнала приёмки; `range` — если период не совпал с неделей. */
interface WarehouseFill {
  rows: string[][];
  /** Даты первых и последней накладной, гггг-мм-дд. */
  range?: { from: string; to: string };
}

/** Объекты планирования: у складов нет ни численности, ни меню. */
function planningObjects(objects: ObjectItem[] | undefined): ObjectItem[] {
  return (objects ?? []).filter((object) => object.type !== 'warehouse');
}

/** Суффикс ключа поля журнала: `journals.field.productName` → `productName`. */
function fieldOf(key: string): string {
  return key.split('.').pop() ?? '';
}

/**
 * Накладные склада бэкенд знает только по объекту верхнего уровня — подобъект
 * в документах не участвует, поэтому от выбранного объекта поднимаемся к корню.
 */
function receiptObjectIdOf(objects: ObjectItem[], objectId: string | null): string {
  if (objectId === null) return '';

  const byId = new Map(objects.map((object) => [object.id, object]));
  let current = byId.get(objectId);
  while (current?.parentObjectId) {
    current = byId.get(current.parentObjectId);
  }

  return current?.id ?? objectId;
}

/** Диеты групп объекта или подобъекта, без повторов, в порядке групп. */
function objectDiets(object: ObjectItem | undefined): GroupDiet[] {
  const seen = new Set<string>();
  const out: GroupDiet[] = [];
  for (const group of object?.groups ?? []) {
    for (const diet of group.diets ?? []) {
      if (seen.has(diet.id)) continue;
      seen.add(diet.id);
      out.push(diet);
    }
  }
  return out;
}

/** Приёмы пищи из диеты; пустой mealIds — все приёмы. */
function resolveActiveMeals(diet: Diet | undefined): MealId[] {
  const source = diet?.mealIds ?? [];
  if (source.length === 0) return MEALS.map((meal) => meal.id);
  const active = new Set(source);
  return MEALS.filter((meal) => active.has(meal.id)).map((meal) => meal.id);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dayLabelOf(startDate: string, day: number): string {
  const date = dateForCycleDay(startDate, day);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function slotKey(day: number, mealId: MealId): string {
  return `${day}-${mealId}`;
}

/**
 * Раздел «Автоматические журналы» [ЖУРН]:
 * каталог журналов, которые программа формирует из меню, порционника, накладных и ТТК.
 */
export function JournalsRoute() {
  const { current } = useOrganizations();

  if (current === null) {
    return (
      <Flex direction="column" className="journals-page">
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  return <JournalsCatalog />;
}

function JournalsCatalog() {
  const { t } = useTranslation();
  const { organizationFeatures } = useOrganizations();
  const toaster = useToaster();
  const api = useApi();
  const objects = useObjects();
  const diets = useDiets();
  const { objectId: savedObjectId, setObjectId: saveObjectId } = useObjectSelection();
  const [objectId, setObjectId] = useState<string | null>(null);
  const [dietId, setDietId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => startOfWeekMonday());
  const [opened, setOpened] = useState<AutoJournal | null>(null);

  const endDate = shiftIsoDate(startDate, JOURNAL_PERIOD_DAYS - 1);

  const objectsList = useMemo(() => planningObjects(objects.data?.objects), [objects.data]);
  const topLevelObjects = objectsList.filter((object) => !object.parentObjectId);
  const selectedObject = objectsList.find((object) => object.id === objectId);
  /** Объект, у которого ищем накладные для приёмки (корень, а не подобъект). */
  const receiptObjectId = receiptObjectIdOf(objects.data?.objects ?? [], objectId);

  useEffect(() => {
    if (topLevelObjects.length === 0) return;
    setObjectId(
      (current) =>
        current ??
        (savedObjectId && topLevelObjects.some((object) => object.id === savedObjectId)
          ? savedObjectId
          : topLevelObjects[0].id)
    );
  }, [topLevelObjects, savedObjectId]);

  const knownDietIds = useMemo(
    () => new Set((diets.data?.diets ?? []).map((diet) => diet.id)),
    [diets.data]
  );

  const groupDiets = objectDiets(selectedObject).filter((diet) => knownDietIds.has(diet.id));
  const dietOptions = useMemo<GroupDiet[]>(
    () =>
      groupDiets.length > 0
        ? groupDiets
        : (diets.data?.diets ?? []).map((diet) => ({ id: diet.id, name: diet.name })),
    [groupDiets, diets.data]
  );

  useEffect(() => {
    setDietId((current) =>
      current && dietOptions.some((option) => option.id === current)
        ? current
        : (dietOptions[0]?.id ?? null)
    );
  }, [dietOptions]);

  const diet = diets.data?.diets.find((item) => item.id === dietId);
  const activeMeals = resolveActiveMeals(diet);

  const scheduleParams = useMemo(
    () => (objectId && dietId ? { objectId, dietId, from: startDate, to: endDate } : null),
    [objectId, dietId, startDate, endDate]
  );
  const schedule = useSchedule(scheduleParams);
  const periodSynced = schedule.data !== undefined && !schedule.isPlaceholderData;

  /** Дни расписания по индексу 1..N — блюда приёмов для предзаполнения. */
  const slotMap = useMemo(() => {
    const map = new Map<string, Dish[]>();
    if (!periodSynced) return map;
    schedule.data.days.forEach((day, index) => {
      for (const slot of day.slots ?? []) {
        map.set(slotKey(index + 1, slot.mealId), slot.dishes ?? []);
      }
    });
    return map;
  }, [schedule.data, periodSynced]);

  const objectOptions = topLevelObjects.map((object) => ({
    label: object.name,
    options: [
      { value: object.id, content: object.name },
      ...objectsList
        .filter((candidate) => candidate.parentObjectId === object.id)
        .map((subObject) => ({ value: subObject.id, content: subObject.name })),
    ],
  }));

  const mealLabelOf = (mealId: MealId): string => {
    const meal = MEALS.find((item) => item.id === mealId);
    return meal ? t(meal.labelKey) : mealId;
  };

  /** Значение ячейки предзаполненной строки по ключу поля. */
  const valueForField = (key: string, day: number, mealId: MealId, dishes: Dish[]): string => {
    switch (fieldOf(key)) {
      case 'date':
        return dayLabelOf(startDate, day);
      case 'meal':
        return mealLabelOf(mealId);
      case 'dishes':
        return dishes.map((dish) => dish.name).join(' | ');
      case 'output':
        return dishes.map((dish) => `${dish.yieldNet} г`).join(' | ');
      default:
        return '';
    }
  };

  /**
   * Строки журнала приёмки: одна строка — одна партия накладной объекта,
   * накладные идут по возрастанию даты, как их подписывают.
   *
   * Накладные берутся за выбранную неделю. Если за неделю их нет, печатаем
   * всё, что у объекта есть, иначе форма выходит пустой; тогда же в `range`
   * возвращается фактический период строк — его и печатаем в шапке.
   */
  const warehouseRows = async (columns: JournalPrintColumn[]): Promise<WarehouseFill> => {
    if (receiptObjectId === '') return { rows: [] };

    const all = await fetchAllReceipts(api, receiptObjectId);
    const period = all.filter((item) => receiptInPeriod(item.date, startDate, endDate));
    const source = period.length > 0 ? period : all;
    if (source.length === 0) return { rows: [] };

    const receipts = await fetchReceiptsByIds(
      api,
      source.map((item) => item.id)
    );
    receipts.sort(byReceiptDate);

    const rows = receipts.flatMap((receipt) =>
      receipt.items.map((item) => {
        const values = receiptRowValues(receipt, item);
        return columns.map((column) => values[fieldOf(column.key)] ?? '');
      })
    );
    if (rows.length === 0) return { rows };

    return {
      rows,
      range:
        period.length > 0
          ? undefined
          : { from: receipts[0].date, to: receipts[receipts.length - 1].date },
    };
  };

  const printJournal = async (journal: AutoJournal): Promise<void> => {
    try {
      const columns = journalColumns(journal, (key) => t(key));
      const rows: string[][] = [];
      let periodLabel = formatDateRange(startDate, JOURNAL_PERIOD_DAYS);

      if (WAREHOUSE_FILL_JOURNALS.has(journal.id)) {
        const fill = await warehouseRows(columns);
        rows.push(...fill.rows);
        if (fill.range) {
          periodLabel = `${formatDate(fill.range.from)} – ${formatDate(fill.range.to)}`;
        }
        if (fill.rows.length === 0) {
          toaster.add({
            name: 'journal-print-empty',
            title: t('journals.printEmptyTitle'),
            content: t('journals.printEmptyContent'),
            theme: 'warning',
          });
        }
      } else if (periodSynced && prefilledFromMenu(journal)) {
        for (let day = 1; day <= JOURNAL_PERIOD_DAYS; day += 1) {
          for (const mealId of activeMeals) {
            const dishes = slotMap.get(slotKey(day, mealId)) ?? [];
            if (dishes.length === 0) continue;
            rows.push(columns.map((column) => valueForField(column.key, day, mealId, dishes)));
          }
        }
      }

      for (let i = rows.length; i < MIN_PRINT_ROWS; i += 1) {
        rows.push(columns.map(() => ''));
      }

      const subtitle = [selectedObject?.name, diet?.name].filter(Boolean).join(' · ');

      await downloadJournalDoc({
        title: t(journal.titleKey),
        tag: t(journal.tagKey),
        subtitle,
        period: periodLabel,
        columns,
        rows,
      });
    } catch (error) {
      toaster.add({
        name: 'journal-print-error',
        title: t('common.error'),
        content: error instanceof Error ? error.message : t('common.unknownError'),
        theme: 'danger',
      });
    }
  };

  /** Журнал заполняется из меню, только если среди полей есть меню-поля. */
  const prefilledFromMenu = (journal: AutoJournal): boolean => {
    if (!journal.sources.includes('menu')) return false;
    return [...journal.autoFieldKeys, ...journal.manualFieldKeys].some((key) =>
      ['date', 'meal', 'dishes', 'output'].includes(fieldOf(key))
    );
  };

  /** Пока расписание не подтянуто, меню-журналы печатать нечего — форма будет пустой. */
  const printBlocked = (journal: AutoJournal): boolean =>
    prefilledFromMenu(journal) && !periodSynced;

  const goToWeek = (iso: string) => {
    const next = startOfWeekMonday(iso);
    if (next !== startDate) setStartDate(next);
  };

  return (
    <div className="journals-page">
      <Flex className="journals-toolbar" alignItems="center" justifyContent="space-between" gap={3}>
        <Flex alignItems="center" gap={2}>
          {organizationFeatures?.objectsEnabled === true && (
            <Select
              size="l"
              label={t('journals.objectLabel')}
              width={280}
              value={objectId ? [objectId] : []}
              placeholder={t('journals.objectLabel')}
              onUpdate={(values) => {
                const next = values[0] ?? null;
                setObjectId(next);
                if (next) saveObjectId(next);
              }}
              options={objectOptions}
              disabled={objectsList.length === 0}
            />
          )}
          <Select
            size="l"
            label={t('journals.dietLabel')}
            width={200}
            value={dietId ? [dietId] : []}
            placeholder={t('journals.dietLabel')}
            onUpdate={(values) => setDietId(values[0] ?? null)}
            options={dietOptions.map((item) => ({ value: item.id, content: item.name }))}
            disabled={dietOptions.length === 0}
          />
        </Flex>

        <Flex alignItems="center" gap={1}>
          <Button
            view="outlined"
            size="l"
            title={t('journals.prevPeriod')}
            onClick={() => setStartDate(shiftIsoDate(startDate, -JOURNAL_PERIOD_DAYS))}
          >
            <Icon data={ChevronLeft} size={16} />
          </Button>
          <TextInput
            className="journals-week-field"
            size="l"
            value={formatDateRange(startDate, JOURNAL_PERIOD_DAYS)}
            readOnly
            endContent={
              <Button
                view="flat"
                size="s"
                title={t('journals.currentPeriod')}
                onClick={() => goToWeek(startOfWeekMonday())}
              >
                <Icon data={ArrowRotateLeft} size={14} />
              </Button>
            }
          />
          <Button
            view="outlined"
            size="l"
            title={t('journals.nextPeriod')}
            onClick={() => goToWeek(shiftIsoDate(startDate, JOURNAL_PERIOD_DAYS))}
          >
            <Icon data={ChevronRight} size={16} />
          </Button>
        </Flex>
      </Flex>

      <div className="journals-grid">
        {AUTO_JOURNALS.map((journal) => (
          <Card
            key={journal.id}
            view="filled"
            className="journals-card"
            onClick={() => setOpened(journal)}
          >
            <Flex direction="column" gap={2}>
              <Flex alignItems="center" justifyContent="space-between" gap={2}>
                <Text variant="subheader-2">{t(journal.titleKey)}</Text>
                <Button
                  view="normal"
                  size="l"
                  title={t('journals.print')}
                  disabled={printBlocked(journal)}
                  onClick={(event) => {
                    event.stopPropagation();
                    void printJournal(journal);
                  }}
                >
                  <Icon data={Printer} size={16} />
                </Button>
              </Flex>
              <Text variant="body-2" color="secondary">
                {t(journal.descriptionKey)}
              </Text>
              <Flex alignItems="center" gap={1} wrap>
                <Label theme="info" size="xs">
                  {t('journals.priority.' + journal.priority)}
                </Label>
                {journal.sources.map((source) => (
                  <Label key={source} theme="unknown" size="xs">
                    {t(JOURNAL_SOURCE_KEYS[source])}
                  </Label>
                ))}
              </Flex>
            </Flex>
          </Card>
        ))}
      </div>

      <JournalDrawer
        journal={opened}
        printDisabled={opened ? printBlocked(opened) : false}
        onClose={() => setOpened(null)}
        onPrint={printJournal}
      />
    </div>
  );
}
