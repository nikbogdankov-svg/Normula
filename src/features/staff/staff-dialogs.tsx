import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { ArrowRight, Envelope, Pencil } from '@gravity-ui/icons';
import { ErrorState, LoadingState } from '@/shared/ui/states';
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployeeCard,
  useResendInvitation,
  useStaffRoles,
  useUpdateEmployee,
} from './api';
import { EMPTY_DOCUMENTS, type Employee, type EmployeeDocuments } from './types';
import { toWorkEmail, WORK_EMAIL_DOMAIN, workEmailLocalPart } from './work-email';
import './staff-dialogs.css';

/** Общая форма обоих шагов и обеих вкладок. */
interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  orgEmail: string;
  roleId: string;
  documents: EmployeeDocuments;
}

const EMPTY: EmployeeForm = {
  firstName: '',
  lastName: '',
  email: '',
  orgEmail: '',
  roleId: '',
  documents: EMPTY_DOCUMENTS,
};

/**
 * Первый шаг обязателен целиком: без имени, почты и роли сотрудника не
 * завести. Документы — нет: карточку заводят раньше, чем приносят паспорт,
 * и бэкенд пустые поля принимает.
 */
function isProfileReady(form: EmployeeForm): boolean {
  return (
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.roleId !== ''
  );
}

function toastError(toaster: ReturnType<typeof useToaster>, name: string, error: unknown): void {
  toaster.add({
    name,
    title: 'Ошибка',
    content: error instanceof Error ? error.message : 'Неизвестная ошибка',
    theme: 'danger',
  });
}

/** Поля профиля — первый шаг мастера и вкладка «Общая информация». */
function ProfileFields({
  form,
  onChange,
  withOrgEmail = true,
  showPasswordNote = true,
}: {
  form: EmployeeForm;
  onChange: (patch: Partial<EmployeeForm>) => void;
  withOrgEmail?: boolean;
  showPasswordNote?: boolean;
}) {
  const roles = useStaffRoles();

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
        label="Почта:"
        placeholder="example@mail.ru"
        type="email"
        value={form.email}
        onUpdate={(v) => onChange({ email: v })}
        note={
          <Text variant="caption-2" color="secondary" style={{ textAlign: 'left' }}>
            На эту почту придет пароль, с которым сотрудник войдет в систему.
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
      {/* Домен фиксирован, вводится только локальная часть — виджет из
          макета. Поле необязательное и ни на что не влияет: приглашение
          уходит на почту выше, а сюда пишут корпоративный адрес, если он
          вообще есть. */}
      {withOrgEmail && (
        <TextInput
          size="l"
          label="E-mail организации:"
          placeholder="i.ivanov"
          value={workEmailLocalPart(form.orgEmail)}
          onUpdate={(v) => onChange({ orgEmail: toWorkEmail(v) })}
          endContent={
            <Text variant="body-1" color="secondary">
              {WORK_EMAIL_DOMAIN}
            </Text>
          }
        />
      )}
    </>
  );
}

