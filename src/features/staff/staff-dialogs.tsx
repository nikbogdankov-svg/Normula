import { useState } from 'react';
import { Dialog, Flex, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { Lock } from '@gravity-ui/icons';
import { useCreateEmployee, useDeleteEmployee, useResetPassword, useStaffRoles } from './api';
import type { Employee } from './types';

/** Пустая форма добавления: оба шага в одном состоянии. */
const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  roleId: '',
  snils: '',
  inn: '',
  passport: '',
  otherDoc: '',
};

/**
 * Почта в организации собирается из имени и фамилии, как в макете:
 * поле только для чтения и до заполнения ФИО пустое.
 */
function orgEmail(firstName: string, lastName: string): string {
  if (!firstName.trim() || !lastName.trim()) return '';

  const slug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]/gi, '');

  return `${slug(firstName)}.${slug(lastName)}@zdorovoyepitanie.ru`;
}

/** Двухшаговое добавление сотрудника из макета. */
export function AddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateEmployee();
  const roles = useStaffRoles();
  const toaster = useToaster();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(EMPTY);

  const set = (patch: Partial<typeof EMPTY>) => setForm((value) => ({ ...value, ...patch }));

  const close = () => {
    setStep(1);
    setForm(EMPTY);
    onClose();
  };

  const firstStepReady =
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.roleId !== '';

  const submit = () => {
    create.mutate(form, {
      onSuccess: (result) => {
        toaster.add({
          name: 'employee-created',
          title: 'Сотрудник добавлен',
          content: `Пароль: ${result.password}`,
          theme: 'success',
          autoHiding: false,
        });
        close();
      },
      onError: (e) =>
        toaster.add({ name: 'employee-add', title: 'Ошибка', content: e.message, theme: 'danger' }),
    });
  };

  return (
    <Dialog open={open} onClose={close} size="s">
      <Dialog.Header caption="Добавление нового сотрудника" />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-1" color="secondary">
            Шаг {step}/2
          </Text>

          {step === 1 ? (
            <>
              <Flex gap={2}>
                <TextInput
                  label="Имя:"
                  placeholder="Иван"
                  value={form.firstName}
                  onUpdate={(v) => set({ firstName: v })}
                  autoFocus
                />
                <TextInput
                  label="Фамилия:"
                  placeholder="Иванов"
                  value={form.lastName}
                  onUpdate={(v) => set({ lastName: v })}
                />
              </Flex>
              <TextInput
                label="Почта:"
                placeholder="example@mail.ru"
                type="email"
                value={form.email}
                onUpdate={(v) => set({ email: v })}
              />
              <Select
                label="Роль:"
                placeholder="Выберите роль"
                width="max"
                value={form.roleId ? [form.roleId] : []}
                onUpdate={(v) => set({ roleId: v[0] ?? '' })}
                options={(roles.data?.roles ?? []).map((role) => ({
                  value: role.id,
                  content: role.name,
                }))}
              />
              <TextInput
                label="E-mail организации:"
                placeholder="Доступен после ввода имени и фамилии"
                value={orgEmail(form.firstName, form.lastName)}
                disabled
                startContent={<Icon data={Lock} size={14} />}
              />
            </>
          ) : (
            <>
              <Flex gap={2}>
                <TextInput
                  label="СНИЛС:"
                  placeholder="Иван"
                  value={form.snils}
                  onUpdate={(v) => set({ snils: v })}
                  autoFocus
                />
                <TextInput
                  label="ИНН:"
                  placeholder="Иванов"
                  value={form.inn}
                  onUpdate={(v) => set({ inn: v })}
                />
              </Flex>
              <TextInput
                label="Паспорт:"
                placeholder="0123 456789"
                value={form.passport}
                onUpdate={(v) => set({ passport: v })}
              />
              <TextInput
                label="Другой док:"
                placeholder="example@mail.ru"
                value={form.otherDoc}
                onUpdate={(v) => set({ otherDoc: v })}
              />
            </>
          )}
        </Flex>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={step === 1 ? close : () => setStep(1)}
        onClickButtonApply={step === 1 ? () => setStep(2) : submit}
        textButtonCancel={step === 1 ? 'Отмена' : 'Назад'}
        textButtonApply={step === 1 ? 'Дальше' : 'Добавить и выдать пароль'}
        propsButtonApply={{ disabled: step === 1 && !firstStepReady }}
        loading={create.isPending}
      />
    </Dialog>
  );
}

/** Подтверждение удаления сотрудника. */
export function DeleteEmployeeDialog({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const remove = useDeleteEmployee();
  const toaster = useToaster();

  if (!employee) return null;

  const submit = () => {
    remove.mutate(employee.id, {
      onSuccess: () => {
        toaster.add({ name: 'employee-deleted', title: 'Сотрудник удалён', theme: 'success' });
        onClose();
      },
      onError: (e) =>
        toaster.add({
          name: 'employee-delete',
          title: 'Ошибка',
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  return (
    <Dialog open onClose={onClose} size="s">
      <Dialog.Header caption="Удаление сотрудника" />
      <Dialog.Body>
        <Text variant="body-2">
          Удалить {employee.lastName} {employee.firstName}? Доступ к системе будет закрыт сразу,
          отменить действие нельзя.
        </Text>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={onClose}
        onClickButtonApply={submit}
        textButtonCancel="Отмена"
        textButtonApply="Удалить"
        propsButtonApply={{ view: 'outlined-danger' }}
        loading={remove.isPending}
      />
    </Dialog>
  );
}

/** Сброс пароля: новый пароль показывается один раз. */
export function ResetPasswordDialog({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const reset = useResetPassword();
  const [password, setPassword] = useState<string | null>(null);

  if (!employee) return null;

  const close = () => {
    setPassword(null);
    onClose();
  };

  const submit = () => {
    reset.mutate(employee.id, { onSuccess: (result) => setPassword(result.password) });
  };

  return (
    <Dialog open onClose={close} size="s">
      <Dialog.Header caption="Сброс пароля" />
      <Dialog.Body>
        {password === null ? (
          <Text variant="body-2">
            Сбросить пароль для {employee.lastName} {employee.firstName}? Старый пароль перестанет
            работать сразу.
          </Text>
        ) : (
          <Flex direction="column" gap={2}>
            <Text variant="body-2">Новый пароль — покажется только сейчас:</Text>
            <TextInput value={password} readOnly />
          </Flex>
        )}
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={password === null ? close : undefined}
        onClickButtonApply={password === null ? submit : close}
        textButtonCancel="Отмена"
        textButtonApply={password === null ? 'Сбросить' : 'Готово'}
        loading={reset.isPending}
      />
    </Dialog>
  );
}
