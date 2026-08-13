import { useState } from 'react';
import { Button, Card, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { ChevronDown, ChevronUp, Lock, ShieldCheck } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import { useStaffRoles } from './api';
import type { StaffRole } from './types';

/**
 * «Доступы для ролей» из макета: свёрнутая карточка, внутри — по блоку
 * на роль с чипами открытых разделов.
 *
 * Только чтение. В макете у ролей есть кнопки «Добавить доступ» и крестики
 * на чипах, но менять доступы бэкенд не умеет: роли живут в Logto и общие
 * для всех организаций тенанта, так что правка роли «Повар» в одной
 * организации изменила бы её во всех. Рисовать кнопку, которая ничего не
 * сделает, хуже, чем не рисовать.
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
  return (
    <Card view="outlined" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        style={{ padding: '10px 12px', borderBottom: '1px solid var(--g-color-line-generic)' }}
      >
        <Text variant="body-2">{role.name}</Text>
      </Flex>

      <Flex gap={1} wrap style={{ padding: '10px 12px' }}>
        {/* Роль открывает все разделы — перечислять их поштучно незачем,
            в макете это один чип «Весь функционал». */}
        {role.fullAccess && (
          <Label icon={<Icon data={Lock} size={12} />} theme="normal">
            Весь функционал
          </Label>
        )}

        {!role.fullAccess && role.sections.length === 0 && (
          <Text variant="body-1" color="hint">
            доступов нет
          </Text>
        )}

        {!role.fullAccess &&
          role.sections.map((section) => (
            <Label key={section.id} theme="normal">
              {section.title}
            </Label>
          ))}
      </Flex>
    </Card>
  );
}
