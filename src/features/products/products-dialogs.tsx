import { Button, Dialog, Flex, Icon, Text, useToaster } from '@gravity-ui/uikit';
import { Pencil } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { useDeleteProduct, useUpdateProduct } from './api';
import { useProductForm } from './product-form';
import type { Product } from './types';
import './product-dialog.css';

/** Редактирование продукта: форма уже предзаполнена, меняются имя и/или единица. */
export function EditProductDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const update = useUpdateProduct();
  const toaster = useToaster();
  const { t } = useTranslation();
  const form = useProductForm(product, product?.id);

  if (!product) return null;

  const submit = () => {
    update.mutate(
      { id: product.id, body: form.getBody() },
      {
        onSuccess: () => {
          toaster.add({ name: 'product-updated', title: t('products.updated'), theme: 'success' });
          onClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'product-update',
            title: t('common.error'),
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Dialog open onClose={onClose} size="s" className="product-dialog">
      <Dialog.Header caption={t('products.editTitle')} />
      <Dialog.Divider />
      <Dialog.Body>{form.fields}</Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button view="outlined" size="l" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            view="action"
            size="l"
            onClick={submit}
            disabled={!form.canSubmit}
            loading={update.isPending}
          >
            <Icon data={Pencil} size={16} />
            {t('products.change')}
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}

/** Подтверждение удаления продукта: сразу или после конца периода. */
export function DeleteProductDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const remove = useDeleteProduct();
  const toaster = useToaster();
  const { t } = useTranslation();

  if (!product) return null;

  const runDelete = (deletionMode: 'soft' | 'immediate') => {
    remove.mutate(
      { id: product.id, mode: deletionMode },
      {
        onSuccess: () => {
          // Режим уходит на бэкенд, но пока не различается: периодов ещё нет,
          // и в обоих случаях продукт пропадает из справочника сразу.
          toaster.add({ name: 'product-deleted', title: t('products.deleted'), theme: 'success' });
          onClose();
        },
        onError: (e) =>
          toaster.add({
            name: 'product-delete',
            title: t('common.error'),
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Dialog open onClose={onClose} size="s">
      <Dialog.Header caption={t('products.deleteTitle', { name: product.name })} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-2">{t('products.deleteDescription')}</Text>
          <Flex direction="column" gap={2}>
            <Button
              view="outlined-danger"
              size="l"
              onClick={() => runDelete('soft')}
              loading={remove.isPending}
            >
              {t('products.deleteAfterPeriod')}
            </Button>
            <Text variant="body-1" color="secondary">
              {t('products.deleteAfterPeriodHint')}
            </Text>
          </Flex>
          <Flex direction="column" gap={2}>
            <Button
              view="outlined"
              size="l"
              onClick={() => runDelete('immediate')}
              loading={remove.isPending}
            >
              {t('products.deleteNow')}
            </Button>
            <Text variant="body-1" color="secondary">
              {t('products.deleteNowHint')}
            </Text>
          </Flex>
          <Button view="flat" size="l" onClick={onClose} disabled={remove.isPending}>
            {t('common.cancel')}
          </Button>
        </Flex>
      </Dialog.Body>
    </Dialog>
  );
}
