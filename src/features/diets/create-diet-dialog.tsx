import { useEffect, useState } from 'react';
import { Button, Dialog, Flex, Icon, useToaster } from '@gravity-ui/uikit';
import { Plus } from '@gravity-ui/icons';
import { useCreateDiet } from './api';
import { useDietForm } from './diet-form';
import './diets-route.css';

/** Создание диеты в модалке (popup size s). */
export function CreateDietDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateDiet();
  const toaster = useToaster();
  const [formKey, setFormKey] = useState(0);
  const form = useDietForm(null, String(formKey));

  // При каждом открытии — свежая форма.
  useEffect(() => {
    if (open) setFormKey((key) => key + 1);
  }, [open]);

  const submit = () => {
    create.mutate(form.getBody(), {
      onSuccess: () => {
        toaster.add({ name: 'diet-created', title: 'Диета создана', theme: 'success' });
        onClose();
      },
      onError: (e) =>
        toaster.add({
          name: 'diet-create',
          title: 'Ошибка',
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} size="s" className="diet-dialog">
      <Dialog.Header caption="Создать диету" />
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
            loading={create.isPending}
          >
            <Icon data={Plus} size={16} />
            Создать диету
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
