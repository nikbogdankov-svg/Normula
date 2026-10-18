import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, useToaster } from '@gravity-ui/uikit';
import { useTranslation } from 'react-i18next';
import { useCreateProduct } from './api';
import { useProductForm } from './product-form';
import './product-dialog.css';
import { errorText } from '@/shared/api/error-text';

/**
 * Минимальный диалог создания продукта (имя + единица), вызываемый inline
 * из автокомплитов ТТК и приходных склада. Возвращает созданный продукт.
 */
export function CreateProductDialog({
  open,
  initialName,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreated: (product: { id: string; name: string; unit: string }) => void;
}) {
  const create = useCreateProduct();
  const toaster = useToaster();
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(0);
  const form = useProductForm(null, String(formKey));

  useEffect(() => {
    if (open) {
      setFormKey((key) => key + 1);
      if (initialName) form.setInitialName(initialName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при открытии
  }, [open]);

  const submit = () => {
    create.mutate(form.getBody(), {
      onSuccess: (data) => {
        toaster.add({ name: 'product-created', title: t('products.created'), theme: 'success' });
        onCreated(data.product);
        onClose();
      },
      onError: (e) =>
        toaster.add({
          name: 'product-create',
          title: t('common.error'),
          content: errorText(e),
          theme: 'danger',
        }),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} size="s" className="product-dialog">
      <Dialog.Header caption={t('products.createTitle')} />
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
            loading={create.isPending}
          >
            {t('products.createButton')}
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
