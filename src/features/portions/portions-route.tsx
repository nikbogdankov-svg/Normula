import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import {
  Button,
  Card,
  Dialog,
  Flex,
  Icon,
  SegmentedRadioGroup,
  Select,
  Table,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import {
  ChevronLeft,
  ChevronRight,
  Magnifier,
  Printer,
  Receipt,
  Sticker,
  TriangleExclamation,
} from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { i18n, useTranslation } from '@/shared/i18n';
import type { jsPDF } from 'jspdf';
import {
  createPdfDoc,
  drawTextCell,
  PDF_BODY_SIZE,
  PDF_CELL_PADDING,
  PDF_CONTENT_WIDTH,
  PDF_GRID_COLOR,
  PDF_HEADER_FILL,
  PDF_LINE_HEIGHT,
  PDF_MARGIN,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  PDF_TEXT_COLOR,
  PDF_TEXT_COLOR_MUTED,
  wrapText,
} from '@/shared/print';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useObjects } from '@/features/objects/api';
import { useObjectSelection } from '@/shared/object-selection';
import type { ObjectGroup, ObjectItem } from '@/features/objects/types';
import {
  useCopyPortionsDay,
  useDishDistribution,
  usePortionsDay,
  useStickerRecipes,
  useUpdatePortionHeadcount,
} from './api';
import { downloadStickersDoc, type StickerRow } from './portions-stickers';
import { MEALS, type MealId } from '@/features/menu/types';
import { todayIso, shiftIso, type DishDistributionRow, type PortionsView } from './types';
import './portions-route.css';
import { errorText } from '@/shared/api/error-text';

const ALL_SUBOBJECTS = '__all';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Порядок приёмов пищи в течение дня — для сортировки строк по блюдам. */
const MEALS_ORDER: Record<MealId, number> = Object.fromEntries(
  MEALS.map((meal, index) => [meal.id, index])
) as Record<MealId, number>;

/** Название приёма пищи по его id — подпись под названием блюда. */
const MEAL_LABEL_KEYS: Record<MealId, string> = Object.fromEntries(
  MEALS.map((meal) => [meal.id, meal.labelKey])
) as Record<MealId, string>;

/** Килограммы на строку: порции × выход порции из ТТК (граммы); 0 — выход не задан. */
function kilogramsOf(portions: number, yieldNet: number): number | null {
  return yieldNet > 0 ? (portions * yieldNet) / 1000 : null;
}

/**
 * Единица порционника: объект или подобъект, у которого есть группы.
 * Отделение таблицы — группа, стол — диета группы.
 */
interface PortionUnit {
  id: string;
  name: string;
  /** Объект верхнего уровня: сам объект или родитель подобъекта. */
  parentId: string;
  parentName: string;
  groups: ObjectGroup[];
}

/** Объекты верхнего уровня, кроме складов: у них нет численности и меню. */
function topLevelObjects(objects: ObjectItem[]): ObjectItem[] {
  return objects.filter((object) => !object.parentObjectId && object.type !== 'warehouse');
}

/** Единицы порционника в порядке объектов: объект, за ним его подобъекты. */
function portionUnits(objects: ObjectItem[]): PortionUnit[] {
  const units: PortionUnit[] = [];
  for (const parent of topLevelObjects(objects)) {
    const family = [parent, ...objects.filter((object) => object.parentObjectId === parent.id)];
    for (const unit of family) {
      if (unit.type === 'warehouse' || (unit.groups ?? []).length === 0) continue;
      units.push({
        id: unit.id,
        name: unit.name,
        parentId: parent.id,
        parentName: parent.name,
        groups: unit.groups ?? [],
      });
    }
  }
  return units;
}

/**
 * «Порционник»: численность на дату и раздачу по блюдам.
 * ПОРЦ-01…03 + бывший «Выход на раздачу».
 */
