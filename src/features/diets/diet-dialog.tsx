import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, Icon, Text, useToaster } from '@gravity-ui/uikit';
import { Pencil, TrashBin } from '@gravity-ui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/shared/i18n';
import { useDeleteDiet, useUpdateDiet } from './api';
import { useDietForm } from './diet-form';
import { MEALS } from '@/features/menu/types';
import type { Diet } from './types';
import './diets-route.css';

const FACILITY_TYPE_LABEL_KEYS: Record<string, string> = {
  school: 'facility.school',
  kindergarten: 'facility.kindergarten',
  hospital: 'facility.hospital',
  warehouse: 'facility.warehouse',
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

/** Режим, в котором открыть диалог при новом diet. */
export function DietDialog({
  diet,
  initialMode = 'view',
  onClose,
  onDietChange,
}: {
  diet: Diet | null;
  initialMode?: 'view' | 'edit' | 'confirm-delete';
  onClose: () => void;
  onDietChange?: (diet: Diet) => void;
}) {
  const update = useUpdateDiet();
  const remove = useDeleteDiet();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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

    setEditKey((key) => key + 1);
    setMode(initialMode);
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
          onDietChange?.(data.diet);
          toaster.add({ name: 'diet-updated', title: t('diets.updatedToast'), theme: 'success' });
          void queryClient.invalidateQueries({ queryKey: ['diets'] });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'diet-update',
            title: t('common.error'),
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
    requestClose();
  };

  const runDelete = (deletionMode: 'soft' | 'immediate') => {
    if (!view) return;

    remove.mutate(
      { id: view.id, mode: deletionMode },
      {
        onSuccess: () => {
          // Режим уходит на бэкенд, но пока не различается.
          toaster.add({ name: 'diet-deleted', title: t('diets.deletedToast'), theme: 'success' });
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'diet-delete',
            title: t('common.error'),
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
                {t('diets.availableFor')}
              </Text>
              <div className="diet-dialog__tags">
                {view.appliesTo.length === 0 ? (
                  <Text variant="body-2">—</Text>
                ) : (
                  view.appliesTo.map((type) => (
                    <span key={type} className="diet-dialog__tag">
                      {t(FACILITY_TYPE_LABEL_KEYS[type] ?? type)}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="diet-dialog__meta">
            <div className="diet-dialog__applies-row">
              <Text variant="body-2" className="diet-dialog__meta-label">
                {t('diets.mealsTitle')}
              </Text>
              <div className="diet-dialog__tags">
                {view.mealIds.length === 0 ? (
                  <Text variant="body-2">{t('common.all')}</Text>
                ) : (
                  view.mealIds.map((meal) => {
                    const mealDef = MEALS.find((item) => item.id === meal);
                    return (
                      <span key={meal} className="diet-dialog__tag">
                        {mealDef ? t(mealDef.labelKey) : meal}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <Text
            variant="subheader-2"
            className="diet-dialog__section-title diet-dialog__section-title_wide"
          >
            {t('diets.dailyNorm')}
          </Text>
          <div className="diet-dialog__meta">
            <NutritionRow
              label={t('diets.viewPrice')}
              value={view.pricePerDay}
              suffix={t('units.ruble')}
            />
            <NutritionRow
              label={t('diets.viewKcal')}
              value={view.kcal}
              suffix={t('menu.kcalUnit')}
            />
            <NutritionRow
              label={t('diets.viewProtein')}
              value={view.protein}
              suffix={t('units.gram')}
            />
            <NutritionRow label={t('diets.viewFat')} value={view.fat} suffix={t('units.gram')} />
            <NutritionRow
              label={t('diets.viewCarbs')}
              value={view.carbs}
              suffix={t('units.gram')}
            />
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
              {t('common.delete')}
            </Button>
            <Flex gap={2}>
              <Button view="normal" size="l" onClick={startEdit}>
                <Icon data={Pencil} size={16} />
                {t('common.edit')}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Footer>
      </div>

      <div hidden={mode !== 'edit'}>
        <Dialog.Header caption={t('diets.editDietTitle')} />
        <Dialog.Divider />
        <Dialog.Body>{form.fields}</Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
            <Button view="outlined" size="l" onClick={cancelEdit}>
              {t('common.cancel')}
            </Button>
            <Button
              view="action"
              size="l"
              onClick={save}
              disabled={!form.canSubmit}
              loading={update.isPending}
            >
              {t('common.save')}
            </Button>
          </Flex>
        </Dialog.Footer>
      </div>

      <div hidden={mode !== 'confirm-delete'}>
        <Dialog.Header caption={t('diets.deleteConfirmTitle', { name: view.name })} />
        <Dialog.Divider />
        <Dialog.Body>
          <Flex direction="column" gap={3}>
            <Text variant="body-2">{t('diets.deleteConfirmText')}</Text>
            <Flex direction="column" gap={2}>
              <Button
                view="outlined-danger"
                size="l"
                onClick={() => runDelete('soft')}
                loading={remove.isPending}
              >
                {t('diets.deleteAfterPeriod')}
              </Button>
              <Text variant="body-1" color="secondary">
                {t('diets.deleteAfterPeriodHint')}
              </Text>
            </Flex>
            <Flex direction="column" gap={2}>
              <Button
                view="outlined"
                size="l"
                onClick={() => runDelete('immediate')}
                loading={remove.isPending}
              >
                {t('diets.deleteNow')}
              </Button>
              <Text variant="body-1" color="secondary">
                {t('diets.deleteNowHint')}
              </Text>
            </Flex>
            <Button view="flat" size="l" onClick={cancelDelete} disabled={remove.isPending}>
              {t('common.cancel')}
            </Button>
          </Flex>
        </Dialog.Body>
      </div>
    </Dialog>
  );
}
