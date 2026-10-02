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
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteRecipe, useCreateRecipe, useUpdateRecipe } from './api';
import { useRecipeForm } from './recipe-form';
import type { Recipe } from './types';
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

/**
 * Технологическая карта как нижний Drawer (desktop).
 * Просмотр и редактирование — в одной панели: оба режима остаются в DOM,
 * чтобы Floating UI не закрывал drawer при смене содержимого.
 */
export function RecipeDialog({
  recipe,
  onClose,
  onRecipeChange,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  onRecipeChange?: (recipe: Recipe) => void;
}) {
  const height = useDrawerHeight();
  const update = useUpdateRecipe();
  const create = useCreateRecipe();
  const remove = useDeleteRecipe();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Recipe | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const modeRef = useRef(mode);
  /** Закрытие только через явный requestClose — dismiss от Floating UI игнорируем. */
  const allowCloseRef = useRef(false);

  modeRef.current = mode;

  const form = useRecipeForm(view, `${view?.id ?? ''}-${editKey}`);

  useEffect(() => {
    if (!recipe) {
      setOpen(false);
      return;
    }

    setView(recipe);
  }, [recipe]);

  useEffect(() => {
    if (!recipe) return;

    setMode('view');
    allowCloseRef.current = false;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открытие по id карты
  }, [recipe?.id]);

  useEffect(() => {
    if (open || !view || recipe) return;
    const timer = window.setTimeout(() => {
      setView(null);
      setMode('view');
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, view, recipe]);

  const requestClose = () => {
    allowCloseRef.current = true;
    setOpen(false);
    onClose();
  };

  const startEdit = () => {
    setEditKey((key) => key + 1);
    setMode('edit');
  };

  const cancelEdit = () => {
    setMode('view');
  };

  const startDelete = () => {
    setConfirmDeleteOpen(true);
  };

  const cancelDelete = () => {
    setConfirmDeleteOpen(false);
  };

  const runDelete = (deletionMode: 'soft' | 'immediate') => {
    if (!view) return;

    remove.mutate(
      { id: view.id, mode: deletionMode },
      {
        onSuccess: () => {
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
          toaster.add({
            name: 'ttk-delete',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  const save = () => {
    if (!view) return;

    update.mutate(
      { id: view.id, body: form.getBody() },
      {
        onSuccess: (data) => {
          setView(data.recipe);
          setMode('view');
          setOpen(true);
          onRecipeChange?.(data.recipe);
          toaster.add({ name: 'ttk-updated', title: 'ТТК сохранена', theme: 'success' });
          void queryClient.invalidateQueries({ queryKey: ['ttk'] });
        },
        onError: (e) =>
          toaster.add({
            name: 'ttk-update',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  /** Сохранить изменения как новую карту, оригинал не трогаем. */
  const saveAsNew = () => {
    if (!view) return;

    create.mutate(form.getBody(), {
      onSuccess: (data) => {
        setView(data.recipe);
        setMode('view');
        setOpen(true);
        onRecipeChange?.(data.recipe);
        toaster.add({ name: 'ttk-created', title: 'ТТК создана', theme: 'success' });
      },
      onError: (e) =>
        toaster.add({
          name: 'ttk-create',
          title: 'Ошибка',
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  if (!view) return null;

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
            !update.isPending &&
            (reason === 'outside-press' || reason === 'escape-key')
          ) {
            setOpen(false);
            onClose();
          }
        }}
        disableOutsideClick={mode === 'edit' || update.isPending || create.isPending}
        disableEscapeKeyDown={mode === 'edit' || update.isPending || create.isPending}
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
                <Text variant="subheader-3">{view.name}</Text>
                <Label theme="normal" size="s">
                  Выход порции: {view.portionYield}
                </Label>
                <Label theme="normal" size="s">
                  {view.price} ₽
                </Label>
              </div>
              <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
                <Icon data={Xmark} size={20} />
              </Button>
            </div>

            <div className="ttk-recipe-drawer__body">
              <div className="ttk-recipe-drawer__meta">
                <MetaRow title="Сборник:">{view.collectionName || '—'}</MetaRow>
                <MetaRow title="Рецепт:">{view.recipe}</MetaRow>
              </div>

              <div className="ttk-recipe-drawer__table-wrap">
                <Table
                  width="max"
                  data={[
                    ...view.ingredients,
                    {
                      name: 'Выход',
                      grossPerPortion: '',
                      netPerPortion: view.outputPerPortion,
                      grossPer100: '',
                      netPer100: view.outputPer100,
                      pricePerUnit: '',
                    },
                  ]}
                  columns={[
                    {
                      id: 'name',
                      name: 'Наименование',
                      template: (row) => <Text variant="body-2">{row.name}</Text>,
                    },
                    {
                      id: 'grossPerPortion',
                      name: '1 порция, Брутто',
                      align: 'right',
                      template: (row) => <Text variant="body-2">{row.grossPerPortion}</Text>,
                    },
                    {
                      id: 'netPerPortion',
                      name: '1 порция, Нетто',
                      align: 'right',
                      template: (row) => <Text variant="body-2">{row.netPerPortion}</Text>,
                    },
                    {
                      id: 'grossPer100',
                      name: '100 порций, Брутто',
                      align: 'right',
                      template: (row) => <Text variant="body-2">{row.grossPer100}</Text>,
                    },
                    {
                      id: 'netPer100',
                      name: '100 порций, Нетто',
                      align: 'right',
                      template: (row) => <Text variant="body-2">{row.netPer100}</Text>,
                    },
                    {
                      id: 'pricePerUnit',
                      name: 'Цена',
                      align: 'right',
                      template: (row) => (
                        <Text variant="body-2">
                          {row.pricePerUnit
                            ? row.pricePerUnit.replace('р/ед', `р/${row.unit || 'кг'}`)
                            : ''}
                        </Text>
                      ),
                    },
                  ]}
                />
              </div>

              <div className="ttk-recipe-drawer__table-wrap ttk-recipe-drawer__table-wrap_nutrition">
                <Table
                  width="max"
                  data={[view.nutrition]}
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
                    {
                      id: 'vitaminC',
                      name: 'Витамин С, мг',
                      align: 'center',
                      template: (row) => <Text variant="body-2">{row.vitaminC}</Text>,
                    },
                  ]}
                />
              </div>
            </div>

            <div className="ttk-recipe-drawer__footer ttk-recipe-drawer__footer_view">
              <Button view="outlined-danger" size="l" onClick={startDelete}>
                <Icon data={TrashBin} size={16} />
                Удалить
              </Button>
              <Flex gap={2}>
                <Button view="outlined" size="l" onClick={requestClose}>
                  Отмена
                </Button>
                <Button view="normal" size="l" onClick={startEdit}>
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
              <Button view="outlined" size="l" onClick={cancelEdit}>
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

      <Dialog open={confirmDeleteOpen} onClose={cancelDelete} size="s">
        <Dialog.Header caption={`Удалить «${view.name}»?`} />
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
            <Button view="flat" size="l" onClick={cancelDelete} disabled={remove.isPending}>
              Отмена
            </Button>
          </Flex>
        </Dialog.Body>
      </Dialog>
    </>
  );
}
