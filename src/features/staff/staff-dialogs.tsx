import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Flex,
  Icon,
  SegmentedRadioGroup,
  Select,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { ArrowRight, Key, Pencil } from '@gravity-ui/icons';
import {
  useCreateEmployee,
  useDeleteEmployee,
  useResetPassword,
  useStaffRoles,
  useUpdateEmployee,
} from './api';
import type { CreateEmployeeRequest, Employee } from './types';
import { toWorkEmail, WORK_EMAIL_DOMAIN, workEmailLocalPart } from './work-email';
import './staff-dialogs.css';

/** Пустая форма: оба шага в одном состоянии. */
const EMPTY: CreateEmployeeRequest = {
  firstName: '',
  lastName: '',
  email: '',
  roleId: '',
  snils: '',
  inn: '',
  passport: '',
  otherDoc: '',
};

function employeeToForm(employee: Employee): CreateEmployeeRequest {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    roleId: employee.roleId,
    snils: employee.snils,
    inn: employee.inn,
    passport: employee.passport,
    otherDoc: employee.otherDoc,
  };
}

function isFirstStepReady(form: CreateEmployeeRequest): boolean {
  return (
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.roleId !== ''
  );
}

function isSecondStepReady(form: CreateEmployeeRequest): boolean {
  return (
    form.snils.trim() !== '' &&
    form.inn.trim() !== '' &&
    form.passport.trim() !== '' &&
    form.otherDoc.trim() !== ''
  );
}

/** Поля двух шагов формы сотрудника — общие для создания и редактирования. */
function EmployeeFormFields({
  step,
  form,
  onChange,
}: {
  step: 1 | 2;
  form: CreateEmployeeRequest;
  onChange: (patch: Partial<CreateEmployeeRequest>) => void;
}) {
  const roles = useStaffRoles();

  if (step === 1) {
    return (
      <>
        <Flex gap={2}>
          <TextInput
            size="l"
            label="Имя:"
            placeholder="Иван"
            value={form.firstName}
            onUpdate={(v) => onChange({ firstName: v })}
            autoFocus
            style={{ flex: 1 }}
          />
          <TextInput
            size="l"
            label="Фамилия:"
            placeholder="Иванов"
            value={form.lastName}
            onUpdate={(v) => onChange({ lastName: v })}
            style={{ flex: 1 }}
          />
        </Flex>
        <TextInput
          size="l"
          label="Рабочая почта:"
          placeholder="ivan.ivanov"
          value={workEmailLocalPart(form.email)}
          onUpdate={(v) => onChange({ email: toWorkEmail(v) })}
          endContent={
            <Text variant="body-1" color="secondary">
              {WORK_EMAIL_DOMAIN}
            </Text>
          }
        />
        <Select
          size="l"
          label="Роль:"
          placeholder="Выберите роль"
          width="max"
          value={form.roleId ? [form.roleId] : []}
          onUpdate={(v) => onChange({ roleId: v[0] ?? '' })}
          options={(roles.data?.roles ?? []).map((role) => ({
            value: role.id,
            content: role.name,
          }))}
        />
      </>
    );
  }

  return (
    <>
      <Flex gap={2}>
        <TextInput
          size="l"
          label="СНИЛС:"
          placeholder="00 000 0000 00"
          value={form.snils}
          onUpdate={(v) => onChange({ snils: v })}
          autoFocus
          style={{ flex: 1 }}
        />
        <TextInput
          size="l"
          label="ИНН:"
          placeholder="00 0000 000 00"
          value={form.inn}
          onUpdate={(v) => onChange({ inn: v })}
          style={{ flex: 1 }}
        />
      </Flex>
      <TextInput
        size="l"
        label="Паспорт:"
        placeholder="0123 456789"
        value={form.passport}
        onUpdate={(v) => onChange({ passport: v })}
      />
      <TextInput
        size="l"
        label="Другой док:"
        placeholder="000000000"
        value={form.otherDoc}
        onUpdate={(v) => onChange({ otherDoc: v })}
      />
    </>
  );
}

