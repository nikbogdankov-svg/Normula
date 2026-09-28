import { Button, Dialog, Flex, Icon, Text, useToaster } from '@gravity-ui/uikit';
import { Pencil } from '@gravity-ui/icons';
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
  const form = useProductForm(product, product?.id);

  if (!product) return null;

  const submit = () => {
    update.mutate(
      { id: product.id, body: form.getBody() },
      {
        onSuccess: () => {
          toaster.add({ name: 'product-updated', title: 'Продукт обновлён', theme: 'success' });
          onClose();
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

  return (
    <Dialog open onClose={onClose} size="s" className="product-dialog">
      <Dialog.Header caption="Редактирование продукта" />
      <Dialog.Divider />
      <Dialog.Body>{form.fields}</Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button view="outlined" size="l" onClick={onClose}>
            Отмена
          </Button>
          <Button
            view="action"
            size="l"
            onClick={submit}
            disabled={!form.canSubmit}
            loading={update.isPending}
          >
            <Icon data={Pencil} size={16} />
            Изменить
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

  if (!product) return null;

  const runDelete = (deletionMode: 'soft' | 'immediate') => {
    remove.mutate(
      { id: product.id, mode: deletionMode },
      {
        onSuccess: () => {
          // Режим уходит на бэкенд, но пока не различается: периодов ещё нет,
          // и в обоих случаях продукт пропадает из справочника сразу.
          toaster.add({ name: 'product-deleted', title: 'Продукт удалён', theme: 'success' });
          onClose();
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

  return (
    <Dialog open onClose={onClose} size="s">
      <Dialog.Header caption={`Удалить «${product.name}»?`} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-2">
            Продукт может использоваться в ТТК и закупках. Выберите, как его удалить.
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
              До конца периода продукт останется в ТТК и приходных
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
          <Button view="flat" size="l" onClick={onClose} disabled={remove.isPending}>
            Отмена
          </Button>
        </Flex>
      </Dialog.Body>
    </Dialog>
  );
}
