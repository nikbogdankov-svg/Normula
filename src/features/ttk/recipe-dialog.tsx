import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  Drawer,
  Flex,
  Icon,
  Label,
  Table,
  Text,
  useToaster,
} from '@gravity-ui/uikit';
import { Pencil, TrashBin, Xmark } from '@gravity-ui/icons';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import { formatMoney, formatQuantity } from '@/features/warehouse/format';
import { useCreateRecipe, useDeleteRecipe, useRecipe, useUpdateRecipe } from './api';
import { useRecipeForm } from './recipe-form';
import type { Ingredient, Recipe } from './types';
import { useDrawerHeight } from './use-drawer-height';
import './recipe-drawer.css';

/** Пара «подпись — значение» в шапке карты. */
function MetaRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ttk-recipe-drawer__meta-row">
      <Text variant="body-2" className="ttk-recipe-drawer__meta-label">
        {title}
      </Text>
      <Text variant="body-2">{children}</Text>
    </div>
  );
}

/** Таблица ингредиентов: на порцию, на 100 порций (умножением) и деньги. */
function IngredientsTable({ recipe }: { recipe: Recipe }) {
  const per100 = (value: number) => Math.round(value * 100 * 1000) / 1000;

  return (
    <Table<Ingredient>
      width="max"
      data={recipe.ingredients}
      columns={[
        {
          id: 'name',
          name: 'Наименование',
          template: (row) => <Text variant="body-2">{row.productName}</Text>,
        },
        {
          id: 'gross',
          name: '1 порция, брутто',
          align: 'right',
          template: (row) => <Text variant="body-2">{formatQuantity(row.gross, row.unit)}</Text>,
        },
        {
          id: 'net',
          name: '1 порция, нетто',
          align: 'right',
          template: (row) => <Text variant="body-2">{formatQuantity(row.net, row.unit)}</Text>,
        },
        {
          id: 'gross100',
          name: '100 порций, брутто',
          align: 'right',
          template: (row) => (
            <Text variant="body-2">{formatQuantity(per100(row.gross), row.unit)}</Text>
          ),
        },
        {
          id: 'net100',
          name: '100 порций, нетто',
          align: 'right',
          template: (row) => (
            <Text variant="body-2">{formatQuantity(per100(row.net), row.unit)}</Text>
          ),
        },
        {
          id: 'unitPrice',
          name: 'Цена за ед.',
          align: 'right',
          template: (row) => (
            <Text variant="body-2" color={row.unitPrice ? 'primary' : 'secondary'}>
              {row.unitPrice ? `${formatMoney(row.unitPrice)}/${row.unit}` : 'нет остатков'}
            </Text>
          ),
        },
        {
          id: 'total',
          name: 'Сумма',
          align: 'right',
          template: (row) => <Text variant="body-2">{formatMoney(row.total)}</Text>,
        },
      ]}
    />
  );
}

/**
 * Технологическая карта как нижний Drawer (desktop). Карта грузится по id:
 * список отдаёт только шапки. Просмотр и редактирование — в одной панели:
 * оба режима остаются в DOM, чтобы Floating UI не закрывал drawer при
 * смене содержимого.
 */
