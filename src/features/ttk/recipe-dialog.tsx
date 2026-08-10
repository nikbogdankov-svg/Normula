import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Icon, Label, Table, Text, useToaster } from '@gravity-ui/uikit';
import { Pencil, Xmark } from '@gravity-ui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateRecipe } from './api';
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
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Recipe | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
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

  if (!view) return null;

  return (
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
      disableOutsideClick={mode === 'edit' || update.isPending}
      disableEscapeKeyDown={mode === 'edit' || update.isPending}
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
              <Text variant="subheader-2">{view.name}</Text>
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
              <MetaRow title="Температура:">{view.temperature}</MetaRow>
              <MetaRow title="Срок реализации:">{view.shelfLife}</MetaRow>
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
                    pricePerKg: '',
                  },
                ]}
                columns={[
                  { id: 'name', name: 'Наименование' },
                  { id: 'grossPerPortion', name: '1 порция, Брутто, г', align: 'right' },
                  { id: 'netPerPortion', name: '1 порция, Нетто, г', align: 'right' },
                  { id: 'grossPer100', name: '100 порций, Брутто, кг', align: 'right' },
                  { id: 'netPer100', name: '100 порций, Нетто, кг', align: 'right' },
                  { id: 'pricePerKg', name: 'Цена за 1кг', align: 'right' },
                ]}
              />
            </div>

            <div className="ttk-recipe-drawer__table-wrap">
              <Table
                width="max"
                data={[view.nutrition]}
                columns={[
                  { id: 'protein', name: 'Белки, г', align: 'center' },
                  { id: 'fat', name: 'Жиры, г', align: 'center' },
                  { id: 'carbs', name: 'Углеводы, г', align: 'center' },
                  { id: 'kcal', name: 'Энерг. ценность, ккал', align: 'center' },
                  { id: 'vitaminC', name: 'Витамин С, мг', align: 'center' },
                ]}
              />
            </div>
          </div>

          <div className="ttk-recipe-drawer__footer">
            <Button view="outlined" size="l" onClick={requestClose}>
              Отмена
            </Button>
            <Button view="normal" size="l" onClick={startEdit}>
              <Icon data={Pencil} size={16} />
              Редактировать
            </Button>
          </div>
        </div>

        <div className="ttk-recipe-drawer__mode" hidden={mode !== 'edit'}>
          <div className="ttk-recipe-drawer__header">
            <div className="ttk-recipe-drawer__title-row">
              <Text variant="subheader-2">Редактировать ТТК</Text>
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
            <Button
              view="action"
              size="l"
              onClick={save}
              disabled={!form.canSubmit}
              loading={update.isPending}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