/** Двухшаговое добавление сотрудника из макета. */
export function AddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateEmployee();
  const toaster = useToaster();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(EMPTY);

  const set = (patch: Partial<CreateEmployeeRequest>) =>
    setForm((value) => ({ ...value, ...patch }));

  const close = () => {
    setStep(1);
    setForm(EMPTY);
    onClose();
  };

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
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-1" color="secondary">
            Шаг {step}/2
          </Text>
          <EmployeeFormFields step={step} form={form} onChange={set} />
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button view="flat" size="l" onClick={step === 1 ? close : () => setStep(1)}>
            {step === 1 ? 'Отмена' : 'Назад'}
          </Button>
          <Button
            view="action"
            size="l"
            onClick={step === 1 ? () => setStep(2) : submit}
            disabled={step === 1 ? !isFirstStepReady(form) : !isSecondStepReady(form)}
            loading={create.isPending}
          >
            <Icon data={ArrowRight} size={16} />
            {step === 1 ? 'Дальше' : 'Добавить и выдать пароль'}
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}

type EditTab = 'general' | 'documents';

/** Редактирование сотрудника — вкладки как в макете, без пошагового мастера. */
export function EditEmployeeDialog({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const update = useUpdateEmployee();
  const toaster = useToaster();
  const [tab, setTab] = useState<EditTab>('general');
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!employee) return;
    setTab('general');
    setForm(employeeToForm(employee));
  }, [employee]);

  if (!employee) return null;

  const set = (patch: Partial<CreateEmployeeRequest>) =>
    setForm((value) => ({ ...value, ...patch }));

  const close = () => {
    setTab('general');
    setForm(EMPTY);
    onClose();
  };

  const canSave = isFirstStepReady(form) && isSecondStepReady(form);

  const submit = () => {
    update.mutate(
      { id: employee.id, patch: form },
      {
        onSuccess: () => {
          toaster.add({
            name: 'employee-updated',
            title: 'Данные сотрудника обновлены',
            theme: 'success',
          });
          close();
        },
        onError: (e) =>
          toaster.add({
            name: 'employee-edit',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Dialog open onClose={close} size="s">
      <Dialog.Header caption="Редактирование данных сотрудника" />
      <Dialog.Divider />
      <div style={{ padding: '12px 16px 0' }}>
        <SegmentedRadioGroup
          className="employee-edit-tabs"
          size="l"
          width="max"
          value={tab}
          onUpdate={(value) => setTab(value as EditTab)}
        >
          <SegmentedRadioGroup.Option value="general" content="Общая информация" />
          <SegmentedRadioGroup.Option value="documents" content="Документы" />
        </SegmentedRadioGroup>
        {/* Линия по ширине сегмента, не на всю ширину диалога. */}
        <div
          style={{
            marginTop: 12,
            borderBottom: '1px solid var(--g-color-line-generic)',
          }}
        />
      </div>
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <EmployeeFormFields step={tab === 'general' ? 1 : 2} form={form} onChange={set} />
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button view="flat" size="l" onClick={close}>
            Отмена
          </Button>
          <Button
            view="action"
            size="l"
            onClick={submit}
            disabled={!canSave}
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

/** Сброс пароля: ссылка уходит на личную почту (можно поправить перед отправкой). */
export function ResetPasswordDialog({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const reset = useResetPassword();
  const toaster = useToaster();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!employee) return;
    setEmail(employee.email);
  }, [employee]);

  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const emailReady = email.trim() !== '';

  const submit = () => {
    reset.mutate(employee.id, {
      onSuccess: () => {
        toaster.add({
          name: 'employee-reset',
          title: 'Ссылка для сброса отправлена',
          content: email.trim(),
          theme: 'success',
        });
        onClose();
      },
      onError: (e) =>
        toaster.add({
          name: 'employee-reset-error',
          title: 'Ошибка',
          content: e.message,
          theme: 'danger',
        }),
    });
  };

  return (
    <Dialog open onClose={onClose} size="s">
      <Dialog.Header caption="Сброс пароля" />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-2">
            Сброс пароля для{' '}
            <Text variant="body-2" style={{ fontWeight: 600 }}>
              {fullName}
            </Text>
            . Ссылка для установки нового пароля будет отправлена сотруднику на указанную почту.
          </Text>
          <TextInput
            size="l"
            label="Почта для сброса:"
            placeholder="ivan.ivanov"
            value={workEmailLocalPart(email)}
            onUpdate={(v) => setEmail(toWorkEmail(v))}
            endContent={
              <Text variant="body-1" color="secondary">
                {WORK_EMAIL_DOMAIN}
              </Text>
            }
          />
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button view="flat" size="l" onClick={onClose}>
            Отмена
          </Button>
          <Button
            view="action"
            size="l"
            onClick={submit}
            disabled={!emailReady}
            loading={reset.isPending}
          >
            <Icon data={Key} size={16} />
            Сбросить пароль
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
