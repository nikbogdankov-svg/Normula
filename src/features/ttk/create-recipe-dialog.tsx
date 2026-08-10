import { useEffect, useState } from 'react';
import { Button, Drawer, Icon, Text, useToaster } from '@gravity-ui/uikit';
import { Plus, Xmark } from '@gravity-ui/icons';
import { useCreateRecipe } from './api';
import { useRecipeForm } from './recipe-form';
import { useDrawerHeight } from './use-drawer-height';
import './recipe-drawer.css';

/**
 * Создание ТТК в нижнем drawer.
 * Редактирование существующей карты — в RecipeDialog (тот же drawer, смена содержимого).
 */
export function CreateRecipeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const height = useDrawerHeight();
  const create = useCreateRecipe();
  const toaster = useToaster();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const form = useRecipeForm(null, String(formKey));

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    setFormKey((key) => key + 1);
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // После анимации закрытия размонтируем drawer.
  useEffect(() => {
    if (visible || open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [visible, open, mounted]);

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

  const submit = () => {
    create.mutate(form.getBody(), {
      onSuccess: () => {
        toaster.add({ name: 'ttk-created', title: 'ТТК создана', theme: 'success' });
        requestClose();
      },
      onError: (e) =>
        toaster.add({ name: 'ttk-create', title: 'Ошибка', content: e.message, theme: 'danger' }),
    });
  };

  if (!mounted) return null;

  return (
    <Drawer
      open={visible}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) requestClose();
      }}
      placement="bottom"
      size={height}
      maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
      contentOverflow="auto"
      className="ttk-recipe-drawer"
      contentClassName="ttk-recipe-drawer__panel"
    >
      <div className="ttk-recipe-drawer__card">
        <div className="ttk-recipe-drawer__header">
          <div className="ttk-recipe-drawer__title-row">
            <Text variant="subheader-2">Создать ТТК</Text>
          </div>
          <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
            <Icon data={Xmark} size={20} />
          </Button>
        </div>

        <div className="ttk-recipe-drawer__body ttk-recipe-drawer__body_create">{form.fields}</div>

        <div className="ttk-recipe-drawer__footer">
          <Button view="outlined" size="l" onClick={requestClose}>
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
            Создать ТТК
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
