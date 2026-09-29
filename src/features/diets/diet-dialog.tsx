import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, Icon, Text, useToaster } from '@gravity-ui/uikit';
import { Pencil, TrashBin } from '@gravity-ui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteDiet, useUpdateDiet } from './api';
import { useDietForm } from './diet-form';
import { MEALS } from '@/features/menu/types';
import type { Diet } from './types';
import './diets-route.css';

const FACILITY_TYPE_LABELS: Record<string, string> = {
  school: 'Школа',
  kindergarten: 'Детский сад',
  hospital: 'Больница',
};

/** Строка «подпись — значение» в блоке нормы на день. */
function NutritionRow({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="diet-dialog__meta-row">
      <Text variant="body-2" className="diet-dialog__meta-label">
        {label}
      </Text>
      <Text variant="body-2">
        {value} {suffix}
      </Text>
    </div>
  );
}

/**
 * Карточка диеты как модалка (popup size s).
 * Просмотр и редактирование — в одной панели: оба режима остаются в DOM,
 * чтобы смена содержимого не закрывала модалку.
 */
export function DietDialog({
  diet,
  onClose,
  onDietChange,
}: {
  diet: Diet | null;
  onClose: () => void;
  onDietChange?: (diet: Diet) => void;
}) {
  const update = useUpdateDiet();
  const remove = useDeleteDiet();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Diet | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view');
  const [editKey, setEditKey] = useState(0);

  const form = useDietForm(view, `${view?.id ?? ''}-${editKey}`);

  useEffect(() => {
    if (!diet) {
      setOpen(false);
      return;
    }

    setView(diet);
  }, [diet]);

  useEffect(() => {
    if (!diet) return;

    setMode('view');
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открытие по id диеты
  }, [diet?.id]);

  useEffect(() => {
    if (open || !view || diet) return;
    const timer = window.setTimeout(() => {
      setView(null);
      setMode('view');
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, view, diet]);

  const requestClose = () => {
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
          setView(data.diet);
          setMode('view');
          onDietChange?.(data.diet);
          toaster.add({ name: 'diet-updated', title: 'Диета сохранена', theme: 'success' });
          void queryClient.invalidateQueries({ queryKey: ['diets'] });
        },
        onError: (e) =>
          toaster.add({
            name: 'diet-update',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  const startDelete = () => {
    setMode('confirm-delete');
  };

  const cancelDelete = () => {
    setMode('view');
  };

  const runDelete = (deletionMode: 'soft' | 'immediate') => {
    if (!view) return;

    remove.mutate(
      { id: view.id, mode: deletionMode },
      {
        onSuccess: () => {
          // Режим уходит на бэкенд, но пока не различается.
          toaster.add({ name: 'diet-deleted', title: 'Диета удалена', theme: 'success' });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'diet-delete',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  if (!view) return null;

  return (
    <Dialog
      open={open}
      onClose={requestClose}
      size="s"
      className="diet-dialog"
      disableOutsideClick={mode === 'edit' || update.isPending}
      disableEscapeKeyDown={mode === 'edit' || update.isPending}
    >
      {/* Оба режима в DOM: hidden вместо размонтирования — иначе модалка закрывается. */}
      <div hidden={mode !== 'view'}>
        <Dialog.Header caption={view.name} />
        <Dialog.Divider />
        <Dialog.Body>
          <div className="diet-dialog__meta">
            <div className="diet-dialog__applies-row">
              <Text variant="body-2" className="diet-dialog__meta-label">
                Доступна для:
              </Text>
              <div className="diet-dialog__tags">
                {view.appliesTo.length === 0 ? (
                  <Text variant="body-2">—</Text>
                ) : (
                  view.appliesTo.map((type) => (
                    <span key={type} className="diet-dialog__tag">
                      {FACILITY_TYPE_LABELS[type] ?? type}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="diet-dialog__meta">
            <div className="diet-dialog__applies-row">
              <Text variant="body-2" className="diet-dialog__meta-label">
                Приёмы пищи:
              </Text>
              <div className="diet-dialog__tags">
                {view.mealIds.length === 0 ? (
                  <Text variant="body-2">Все</Text>
                ) : (
                  view.mealIds.map((meal) => (
                    <span key={meal} className="diet-dialog__tag">
                      {MEALS.find((item) => item.id === meal)?.label ?? meal}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <Text
            variant="subheader-2"
            className="diet-dialog__section-title diet-dialog__section-title_wide"
          >
            Норма на день
          </Text>
          <div className="diet-dialog__meta">
            <NutritionRow label="Цена:" value={view.pricePerDay} suffix="₽" />
            <NutritionRow label="Калорийность:" value={view.kcal} suffix="ккал" />
            <NutritionRow label="Белки:" value={view.protein} suffix="г" />
            <NutritionRow label="Жиры:" value={view.fat} suffix="г" />
            <NutritionRow label="Углеводы:" value={view.carbs} suffix="г" />
          </div>
        </Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            style={{ width: '100%' }}
          >
            <Button view="outlined-danger" size="l" onClick={startDelete}>
              <Icon data={TrashBin} size={16} />
              Удалить
            </Button>
            <Flex gap={2}>
              <Button view="normal" size="l" onClick={startEdit}>
                <Icon data={Pencil} size={16} />
                Редактировать
              </Button>
            </Flex>
          </Flex>
        </Dialog.Footer>
      </div>

      <div hidden={mode !== 'edit'}>
        <Dialog.Header caption="Редактировать диету" />
        <Dialog.Divider />
        <Dialog.Body>{form.fields}</Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
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
          </Flex>
        </Dialog.Footer>
      </div>

      <div hidden={mode !== 'confirm-delete'}>
        <Dialog.Header caption={`Удалить «${view.name}»?`} />
        <Dialog.Divider />
        <Dialog.Body>
          <Flex direction="column" gap={3}>
            <Text variant="body-2">
              Диета используется в объектах и меню. Выберите, как её удалить.
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
                До конца периода диета останется в объектах и меню
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
      </div>
    </Dialog>
  );
}
