import { useEffect, useState } from 'react';
import { Button, Drawer, Icon, Text, useToaster } from '@gravity-ui/uikit';
import { Plus, Xmark } from '@gravity-ui/icons';
import { useCreateRecipe } from './api';
import { useRecipeForm } from './recipe-form';
import { useDrawerHeight } from './use-drawer-height';
import { useTranslation } from '@/shared/i18n';
import './recipe-drawer.css';
import { errorText } from '@/shared/api/error-text';

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
  const { t } = useTranslation();

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

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

  const submit = () => {
    const body = form.getBody();
    if (!body) return;

    create.mutate(body, {
      onSuccess: () => {
        toaster.add({ name: 'ttk-created', title: t('ttk.created'), theme: 'success' });
        requestClose();
      },
      onError: (e) =>
        toaster.add({
          name: 'ttk-create',
          title: t('common.error'),
          content: errorText(e),
          theme: 'danger',
        }),
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
            <Text variant="subheader-3">{t('ttk.createTitle')}</Text>
          </div>
          <Button view="flat" size="l" onClick={requestClose} aria-label={t('common.close')}>
            <Icon data={Xmark} size={20} />
          </Button>
        </div>

        <div className="ttk-recipe-drawer__body ttk-recipe-drawer__body_create">{form.fields}</div>

        <div className="ttk-recipe-drawer__footer">
          <Button view="outlined" size="l" onClick={requestClose}>
            {t('common.cancel')}
          </Button>
          <Button
            view="action"
            size="l"
            onClick={submit}
            disabled={!form.canSubmit}
            loading={create.isPending}
          >
            <Icon data={Plus} size={16} />
            {t('ttk.createTitle')}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