export function RecipeDialog({
  recipeId,
  onClose,
  onRecipeChange,
}: {
  recipeId: string | null;
  onClose: () => void;
  /** «Сохранить в новой» создаёт карту — родитель переключается на неё. */
  onRecipeChange: (recipeId: string) => void;
}) {
  const height = useDrawerHeight();
  const update = useUpdateRecipe();
  const create = useCreateRecipe();
  const remove = useDeleteRecipe();
  const toaster = useToaster();
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const modeRef = useRef(mode);
  /** Закрытие только через явный requestClose — dismiss от Floating UI игнорируем. */
  const allowCloseRef = useRef(false);

  modeRef.current = mode;

  const recipe = useRecipe(viewId);
  const view = recipe.data?.recipe ?? null;
  const form = useRecipeForm(view, `${view?.id ?? ''}-${editKey}`);

  // Открытие — после монтирования, чтобы сработала анимация; закрытие — с
  // задержкой, чтобы содержимое не пропало раньше панели.
  useEffect(() => {
    if (recipeId) {
      setViewId(recipeId);
      setMode('view');
      allowCloseRef.current = false;
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => {
      setViewId(null);
      setMode('view');
    }, 220);
    return () => window.clearTimeout(timer);
  }, [recipeId]);

  const requestClose = () => {
    allowCloseRef.current = true;
    setOpen(false);
    onClose();
  };

  const startEdit = () => {
    setEditKey((key) => key + 1);
    setMode('edit');
  };

  const runDelete = (deletionMode: 'soft' | 'immediate') => {
    if (!view) return;

    remove.mutate(
      { id: view.id, mode: deletionMode },
      {
        onSuccess: () => {
          setConfirmDeleteOpen(false);
          toaster.add(
            deletionMode === 'immediate'
              ? { name: 'ttk-deleted', title: 'ТТК удалена', theme: 'success' }
              : {
                  name: 'ttk-deleted',
                  title: 'ТТК удалена',
                  content: 'Останется в меню до конца периода',
                  theme: 'success',
                }
          );
          requestClose();
        },
        onError: (e) =>
          toaster.add({ name: 'ttk-delete', title: 'Ошибка', content: e.message, theme: 'danger' }),
      }
    );
  };

  const save = () => {
    const body = form.getBody();
    if (!view || !body) return;

    update.mutate(
      { id: view.id, body },
      {
        onSuccess: () => {
          setMode('view');
          setOpen(true);
          toaster.add({ name: 'ttk-updated', title: 'ТТК сохранена', theme: 'success' });
        },
        onError: (e) =>
          toaster.add({ name: 'ttk-update', title: 'Ошибка', content: e.message, theme: 'danger' }),
      }
    );
  };

  /** Сохранить изменения как новую карту, оригинал не трогаем. */
  const saveAsNew = () => {
    const body = form.getBody();
    if (!body) return;

    create.mutate(body, {
      onSuccess: (created) => {
        setMode('view');
        setOpen(true);
        onRecipeChange(created.id);
        toaster.add({ name: 'ttk-created', title: 'ТТК создана', theme: 'success' });
      },
      onError: (e) =>
        toaster.add({ name: 'ttk-create', title: 'Ошибка', content: e.message, theme: 'danger' }),
    });
  };

  if (!viewId) return null;

  const busy = update.isPending || create.isPending;

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(nextOpen, _event, reason) => {
          if (nextOpen) {
            setOpen(true);
            return;
          }

          // Явное закрытие (крестик / Отмена в просмотре).
          if (allowCloseRef.current) {
            allowCloseRef.current = false;
            setOpen(false);
            onClose();
            return;
          }

          // В просмотре — только клик по вуали или Escape.
          // focus-out и пр. при смене mode игнорируем, иначе Save закрывает drawer.
          if (
            modeRef.current === 'view' &&
            !busy &&
            (reason === 'outside-press' || reason === 'escape-key')
          ) {
            setOpen(false);
            onClose();
          }
        }}
        disableOutsideClick={mode === 'edit' || busy}
        disableEscapeKeyDown={mode === 'edit' || busy}
        placement="bottom"
        size={height}
        maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
        contentOverflow="auto"
        className="ttk-recipe-drawer"
        contentClassName="ttk-recipe-drawer__panel"
      >
        <div className="ttk-recipe-drawer__card">
          {/* Оба режима в DOM: hidden вместо размонтирования — иначе drawer закрывается. */}
          <div className="ttk-recipe-drawer__mode" hidden={mode !== 'view'}>
            <div className="ttk-recipe-drawer__header">
              <div className="ttk-recipe-drawer__title-row">
                <Text variant="subheader-3">{view?.name ?? 'ТТК'}</Text>
                {view && (
                  <>
                    <Label theme="normal" size="s">
                      Выход: {view.yieldNet}
                      {view.yieldLoss !== undefined && view.yieldLoss !== 0 ? ` / ${view.yieldLoss}` : ''}
                    </Label>
                    <Label theme="normal" size="s">
                      {formatMoney(view.price)}
                    </Label>
                  </>
                )}
              </div>
              <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
                <Icon data={Xmark} size={20} />
              </Button>
            </div>

            <div className="ttk-recipe-drawer__body">
              {recipe.isPending && <LoadingState />}
              {recipe.isError && (
                <ErrorState error={recipe.error} onRetry={() => void recipe.refetch()} />
              )}
              {view && (
                <>
                  <div className="ttk-recipe-drawer__meta">
                    <MetaRow title="Сборник:">{view.collectionName || '—'}</MetaRow>
                    <MetaRow title="Технология:">{view.technology || '—'}</MetaRow>
                  </div>

                  <div className="ttk-recipe-drawer__table-wrap">
                    {view.ingredients.length > 0 ? (
                      <IngredientsTable recipe={view} />
                    ) : (
                      <Text variant="body-2" color="secondary">
                        Ингредиенты не указаны
                      </Text>
                    )}
                  </div>

                  <div className="ttk-recipe-drawer__table-wrap ttk-recipe-drawer__table-wrap_nutrition">
                    <Table
                      width="max"
                      data={[view]}
                      columns={[
                        {
                          id: 'protein',
                          name: 'Белки, г',
                          align: 'center',
                          template: (row) => <Text variant="body-2">{row.protein}</Text>,
                        },
                        {
                          id: 'fat',
                          name: 'Жиры, г',
                          align: 'center',
                          template: (row) => <Text variant="body-2">{row.fat}</Text>,
                        },
                        {
                          id: 'carbs',
                          name: 'Углеводы, г',
                          align: 'center',
                          template: (row) => <Text variant="body-2">{row.carbs}</Text>,
                        },
                        {
                          id: 'kcal',
                          name: 'Энерг. ценность, ккал',
                          align: 'center',
                          template: (row) => <Text variant="body-2">{row.kcal}</Text>,
                        },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="ttk-recipe-drawer__footer ttk-recipe-drawer__footer_view">
              <Button
                view="outlined-danger"
                size="l"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={!view}
              >
                <Icon data={TrashBin} size={16} />
                Удалить
              </Button>
              <Flex gap={2}>
                <Button view="outlined" size="l" onClick={requestClose}>
                  Отмена
                </Button>
                <Button view="normal" size="l" onClick={startEdit} disabled={!view}>
                  <Icon data={Pencil} size={16} />
                  Редактировать
                </Button>
              </Flex>
            </div>
          </div>

          <div className="ttk-recipe-drawer__mode" hidden={mode !== 'edit'}>
            <div className="ttk-recipe-drawer__header">
              <div className="ttk-recipe-drawer__title-row">
                <Text variant="subheader-3">Редактировать ТТК</Text>
              </div>
              <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
                <Icon data={Xmark} size={20} />
              </Button>
            </div>

            <div className="ttk-recipe-drawer__body ttk-recipe-drawer__body_create">
              {form.fields}
            </div>

            <div className="ttk-recipe-drawer__footer">
              <Button view="outlined" size="l" onClick={() => setMode('view')}>
                Отмена
              </Button>
              <Flex gap={2}>
                <Button
                  view="normal"
                  size="l"
                  onClick={save}
                  disabled={!form.canSubmit}
                  loading={update.isPending}
                >
                  Сохранить в текущей
                </Button>
                <Button
                  view="action"
                  size="l"
                  onClick={saveAsNew}
                  disabled={!form.canSubmit}
                  loading={create.isPending}
                >
                  Сохранить в новой
                </Button>
              </Flex>
            </div>
          </div>
        </div>
      </Drawer>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} size="s">
        <Dialog.Header caption={`Удалить «${view?.name ?? ''}»?`} />
        <Dialog.Divider />
        <Dialog.Body>
          <Flex direction="column" gap={3}>
            <Text variant="body-2">
              ТТК используется в меню и других разделах. Выберите, как её удалить.
            </Text>
            <Flex direction="column" gap={2}>
              <Button
                view="outlined-danger"
                size="l"
                onClick={() => runDelete('soft')}
                loading={remove.isPending}
              >
                Удалить после конца периода
              </Button>
              <Text variant="body-1" color="secondary">
                До конца периода ТТК останется в меню и других разделах
              </Text>
            </Flex>
            <Flex direction="column" gap={2}>
              <Button
                view="outlined"
                size="l"
                onClick={() => runDelete('immediate')}
                loading={remove.isPending}
              >
                Удалить сейчас
              </Button>
              <Text variant="body-1" color="secondary">
                Будет убрана из всех разделов немедленно
              </Text>
            </Flex>
            <Button
              view="flat"
              size="l"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={remove.isPending}
            >
              Отмена
            </Button>
          </Flex>
        </Dialog.Body>
      </Dialog>
    </>
  );
}