export function PortionsRoute() {
  const { current } = useOrganizations();
  const { t } = useTranslation();
  const objects = useObjects();
  // Дата живёт в адресе страницы: перезагрузка или редирект (например,
  // обновление токена Logto) не сбрасывают выбор на сегодня.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDate = searchParams.get('date');
  const date = ISO_DATE_RE.test(rawDate ?? '') ? (rawDate as string) : todayIso();

  const setDate = (next: string) => {
    setSearchParams(next === todayIso() ? {} : { date: next }, { replace: true });
  };

  const [view, setView] = useState<PortionsView>('organizations');
  const [selectedId, setSelectedId] = useState<string>(ALL_SUBOBJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [dishSearchQuery, setDishSearchQuery] = useState('');
  const portions = usePortionsDay(date);
  // Вчерашние данные нужны только на будущей дате — иначе запрос выключен.
  const yesterday = usePortionsDay(date > todayIso() ? shiftIso(date, -1) : '');
  const copyDay = useCopyPortionsDay();
  const toaster = useToaster();

  // Объекты верхнего уровня; селект готов к произвольному числу.
  const objectsList = useMemo(() => topLevelObjects(objects.data?.objects ?? []), [objects.data]);
  const units = useMemo(() => portionUnits(objects.data?.objects ?? []), [objects.data]);
  const { objectId: savedObjectId, setObjectId, clearObjectId } = useObjectSelection();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const objectListIds = useMemo(() => objectsList.map((object) => object.id), [objectsList]);
  const preferredObjectId =
    savedObjectId && objectListIds.includes(savedObjectId) ? savedObjectId : objectsList[0]?.id;
  const activeObjectId = selectedObjectId ?? preferredObjectId ?? null;

  // В «По объектам» глобальный выбор подхватывается, пока пользователь не
  // выбрал своё («Все»), иначе остаётся прежний дефолт. Значение хранится в
  // формате object:<id>.
  useEffect(() => {
    if (selectedId !== ALL_SUBOBJECTS) return;
    if (savedObjectId && objectListIds.includes(savedObjectId)) {
      setSelectedId(`object:${savedObjectId}`);
    }
  }, [savedObjectId, objectListIds, selectedId]);

  const dishes = useDishDistribution(date, activeObjectId);

  // Наклейки на термос: состав и КБЖУ берём из ТТК по именам блюд раздачи.
  const stickerDishNames = useMemo(
    () => [...new Set((dishes.data?.rows ?? []).map((row) => row.dishName))],
    [dishes.data]
  );
  const stickerRecipes = useStickerRecipes(stickerDishNames);
  // Выбранная строка (блюдо×отделение): null — диалог закрыт. Наклейки
  // печатаются только на это отделение.
  const [stickerRow, setStickerRow] = useState<DishDistributionRow | null>(null);
  const [stickerExpiry, setStickerExpiry] = useState('');

  const stickerRows = useMemo(() => {
    const target = stickerRow;
    return (dishes.data?.rows ?? [])
      .filter(
        (row) =>
          target === null ||
          (row.dishName === target.dishName &&
            row.subObjectName === target.subObjectName &&
            row.departmentName === target.departmentName)
      )
      .map((row) => {
        const recipe = stickerRecipes.recipes?.get(row.dishName.trim().toLowerCase());
        return {
          dishName: row.dishName,
          objectName: row.objectName,
          subObjectName: row.subObjectName,
          departmentName: row.departmentName,
          tableName: row.tableName,
          portions: row.portions,
          yieldNet: row.yieldNet,
          recipe: recipe ?? null,
        } satisfies StickerRow;
      });
  }, [dishes.data, stickerRecipes.recipes, stickerRow]);

  const downloadStickers = () => {
    void downloadStickersDoc({
      rows: stickerRows,
      manufactureDate: todayIso(),
      expiry: stickerExpiry.trim() || '—',
    });
  };

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  if (objects.isPending) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <LoadingState />
      </Flex>
    );
  }

  if (objects.isError || !objects.data) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      </Flex>
    );
  }

  const subObjects = units;
  const query = searchQuery.trim().toLowerCase();
  const objectOptions = objectsList
    .filter((unit) => !query || unit.name.toLowerCase().includes(query))
    .map((unit) => ({ value: `object:${unit.id}`, content: unit.name }));
  const selectedUnit = selectedId.startsWith('object:')
    ? (objectsList.find((unit) => `object:${unit.id}` === selectedId) ?? null)
    : null;
  const scopeSubObjects = selectedUnit
    ? units.filter((unit) => unit.parentId === selectedUnit.id)
    : units;
  // Подобъект → его главный объект (для подписи в таблице).
  const parentObjectName: Record<string, string> = {};
  for (const unit of units) parentObjectName[unit.id] = unit.parentName;

  const isFutureDate = date > todayIso();
  /** null — записи ещё нет (например, будущая дата): инпут показываем пустым. */
  const headcountOf = (objectId: string, groupId: string, dietId: string) => {
    const entry = (portions.data?.entries ?? []).find(
      (item) => item.objectId === objectId && item.groupId === groupId && item.dietId === dietId
    );
    return entry ? entry.headcount : null;
  };

  // Сводка для печатного документа и скачивания — общая на оба сценария.
  const printData = buildPortionsPrintRows(scopeSubObjects, parentObjectName, headcountOf);

  /** Копирует вчерашнюю численность на выбранную дату одним запросом. */
  const fillFromYesterday = () => {
    copyDay.mutate(
      { from: shiftIso(date, -1), to: date },
      {
        onError: (e) =>
          toaster.add({
            name: 'portions-fill',
            title: t('portions.fillError'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <Flex alignItems="center" gap={3} wrap>
        <Flex alignItems="center" gap={1}>
          <Button
            view="outlined"
            size="l"
            title={t('portions.prevDay')}
            onClick={() => setDate(shiftIso(date, -1))}
          >
            <Icon data={ChevronLeft} size={16} />
          </Button>
          <DatePicker
            size="l"
            value={dateTime({ input: date })}
            onUpdate={(value) => setDate(value ? value.format('YYYY-MM-DD') : todayIso())}
            style={{ width: 180 }}
          />
          <Button
            view="outlined"
            size="l"
            title={t('portions.nextDay')}
            onClick={() => setDate(shiftIso(date, 1))}
          >
            <Icon data={ChevronRight} size={16} />
          </Button>
        </Flex>
        <SegmentedRadioGroup
          size="l"
          value={view}
          onUpdate={(value) => setView(value as PortionsView)}
        >
          <SegmentedRadioGroup.Option value="organizations" content={t('portions.byObjects')} />
          <SegmentedRadioGroup.Option value="dishes" content={t('portions.byDishes')} />
        </SegmentedRadioGroup>
      </Flex>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={4}
          wrap
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={Receipt} size={16} />
            <Text variant="subheader-2">
              {view === 'dishes' ? t('portions.titleDishes') : t('portions.titleObjects')}
            </Text>
          </Flex>
          <Flex alignItems="center" gap={2}>
            {view === 'organizations' && subObjects.length > 0 && (
              <>
                <TextInput
                  size="m"
                  placeholder={t('portions.searchObjects')}
                  value={searchQuery}
                  onUpdate={setSearchQuery}
                  hasClear
                  style={{ width: 240 }}
                  startContent={
                    <span
                      style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}
                    >
                      <Icon data={Magnifier} size={16} />
                    </span>
                  }
                />
                <Select
                  size="m"
                  width={280}
                  label={t('portions.objectLabel')}
                  title={t('portions.objectLabel')}
                  value={[selectedId]}
                  onUpdate={(value) => {
                    const next = value[0] ?? ALL_SUBOBJECTS;
                    setSelectedId(next);
                    if (next === ALL_SUBOBJECTS) {
                      clearObjectId();
                    } else if (next.startsWith('object:')) {
                      setObjectId(next.slice('object:'.length));
                    }
                  }}
                  placeholder={t('portions.objectPlaceholder')}
                  options={[{ value: ALL_SUBOBJECTS, content: t('common.all') }, ...objectOptions]}
                />
              </>
            )}
            {view === 'dishes' && objectsList.length > 0 && (
              <>
                <TextInput
                  size="m"
                  placeholder={t('portions.searchDishes')}
                  value={dishSearchQuery}
                  onUpdate={setDishSearchQuery}
                  hasClear
                  style={{ width: 240 }}
                  startContent={
                    <span
                      style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}
                    >
                      <Icon data={Magnifier} size={16} />
                    </span>
                  }
                />
                <Select
                  size="m"
                  width={280}
                  label={t('portions.objectLabel')}
                  title={t('portions.objectLabel')}
                  value={activeObjectId ? [activeObjectId] : []}
                  onUpdate={(value) => {
                    const next = value[0] ?? null;
                    setSelectedObjectId(next);
                    if (next) setObjectId(next);
                    else clearObjectId();
                  }}
                  options={objectsList.map((unit) => ({
                    value: unit.id,
                    content: unit.name,
                  }))}
                />
              </>
            )}
            <Button
              view="normal"
              onClick={() =>
                void downloadPortionsDoc({
                  date,
                  rows: printData.rows,
                  grand: printData.grand,
                })
              }
              title={t('portions.print')}
            >
              <Icon data={Printer} size={16} />
            </Button>
          </Flex>
        </Flex>

        <div
          style={{
            borderTop: '1px solid var(--g-color-line-generic)',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          {view === 'organizations' && (
            <>
              {/* Баннер не зависит от состояния запроса: не мигает и не
                  пропадает на время рефретчей. */}
              {isFutureDate && (
                <Flex alignItems="center" gap={2} wrap style={{ padding: '8px 16px' }}>
                  <Icon data={TriangleExclamation} size={16} />
                  <Text variant="body-2" style={{ color: 'var(--g-color-text-secondary)' }}>
                    {t('portions.futureDate')}
                  </Text>
                  <Button size="s" view="normal" onClick={() => setDate(todayIso())}>
                    {t('portions.goToday')}
                  </Button>
                  {/* Кнопку заполнения показываем, пока день пуст; после
                      заполнения остаются только надпись и переход на сегодня. */}
                  {subObjects.length > 0 && (portions.data?.entries?.length ?? 0) === 0 && (
                    <Button
                      size="s"
                      view="action"
                      style={{ marginLeft: 'auto' }}
                      loading={copyDay.isPending}
                      disabled={!yesterday.data || (yesterday.data.entries?.length ?? 0) === 0}
                      onClick={fillFromYesterday}
                    >
                      {t('portions.fillYesterday')}
                    </Button>
                  )}
                </Flex>
              )}
              {portions.isPending && <LoadingState />}
              {portions.isError && (
                <ErrorState error={portions.error} onRetry={() => void portions.refetch()} />
              )}
              {!portions.isPending && !portions.isError && subObjects.length === 0 && (
                <EmptyState text={t('portions.emptyAddSubObjects')} />
              )}
              {!portions.isPending && !portions.isError && subObjects.length > 0 && (
                <SummaryPortionsTable
                  date={date}
                  subObjects={scopeSubObjects}
                  parentObjectName={parentObjectName}
                  headcountOf={headcountOf}
                />
              )}
            </>
          )}

          {view === 'dishes' && (
            <DishesDistributionTable
              loading={dishes.isPending}
              error={dishes.isError ? dishes.error : null}
              onRetry={() => void dishes.refetch()}
              onFill={() => setView('organizations')}
              onSticker={(row) => setStickerRow(row)}
              rows={
                dishSearchQuery
                  ? (dishes.data?.rows ?? []).filter((r) =>
                      r.dishName.toLowerCase().includes(dishSearchQuery.toLowerCase())
                    )
                  : (dishes.data?.rows ?? [])
              }
              totalPortions={dishes.data?.totalPortions ?? 0}
            />
          )}
        </div>
      </Card>

      <Dialog open={stickerRow !== null} onClose={() => setStickerRow(null)} size="s">
        <Dialog.Header
          caption={
            stickerRow
              ? t('portions.stickerTitle', { dish: stickerRow.dishName })
              : t('portions.stickersTitle')
          }
        />
        <Dialog.Divider />
        <Dialog.Body>
          {stickerRecipes.isPending && <LoadingState />}
          {stickerRecipes.isError && <ErrorState error={stickerRecipes.error} />}
          {!stickerRecipes.isPending && !stickerRecipes.isError && stickerRow && (
            <Flex direction="column" gap={3}>
              <Text variant="body-2">
                {stickerRow.subObjectName} · {stickerRow.departmentName}
              </Text>
              <TextInput
                size="l"
                label={t('portions.expiryLabel')}
                placeholder={t('portions.expiryPlaceholder')}
                value={stickerExpiry}
                onUpdate={setStickerExpiry}
                hasClear
              />
            </Flex>
          )}
        </Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer
          onClickButtonApply={downloadStickers}
          onClickButtonCancel={() => setStickerRow(null)}
          textButtonApply={t('portions.downloadPdf')}
          textButtonCancel={t('common.cancel')}
          propsButtonApply={{ disabled: stickerRecipes.isPending || stickerRows.length === 0 }}
        />
      </Dialog>
    </Flex>
  );
}

function HeadcountInput({
  value,
  defaultHeadcount,
  onCommit,
}: {
  /** null — записи ещё нет: показываем пустое поле. */
  value: number | null;
  /** Сохранённая численность стола — плейсхолдер пустого поля. */
  defaultHeadcount: number;
  onCommit: (headcount: number) => void;
}) {
  // Черновик живёт, пока поле в фокусе: сохраняем по blur/Enter,
  // а не на каждое нажатие — иначе рефретчи сбрасывают недопечатанное.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <TextInput
      type="number"
      size="s"
      className="portions-headcount-input"
      value={draft ?? (value === null ? '' : String(value))}
      controlProps={{ min: 0 }}
      placeholder={String(defaultHeadcount)}
      style={{ width: 96 }}
      onUpdate={setDraft}
      onBlur={() => {
        if (draft === null) return;
        const parsed = Number(draft);
        setDraft(null);
        if (!Number.isFinite(parsed)) return;
        const headcount = Math.max(0, parsed);
        if (headcount !== value) onCommit(headcount);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function SummaryPortionsTable({
  date,
  subObjects,
  parentObjectName,
  headcountOf,
}: {
  date: string;
  subObjects: PortionUnit[];
  parentObjectName: Record<string, string>;
  headcountOf: (objectId: string, groupId: string, dietId: string) => number | null;
}) {
  const update = useUpdatePortionHeadcount();
  const toaster = useToaster();
  const { t } = useTranslation();

  const commit = (
    row: { subObjectId: string; departmentId: string; tableId: string },
    headcount: number
  ) => {
    update.mutate(
      {
        date,
        objectId: row.subObjectId,
        groupId: row.departmentId,
        dietId: row.tableId,
        headcount,
      },
      {
        onError: (e) =>
          toaster.add({
            name: 'portions-headcount',
            title: t('portions.saveError'),
            content: errorText(e),
            theme: 'danger',
          }),
      }
    );
  };

  const rows = useMemo(() => {
    type Row = {
      id: string;
      subObjectId: string;
      departmentId: string;
      tableId: string;
      subObjectName: string;
      departmentName: string;
      tableName: string;
      headcount: number | null;
      defaultHeadcount: number;
      showSubObject: boolean;
      showDepartment: boolean;
      isLastInSubObject: boolean;
      isLastInDepartment: boolean;
      isTotal: boolean;
      isLastRow?: boolean;
    };

    const data: Row[] = [];
    let grand = 0;

    for (const subObject of subObjects) {
      const subObjectRows: {
        id: string;
        subObjectId: string;
        departmentId: string;
        tableId: string;
        subObjectName: string;
        departmentName: string;
        tableName: string;
        headcount: number | null;
        defaultHeadcount: number;
      }[] = [];
      for (const department of subObject.groups) {
        for (const table of department.diets ?? []) {
          const headcount = headcountOf(subObject.id, department.id, table.id);
          grand += headcount ?? 0;
          subObjectRows.push({
            id: `${subObject.id}-${department.id}-${table.id}`,
            subObjectId: subObject.id,
            departmentId: department.id,
            tableId: table.id,
            subObjectName: subObject.name,
            departmentName: department.name,
            tableName: table.name,
            headcount,
            // Численности «по умолчанию» у диеты группы нет — плейсхолдер 0.
            defaultHeadcount: 0,
          });
        }
      }
      subObjectRows.forEach((row, index) => {
        const prev = index > 0 ? subObjectRows[index - 1] : null;
        const next = index < subObjectRows.length - 1 ? subObjectRows[index + 1] : null;
        data.push({
          ...row,
          showSubObject: index === 0,
          showDepartment: !prev || prev.departmentName !== row.departmentName,
          isLastInSubObject: next === null,
          isLastInDepartment: !next || next.departmentName !== row.departmentName,
          isTotal: false,
        });
      });
    }

    if (data.length === 0) return data;
    data[data.length - 1].isLastRow = true;
    return [
      ...data,
      {
        id: '__grand',
        // Идентификаторов у итоговой строки нет — заглушки нужны, чтобы
        // объединение с обычными строками осталось однородным. Читаются
        // они только в ветке isTotal === false, то есть никогда.
        subObjectId: '__grand',
        departmentId: '__grand',
        tableId: '__grand',
        subObjectName: '',
        departmentName: '',
        tableName: '',
        headcount: grand,
        defaultHeadcount: 0,
        showSubObject: true,
        showDepartment: false,
        isLastInSubObject: true,
        isLastInDepartment: true,
        isTotal: true,
      },
    ];
  }, [subObjects, headcountOf]);

  if (rows.length === 0) {
    return <EmptyState text={t('portions.emptySummary')} />;
  }

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table portions-group-table portions-summary-table"
        data={rows}
        getRowClassNames={(row) => {
          const classes: string[] = [];
          if (row.isTotal) return classes;
          if (row.isLastRow) classes.push('portions-row_before-total');
          classes.push('objects-group-row_no-divider');
          // Первая строка отделения — больше отступ сверху.
          if (row.showDepartment) classes.push('objects-group-row_department-start');
          // Граница отделения/подобъекта — линия под последней строкой группы.
          if (row.isLastInDepartment && !row.isLastRow) {
            classes.push('objects-group-row_divider');
            // Между отделениями линия начинается от «Отделение»; между
            // подобъектами — на всю ширину (без модификатора «отделение»).
            if (!row.isLastInSubObject) classes.push('objects-group-row_department-divider');
          }
          return classes;
        }}
        columns={[
          {
            id: 'subObjectName',
            name: t('portions.colObject'),
            width: '28%',
            template: (row) =>
              row.isTotal ? (
                <Text variant="body-2" style={{ fontWeight: 600 }}>
                  {t('portions.total')}
                </Text>
              ) : row.showSubObject ? (
                <Flex direction="column">
                  <Text variant="body-2" style={{ fontWeight: 600 }}>
                    {row.subObjectName}
                  </Text>
                  {row.subObjectName !== parentObjectName[row.subObjectId] && (
                    <Text variant="body-1" color="secondary">
                      {t('portions.subObjectOf', { name: parentObjectName[row.subObjectId] })}
                    </Text>
                  )}
                </Flex>
              ) : null,
            placeholder: () => null,
          },
          {
            id: 'departmentName',
            name: t('portions.colDepartment'),
            width: '28%',
            template: (row) =>
              row.isTotal ? null : row.showDepartment ? row.departmentName : null,
            placeholder: () => null,
          },
          {
            id: 'tableName',
            name: t('portions.colTable'),
            width: '24%',
            template: (row) => (row.isTotal ? null : row.tableName),
            placeholder: () => null,
          },
          {
            id: 'headcount',
            name: t('portions.colPeople'),
            width: '20%',
            align: 'end',
            template: (row) =>
              row.isTotal ? (
                <span className="portions-total-headcount">{row.headcount}</span>
              ) : (
                <HeadcountInput
                  value={row.headcount}
                  defaultHeadcount={row.defaultHeadcount}
                  onCommit={(headcount) => commit(row, headcount)}
                />
              ),
          },
        ]}
      />
    </div>
  );
}

/** Пустое состояние раздачи: ведёт на вкладку заполнения порционника. */
function DishesEmptyState({ onFill }: { onFill: () => void }) {
  const { t } = useTranslation();
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{ padding: '16px 48px' }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--g-color-base-generic)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon data={TriangleExclamation} size={20} />
      </div>
      <Text variant="subheader-2" style={{ marginTop: 12 }}>
        {t('portions.noData')}
      </Text>
      <Text variant="body-2" color="secondary" style={{ marginTop: 2 }}>
        {t('portions.fillByOrg')}
      </Text>
      <Button view="action" style={{ marginTop: 12 }} onClick={onFill}>
        {t('portions.fillPortions')}
      </Button>
    </Flex>
  );
}

function DishesDistributionTable({
  loading,
  error,
  onRetry,
  onFill,
  onSticker,
  rows,
  totalPortions,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onFill: () => void;
  /** Открывает диалог наклеек на строку блюдо×отделение. */
  onSticker: (row: DishDistributionRow) => void;
  rows: DishDistributionRow[];
  totalPortions: number;
}) {
  const { t } = useTranslation();
  const tableRows = useMemo(() => {
    type DistRow = DishDistributionRow & {
      id: string;
      isDishTotal: boolean;
      isGrandTotal: boolean;
      showDish: boolean;
      showSubObject: boolean;
      showDepartment: boolean;
      isFirstInDish: boolean;
      isLastInDish: boolean;
      isLastInSubObject: boolean;
      isLastInDepartment: boolean;
      isBeforeTotal?: boolean;
      /** Килограммы строки/итога; null — вес порции не найден в ТТК. */
      weightKg: number | null;
    };

    // Одно и то же блюдо должно идти подряд одним блоком (как подобъекты
    // в «По объектам»): группировка ниже склеивает только соседние строки.
    // Сортировка стабильная — исходный порядок внутри блюда сохраняется.
    const grouped = (rows as { dishName: string; mealId: MealId }[]).slice().sort((a, b) => {
      const byDish = a.dishName.localeCompare(b.dishName, 'ru');
      return byDish !== 0 ? byDish : MEALS_ORDER[a.mealId] - MEALS_ORDER[b.mealId];
    }) as DishDistributionRow[];

    const result: DistRow[] = [];
    let index = 0;
    let grandKg = 0;
    let grandHasWeight = false;
    while (index < grouped.length) {
      const dishName = grouped[index].dishName;
      const dishStart = index;
      while (index < grouped.length && grouped[index].dishName === dishName) index += 1;
      const dishRows = grouped.slice(dishStart, index);
      let dishPortions = 0;
      let dishKg = 0;
      let dishHasWeight = false;

      for (let i = 0; i < dishRows.length; i += 1) {
        const row = dishRows[i];
        const prev = i > 0 ? dishRows[i - 1] : null;
        const next = i < dishRows.length - 1 ? dishRows[i + 1] : null;
        const sameSubObjectAsPrev = prev !== null && prev.subObjectName === row.subObjectName;
        const sameDepartmentAsPrev =
          sameSubObjectAsPrev && prev !== null && prev.departmentName === row.departmentName;
        const sameSubObjectAsNext = next !== null && next.subObjectName === row.subObjectName;
        const sameDepartmentAsNext =
          sameSubObjectAsNext && next !== null && next.departmentName === row.departmentName;
        const weightKg = kilogramsOf(row.portions, row.yieldNet ?? 0);
        dishPortions += row.portions;
        if (weightKg !== null) {
          dishKg += weightKg;
          dishHasWeight = true;
        }
        result.push({
          ...row,
          id: String(dishStart + i),
          isDishTotal: false,
          isGrandTotal: false,
          showDish: i === 0,
          showSubObject: !sameSubObjectAsPrev,
          showDepartment: !sameDepartmentAsPrev,
          isFirstInDish: i === 0,
          isLastInDish: next === null,
          isLastInSubObject: !sameSubObjectAsNext,
          isLastInDepartment: !sameDepartmentAsNext,
          weightKg,
        });
      }

      if (dishHasWeight) {
        grandKg += dishKg;
        grandHasWeight = true;
      }

      result.push({
        id: `__dish-total-${dishName}`,
        dishName,
        mealId: dishRows[0].mealId,
        yieldNet: 0,
        objectName: '',
        subObjectName: '',
        departmentName: '',
        tableName: '',
        portions: dishPortions,
        isDishTotal: true,
        isGrandTotal: false,
        showDish: true,
        showSubObject: false,
        showDepartment: false,
        isFirstInDish: false,
        isLastInDish: true,
        isLastInSubObject: true,
        isLastInDepartment: true,
        weightKg: dishHasWeight ? dishKg : null,
      });
    }

    if (result.length > 0) {
      result.push({
        id: '__grand-total',
        dishName: t('portions.grandTotalLabel'),
        mealId: rows[0].mealId,
        yieldNet: 0,
        objectName: '',
        subObjectName: '',
        departmentName: '',
        tableName: '',
        portions: totalPortions,
        isDishTotal: false,
        isGrandTotal: true,
        showDish: true,
        showSubObject: false,
        showDepartment: false,
        isFirstInDish: false,
        isLastInDish: true,
        isLastInSubObject: true,
        isLastInDepartment: true,
        weightKg: grandHasWeight ? grandKg : null,
      });
    }

    // Линия над «Всего» (по блюду и общим итогом) — заметнее остальных.
    for (let i = 0; i < result.length - 1; i += 1) {
      const next = result[i + 1];
      if (next.isDishTotal || next.isGrandTotal) {
        result[i].isBeforeTotal = true;
      }
    }

    return result;
  }, [rows, totalPortions, t]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <DishesEmptyState onFill={onFill} />;
  }

  return (
    <div className="admin-table-wrap">
      <Table
        width="max"
        className="admin-table portions-group-table portions-dishes-table"
        data={tableRows}
        getRowClassNames={(row) => {
          const classes: string[] = [];
          if (row.isBeforeTotal) classes.push('portions-row_before-total');
          if (row.isDishTotal || row.isGrandTotal) {
            if (row.isDishTotal) classes.push('portions-row_dish-total');
            return classes;
          }
          classes.push('objects-group-row_no-divider');
          // Первая строка отделения — больше отступ сверху.
          if (row.showDepartment) classes.push('objects-group-row_department-start');
          // Граница отделения/подобъекта — линия под последней строкой группы.
          if (row.isLastInDepartment && !row.isLastInDish) {
            classes.push('objects-group-row_divider');
            if (!row.isLastInSubObject) {
              // Между отделениями линия начинается от «Отделение».
              classes.push('objects-group-row_department-divider');
            } else {
              // Между подобъектами линия начинается от «Подобъект» (без «Блюдо»).
              classes.push('objects-group-row_facility-divider');
            }
          }
          return classes;
        }}
        columns={[
          {
            id: 'dishName',
            name: t('portions.colDish'),
            width: '30%',
            template: (row) => {
              if (row.isGrandTotal) {
                return (
                  <Text variant="body-2" style={{ fontWeight: 600 }}>
                    {row.dishName}
                  </Text>
                );
              }
              if (row.isDishTotal) return t('portions.total');
              if (!row.showDish) return null;
              return (
                <Flex direction="column">
                  <Text variant="body-2" style={{ fontWeight: 600 }}>
                    {row.dishName}
                  </Text>
                  <Text variant="body-1" color="secondary">
                    {t(MEAL_LABEL_KEYS[row.mealId])}
                  </Text>
                </Flex>
              );
            },
            placeholder: () => null,
          },
          {
            id: 'subObjectName',
            name: t('portions.colObject'),
            width: '20%',
            template: (row) =>
              row.isDishTotal || row.isGrandTotal ? null : row.showSubObject ? (
                <Flex direction="column">
                  <Text variant="body-2" style={{ fontWeight: 400 }}>
                    {row.subObjectName}
                  </Text>
                  {row.subObjectName !== row.objectName && (
                    <Text variant="body-1" color="secondary">
                      {t('portions.subObjectOf', { name: row.objectName })}
                    </Text>
                  )}
                </Flex>
              ) : null,
            placeholder: () => null,
          },
          {
            id: 'departmentName',
            name: t('portions.colDepartment'),
            width: '15%',
            template: (row) =>
              row.isDishTotal || row.isGrandTotal
                ? null
                : row.showDepartment
                  ? row.departmentName
                  : null,
            placeholder: () => null,
          },
          {
            id: 'tableName',
            name: t('portions.colDiet'),
            width: '15%',
            template: (row) => (row.isDishTotal || row.isGrandTotal ? null : row.tableName),
            placeholder: () => null,
          },
          {
            id: 'portions',
            name: t('portions.colPortions'),
            width: '16%',
            align: 'end',
            template: (row) => (
              <Text variant={row.isDishTotal || row.isGrandTotal ? 'subheader-2' : 'body-2'}>
                {row.portions}
                {row.weightKg !== null && (
                  <Text
                    variant="body-2"
                    color="secondary"
                    style={{ marginLeft: 6, fontWeight: 'normal' }}
                  >
                    ({row.weightKg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}{' '}
                    {t('portions.kg')})
                  </Text>
                )}
              </Text>
            ),
          },
          {
            id: 'stickers',
            name: '',
            width: '8%',
            align: 'center',
            template: (row) =>
              row.isDishTotal || row.isGrandTotal ? null : (
                <Button
                  view="flat"
                  title={t('portions.stickerTooltip')}
                  onClick={() => onSticker(row)}
                >
                  <Icon data={Sticker} size={16} />
                </Button>
              ),
            placeholder: () => null,
          },
        ]}
      />
    </div>
  );
}

/**
 * Строка печатного документа «Порционник»: как таблица на экране, но без
 * редактирования. Имя подобъекта/отделения показывается на первой строке
 * группы, как в интерактивной таблице.
 */
type PortionsPrintRow = {
  id: string;
  subObjectName: string;
  parentName: string;
  departmentName: string;
  tableName: string;
  headcount: number | null;
  showSubObject: boolean;
  showDepartment: boolean;
};

/** Сводная численность для печатного документа (экран и скачанный файл). */
function buildPortionsPrintRows(
  subObjects: PortionUnit[],
  parentObjectName: Record<string, string>,
  headcountOf: (objectId: string, groupId: string, dietId: string) => number | null
): { rows: PortionsPrintRow[]; grand: number } {
  const data: PortionsPrintRow[] = [];
  let grand = 0;

  for (const subObject of subObjects) {
    const block: Omit<PortionsPrintRow, 'showSubObject' | 'showDepartment' | 'parentName'>[] = [];
    for (const department of subObject.groups) {
      for (const table of department.diets ?? []) {
        const headcount = headcountOf(subObject.id, department.id, table.id);
        grand += headcount ?? 0;
        block.push({
          id: `${subObject.id}-${department.id}-${table.id}`,
          subObjectName: subObject.name,
          departmentName: department.name,
          tableName: table.name,
          headcount,
        });
      }
    }
    block.forEach((row, index) => {
      const prev = index > 0 ? block[index - 1] : null;
      data.push({
        ...row,
        parentName: parentObjectName[subObject.id] ?? '',
        showSubObject: index === 0,
        showDepartment: !prev || prev.departmentName !== row.departmentName,
      });
    });
  }

  return { rows: data, grand };
}

const PDF_COLUMN_WIDTHS = [78, 46, 36, 26];
const PDF_COLUMN_X: number[] = (() => {
  const xs = [PDF_MARGIN];
  for (const width of PDF_COLUMN_WIDTHS) xs.push(xs[xs.length - 1] + width);
  return xs;
})();

/** Рисует документ «Порционник» в переданный jsPDF (A4, миллиметры). */
function writePortionsPdf(
  doc: jsPDF,
  data: { displayDate: string; rows: PortionsPrintRow[]; grand: number }
): void {
  const marginTop = 18;
  const marginBottom = 16;
  const bodyMaxY = PDF_PAGE_HEIGHT - marginBottom;

  /** Границы колонки по индексу под текст с учётом отступа. */
  const cellWidth = (colIndex: number): number =>
    PDF_COLUMN_WIDTHS[colIndex] - PDF_CELL_PADDING * 2;
  const cellX = (colIndex: number): number => PDF_COLUMN_X[colIndex] + PDF_CELL_PADDING;
  const cellRightX = (colIndex: number): number => PDF_COLUMN_X[colIndex + 1] - PDF_CELL_PADDING;
  const drawCellLines = (
    lines: string[],
    colIndex: number,
    cellTop: number,
    rightAlign = false
  ) => {
    drawTextCell(doc, lines, cellX(colIndex), cellRightX(colIndex), cellTop, rightAlign);
  };

  const drawGridLine = (y: number) => {
    doc.setDrawColor(...PDF_GRID_COLOR);
    doc.line(PDF_MARGIN, y, PDF_MARGIN + PDF_CONTENT_WIDTH, y);
  };

  const drawVerticalLines = (top: number, bottom: number) => {
    doc.setDrawColor(...PDF_GRID_COLOR);
    for (let i = 1; i < PDF_COLUMN_X.length - 1; i++) {
      doc.line(PDF_COLUMN_X[i], top, PDF_COLUMN_X[i], bottom);
    }
  };

  /** Шапка таблицы; возвращает координату низа шапки (там же верх тела). */
  const drawTableHeader = (top: number): number => {
    const height = PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2;
    doc.setFillColor(...PDF_HEADER_FILL);
    doc.rect(PDF_MARGIN, top, PDF_CONTENT_WIDTH, height, 'F');
    doc.setFont('PTSans', 'bold');
    doc.setFontSize(PDF_BODY_SIZE);
    doc.setTextColor(...PDF_TEXT_COLOR);
    drawCellLines([i18n.t('portions.colObject')], 0, top);
    drawCellLines([i18n.t('portions.colDepartment')], 1, top);
    drawCellLines([i18n.t('portions.colTable')], 2, top);
    drawCellLines([i18n.t('portions.colPeople')], 3, top, true);
    doc.setFont('PTSans', 'normal');
    drawGridLine(top + height);
    return top + height;
  };

  // Шапка документа: «Порционник» и дата.
  doc.setFont('PTSans', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.text(i18n.t('portions.printTitle'), PDF_MARGIN, marginTop);
  doc.text(data.displayDate, PDF_PAGE_WIDTH - PDF_MARGIN, marginTop, { align: 'right' });

  let y = marginTop + 10;
  let tableTop = y;
  y = drawTableHeader(y);

  for (const row of data.rows) {
    const subLabel = row.showSubObject
      ? row.subObjectName === row.parentName
        ? row.subObjectName
        : `${row.subObjectName} · ${row.parentName}`
      : '';
    const deptLabel = row.showDepartment ? row.departmentName : '';
    const cellLines = [
      wrapText(doc, subLabel, cellWidth(0)),
      wrapText(doc, deptLabel, cellWidth(1)),
      wrapText(doc, row.tableName, cellWidth(2)),
    ];
    const rowHeight =
      Math.max(...cellLines.map((lines) => lines.length * PDF_LINE_HEIGHT)) + PDF_CELL_PADDING * 2;

    if (y + rowHeight > bodyMaxY) {
      drawVerticalLines(tableTop, y);
      doc.addPage();
      tableTop = y = marginTop;
      y = drawTableHeader(y);
    }

    doc.setFont('PTSans', 'normal');
    doc.setFontSize(PDF_BODY_SIZE);
    doc.setTextColor(...PDF_TEXT_COLOR);
    drawCellLines(cellLines[0], 0, y);
    drawCellLines(cellLines[1], 1, y);
    drawCellLines(cellLines[2], 2, y);
    drawCellLines([row.headcount == null ? '' : String(row.headcount)], 3, y, true);

    y += rowHeight;
    drawGridLine(y);
  }

  // Итоговая строка.
  const grandRowHeight = PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2;
  if (y + grandRowHeight > bodyMaxY) {
    drawVerticalLines(tableTop, y);
    doc.addPage();
    tableTop = y = marginTop;
    y = drawTableHeader(y);
  }
  doc.setFont('PTSans', 'bold');
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.setLineWidth(0.6);
  doc.setDrawColor(...PDF_TEXT_COLOR);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + PDF_CONTENT_WIDTH, y);
  doc.setLineWidth(0.2);
  drawCellLines([i18n.t('portions.total')], 0, y);
  drawCellLines([String(data.grand)], 3, y, true);
  y += grandRowHeight;
  drawGridLine(y);

  drawVerticalLines(tableTop, y);

  // Подвал: ответственный и дата.
  if (y + 24 > bodyMaxY) {
    doc.addPage();
    y = marginTop;
  }
  y += 8;
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR_MUTED);
  doc.text(i18n.t('portions.printResponsible'), PDF_MARGIN, y + PDF_LINE_HEIGHT);
  doc.text(data.displayDate, PDF_PAGE_WIDTH - PDF_MARGIN, y + PDF_LINE_HEIGHT, { align: 'right' });
}

/** Скачивает документ порционника как PDF. */
async function downloadPortionsDoc(data: {
  date: string;
  rows: PortionsPrintRow[];
  grand: number;
}): Promise<void> {
  const displayDate = data.date.split('-').reverse().join('.');
  const doc = await createPdfDoc();
  writePortionsPdf(doc, { ...data, displayDate });
  doc.save(i18n.t('portions.printFileName', { date: displayDate }));
}
