import { useState } from 'react';
import { Button, Card, Flex, Icon, Label, Text } from '@gravity-ui/uikit';
import { ChevronDown, ChevronUp, ShieldCheck } from '@gravity-ui/icons';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState, NoOrganizationSelectedState } from '@/shared/ui/states';
import { useOrganizationRoles } from './api';
import { useOrganizations } from '@/shared/auth';

/**
 * Справочник организационных ролей и их разрешений.
 * Свёрнут по умолчанию — как «Доступы для ролей» в макете администрирования.
 */
export function RolesCard() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { current } = useOrganizations();
  const { data, isPending, isError, error, refetch } = useOrganizationRoles();

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
          <Text variant="subheader-2">{t('org.rolesTitle')}</Text>
        </Flex>
        <Button view="flat" size="s" aria-label={open ? t('org.collapse') : t('org.expand')}>
          <Icon data={open ? ChevronUp : ChevronDown} size={16} />
        </Button>
      </Flex>

      {open && (
        <div style={{ borderTop: '1px solid var(--g-color-line-generic)', padding: 16 }}>
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && (
            <Flex direction="column" gap={4}>
              {data.roles.map((role) => (
                <Flex key={role.id} direction="column" gap={1}>
                  <Text variant="subheader-1">{role.name}</Text>
                  {role.description && (
                    <Text variant="body-1" color="secondary">
                      {role.description}
                    </Text>
                  )}
                  <Flex gap={1} wrap>
                    {role.scopes.length === 0 && (
                      <Text variant="body-1" color="hint">
                        {t('org.noPermissions')}
                      </Text>
                    )}
                    {role.scopes.map((scope) => (
                      <Label key={scope.id} theme="normal">
                        {scope.name}
                      </Label>
                    ))}
                  </Flex>
                </Flex>
              ))}
            </Flex>
          )}
        </div>
      )}
    </Card>
  );
}
