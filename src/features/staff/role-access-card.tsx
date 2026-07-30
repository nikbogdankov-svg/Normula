import { useState } from 'react';
import { Button, Card, Flex, Icon, Label, Select, Text, useToaster } from '@gravity-ui/uikit';
import { ChevronDown, ChevronUp, Lock, Plus, ShieldCheck } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import { NAV_GROUPS } from '@/app/layout/nav';
import { useSetRoleSections, useStaffRoles } from './api';
import type { StaffRole } from './types';

/**
 * «Доступы для ролей» из макета: свёрнутая карточка, внутри — по блоку
 * на роль с чипами разрешённых разделов.
 *
 * Разделы берутся из той же навигации, что и левое меню: доступ выдаётся
 * группами (Планирование, Склад, …), поэтому второй список заводить незачем.
 */
export function RoleAccessCard() {
  const [open, setOpen] = useState(false);
  const { current } = useOrganizations();
  const { data, isPending, isError, error, refetch } = useStaffRoles();

  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        style={{ padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setOpen((value) => !value)}
      >
        <Flex alignItems="center" gap={2}>
          <Icon data={ShieldCheck} size={16} />
          <Text variant="subheader-2">Доступы для ролей</Text>
        </Flex>
        <Button view="flat" size="s" aria-label={open ? 'Свернуть' : 'Развернуть'}>
          <Icon data={open ? ChevronUp : ChevronDown} size={16} />
        </Button>
      </Flex>

      {open && (
        <div style={{ borderTop: '1px solid var(--g-color-line-generic)', padding: 16 }}>
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && (
            <Flex direction="column" gap={2}>
              {data.roles.map((role) => (
                <RoleRow key={role.id} role={role} />
              ))}
            </Flex>
          )}
        </div>
      )}
    </Card>
  );
}

function RoleRow({ role }: { role: StaffRole }) {
  const setSections = useSetRoleSections();
  const toaster = useToaster();
  const [adding, setAdding] = useState(false);

  const granted = new Set(role.sections.map((section) => section.id));
  const available = NAV_GROUPS.filter((group) => !granted.has(group.title));

  const save = (sectionIds: string[]) => {
    setSections.mutate(
      { roleId: role.id, sectionIds },
      {
        onError: (e) =>
          toaster.add({
            name: 'role-access',
            title: 'Ошибка',
            content: e.message,
            theme: 'danger',
          }),
      }
    );
  };

  return (
    <Card view="outlined" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        style={{ padding: '10px 12px', borderBottom: '1px solid var(--g-color-line-generic)' }}
      >
        <Text variant="body-2">{role.name}</Text>

        {/* У системной роли доступы не редактируются — кнопки нет вовсе,
            иначе она обещала бы действие, которое не выполнится. */}
        {!role.locked &&
          (adding ? (
            <Select
              size="s"
              width={220}
              placeholder="Выберите раздел"
              open
              onOpenChange={(isOpen) => !isOpen && setAdding(false)}
              onUpdate={(value) => {
                setAdding(false);
                save([...granted, ...value]);
              }}
              options={available.map((group) => ({ value: group.title, content: group.title }))}
            />
          ) : (
            <Button
              view="outlined"
              size="s"
              onClick={() => setAdding(true)}
              disabled={available.length === 0}
            >
              <Icon data={Plus} size={14} />
              Добавить доступ
            </Button>
          ))}
      </Flex>

      <Flex gap={1} wrap style={{ padding: '10px 12px' }}>
        {role.locked && (
          <Label icon={<Icon data={Lock} size={12} />} theme="normal">
            Весь функционал
          </Label>
        )}

        {!role.locked && role.sections.length === 0 && (
          <Text variant="body-1" color="hint">
            доступов нет
          </Text>
        )}

        {!role.locked &&
          role.sections.map((section) => (
            <Label
              key={section.id}
              theme="normal"
              onCloseClick={() =>
                save(role.sections.filter((s) => s.id !== section.id).map((s) => s.id))
              }
            >
              {section.title}
            </Label>
          ))}
      </Flex>
    </Card>
  );
}
