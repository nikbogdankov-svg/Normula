import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, Icon, Text, useToaster } from '@gravity-ui/uikit';
import { Pencil, TrashBin } from '@gravity-ui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteProduct, useProductCategories, useUpdateProduct } from './api';
import { useProductForm } from './product-form';
import type { Product } from './types';
import './product-dialog.css';

/** Строка «подпись — значение» в блоке КБЖУ. */
function NutritionRow({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="product-dialog__meta-row">
      <Text variant="body-2" className="product-dialog__meta-label">
        {label}
      </Text>
      <Text variant="body-2">
        {value} {suffix}
      </Text>
    </div>
  );
}

/**
 * Карточка продукта как модалка (popup size s).
 * Просмотр и редактирование — в одной панели: оба режима остаются в DOM,
 * чтобы смена содержимого не закрывала модалку.
 */
export function ProductDialog({
  product,
  onClose,
  onProductChange,
}: {
  product: Product | null;
  onClose: () => void;
  onProductChange?: (product: Product) => void;
}) {
  const update = useUpdateProduct();
  const remove = useDeleteProduct();
  const categories = useProductCategories();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Product | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view');
  const [editKey, setEditKey] = useState(0);

  const form = useProductForm(
    view,
    `${view?.id ?? ''}-${editKey}`,
    categories.data?.categories ?? []
  );

  const categoryName = categories.data?.categories.find(
    (item) => item.id === view?.categoryId
  )?.name;

  useEffect(() => {
    if (!product) {
      setOpen(false);
      return;
    }

    setView(product);
  }, [product]);

  useEffect(() => {
    if (!product) return;

    setMode('view');
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открытие по id продукта
  }, [product?.id]);

  useEffect(() => {
    if (open || !view || product) return;
    const timer = window.setTimeout(() => {
      setView(null);
      setMode('view');
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, view, product]);

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
          setView(data.product);
          setMode('view');
          onProductChange?.(data.product);
          toaster.add({ name: 'product-updated', title: 'Продукт сохранён', theme: 'success' });
          void queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (e) =>
          toaster.add({
            name: 'product-update',
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
          toaster.add(
            deletionMode === 'immediate'
              ? { name: 'product-deleted', title: 'Продукт удалён', theme: 'success' }
              : {
                  name: 'product-deleted',
                  title: 'Продукт удалён',
                  content: 'Останется в меню и других разделах до конца недели',
                  theme: 'success',
                }
          );
          requestClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'product-delete',
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
      className="product-dialog"
      disableOutsideClick={mode === 'edit' || update.isPending}
      disableEscapeKeyDown={mode === 'edit' || update.isPending}
    >
      {/* Оба режима в DOM: hidden вместо размонтирования — иначе модалка закрывается. */}
      <div hidden={mode !== 'view'}>
        <Dialog.Header caption={view.name} />
        <Dialog.Divider />
        <Dialog.Body>
          <div className="product-dialog__meta">
            <div className="product-dialog__meta-row">
              <Text variant="body-2" className="product-dialog__meta-label">
                Категория:
              </Text>
              <Text variant="body-2">{categoryName || '—'}</Text>
            </div>
          </div>

          <Text variant="subheader-1" className="product-dialog__section-title">
            Пищевая ценность на 100 г
          </Text>
          <div className="product-dialog__meta">
            <NutritionRow label="Калорийность:" value={view.kcal} suffix="ккал" />
            <NutritionRow label="Белки:" value={view.protein} suffix="г" />
            <NutritionRow label="Жиры:" value={view.fat} suffix="г" />
            <NutritionRow label="Углеводы:" value={view.carbs} suffix="г" />
            <NutritionRow label="Витамин C:" value={view.vitaminC ?? 0} suffix="мг" />
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
        <Dialog.Header caption="Редактировать продукт" />
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
              Продукт используется в меню и других разделах. Выберите, как его удалить.
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
                До конца недели продукт останется в меню и других разделах
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
                Будет убран из всех разделов немедленно
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