/** Документы — второй шаг мастера и вкладка «Документы». */
function DocumentFields({
  documents,
  onChange,
}: {
  documents: EmployeeDocuments;
  onChange: (patch: Partial<EmployeeDocuments>) => void;
}) {
  return (
    <>
      <Flex gap={2}>
        <TextInput
          size="l"
          label="СНИЛС:"
          placeholder="112-233-445 95"
          value={documents.snils}
          onUpdate={(v) => onChange({ snils: v })}
          autoFocus
          style={{ flex: 1 }}
        />
        <TextInput
          size="l"
          label="ИНН:"
          placeholder="12 цифр"
          value={documents.inn}
          onUpdate={(v) => onChange({ inn: v })}
          style={{ flex: 1 }}
        />
      </Flex>
      {/* В макете паспорт одним полем, но серия и номер хранятся раздельно:
          склеивать их в одну строку значило бы разбирать её обратно. */}
      <Flex gap={2}>
        <TextInput
          size="l"
          label="Серия:"
          placeholder="0123"
          value={documents.passportSeries}
          onUpdate={(v) => onChange({ passportSeries: v })}
          style={{ flex: 1 }}
        />
        <TextInput
          size="l"
          label="Номер:"
          placeholder="456789"
          value={documents.passportNumber}
          onUpdate={(v) => onChange({ passportNumber: v })}
          style={{ flex: 2 }}
        />
      </Flex>
      <TextInput
        size="l"
        label="Другой док:"
        placeholder="Необязательно"
        value={documents.otherDoc}
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

  const set = (patch: Partial<EmployeeForm>) => setForm((value) => ({ ...value, ...patch }));
  const setDoc = (patch: Partial<EmployeeDocuments>) =>
    setForm((value) => ({ ...value, documents: { ...value.documents, ...patch } }));

  const close = () => {
    setStep(1);
    setForm(EMPTY);
    onClose();
  };

  const submit = () => {
    create.mutate(form, {
      onSuccess: () => {
        toaster.add({
          name: 'employee-created',
          title: 'Сотрудник добавлен',
          content: `Приглашение отправлено на ${form.email.trim()}`,
          theme: 'success',
        });
        close();
      },
      // Карточка могла создаться, а письмо не уйти. Закрывать диалог нельзя:
      // человек должен увидеть, что пошло не так, а сотрудник уже в списке —
      // приглашение оттуда высылается заново.
      onError: (e) => toastError(toaster, 'employee-add', e),
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
          {step === 1 ? (
            <ProfileFields form={form} onChange={set} withOrgEmail={false} />
          ) : (
            <DocumentFields documents={form.documents} onChange={setDoc} />
          )}
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
            disabled={step === 1 && !isProfileReady(form)}
            loading={create.isPending}
          >
            <Icon data={step === 1 ? ArrowRight : Envelope} size={16} />
            {step === 1 ? 'Дальше' : 'Добавить и отправить приглашение'}
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}

type EditTab = 'general' | 'documents';

/**
 * Редактирование сотрудника — вкладки как в макете.
 *
 * Карточка догружается целиком: в списке документов нет, они приезжают
 * только по GetEmployee. Одним запросом на обе вкладки, поэтому при
 * переключении вкладки ничего не подгружается.
 */
export function EditEmployeeDialog({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const card = useEmployeeCard(employee?.id ?? null);
  const update = useUpdateEmployee();
  const toaster = useToaster();
  const [tab, setTab] = useState<EditTab>('general');
  const [form, setForm] = useState(EMPTY);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!card.data) return;
    setForm({
      firstName: card.data.employee.firstName,
      lastName: card.data.employee.lastName,
      email: card.data.employee.email,
      orgEmail: card.data.employee.orgEmail,
      roleId: card.data.employee.roleId,
      documents: card.data.documents,
    });
  }, [card.data]);

  // Animate dialog body height when tab or content changes for smooth resize.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Measure previous and next heights and animate between them.
    const prevHeight = outer.clientHeight || inner.scrollHeight;
    const nextHeight = inner.scrollHeight;

    // Set to previous explicit height, then to new height to trigger transition.
    outer.style.height = `${prevHeight}px`;
    // Force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    outer.offsetHeight;
    outer.style.transition = 'height 180ms ease';
    outer.style.height = `${nextHeight}px`;

    const onEnd = () => {
      // Allow natural height after transition.
      outer.style.height = 'auto';
      outer.style.transition = '';
      outer.removeEventListener('transitionend', onEnd);
    };
    outer.addEventListener('transitionend', onEnd);
  }, [tab, card.data, employee]);

  useEffect(() => {
    if (employee) setTab('general');
  }, [employee]);

  if (!employee) return null;

  const set = (patch: Partial<EmployeeForm>) => setForm((value) => ({ ...value, ...patch }));
  const setDoc = (patch: Partial<EmployeeDocuments>) =>
    setForm((value) => ({ ...value, documents: { ...value.documents, ...patch } }));

  const close = () => {
    setTab('general');
    setForm(EMPTY);
    onClose();
  };

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
        onError: (e) => toastError(toaster, 'employee-edit', e),
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
        <div style={{ marginTop: 12, borderBottom: '1px solid var(--g-color-line-generic)' }} />
      </div>
      <Dialog.Body>
        <div style={{ overflow: 'hidden' }} ref={outerRef}>
          <div ref={innerRef}>
            <Flex direction="column" gap={3}>
              {card.isPending && <LoadingState />}
              {card.isError && <ErrorState error={card.error} onRetry={() => void card.refetch()} />}
                  {card.data &&
                    (tab === 'general' ? (
                      <ProfileFields form={form} onChange={set} withOrgEmail={false} showPasswordNote={false} />
                    ) : (
                      <DocumentFields documents={form.documents} onChange={setDoc} />
                    ))}
            </Flex>
          </div>
        </div>
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
            disabled={!card.data || !isProfileReady(form)}
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
      onError: (e) => toastError(toaster, 'employee-delete', e),
    });
  };

  return (
    <Dialog open onClose={onClose} size="s">
      <Dialog.Header caption="Удаление сотрудника" />
      <Dialog.Body>
        <Text variant="body-2">
          Удалить {employee.lastName} {employee.firstName}? Доступ к системе закроется сразу.
          Учётная запись человека останется — он может работать и в другой организации.
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

/**
 * Повторная отправка приглашения — на месте «Сброса пароля» из макета.
 *
 * Паролей сервис не выдаёт и не хранит: человек задаёт его сам при
 * регистрации в Logto. Поменять адрес прямо здесь нельзя намеренно —
 * приглашение уходит на ту почту, что записана в карточке, а поправить её
 * можно в редактировании, где изменение сохранится.
 */
export function ResendInvitationDialog({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const resend = useResendInvitation();
  const toaster = useToaster();

  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`.trim();

  const submit = () => {
    resend.mutate(employee.id, {
      onSuccess: () => {
        toaster.add({
          name: 'employee-invited',
          title: 'Приглашение отправлено',
          content: employee.email,
          theme: 'success',
        });
        onClose();
      },
      onError: (e) => toastError(toaster, 'employee-invite', e),
    });
  };

  return (
    <Dialog open onClose={onClose} size="s">
      <Dialog.Header caption="Отправить приглашение заново" />
      <Dialog.Divider />
      <Dialog.Body>
        <Text variant="body-2">
          Выслать{' '}
          <Text variant="body-2" style={{ fontWeight: 600 }}>
            {fullName}
          </Text>{' '}
          новое приглашение на {employee.email}? Прежняя ссылка перестанет работать.
        </Text>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button view="flat" size="l" onClick={onClose}>
            Отмена
          </Button>
          <Button view="action" size="l" onClick={submit} loading={resend.isPending}>
            <Icon data={Envelope} size={16} />
            Отправить
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
