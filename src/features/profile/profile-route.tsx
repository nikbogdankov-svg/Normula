import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card, Flex, Icon, Select, Switch, Text, TextInput } from '@gravity-ui/uikit';
import { ArrowRightFromSquare, Bell, Gear, Key, Person, ShieldCheck } from '@gravity-ui/icons';
import type { IconData } from '@gravity-ui/uikit';
import { useAuth } from '@/shared/auth';
import { config } from '@/shared/config';
import { useAppTheme } from '@/app/theme';
import { LoadingState } from '@/shared/ui/states';
import { useTranslation, setLanguage, LANGUAGES, i18n, type Language } from '@/shared/i18n';

const NOTIFY_INVITES_KEY = 'onemore.notify.invites';
const NOTIFY_IMPORTS_KEY = 'onemore.notify.imports';

function readFlag(key: string, fallback: boolean): boolean {
  const saved = localStorage.getItem(key);
  if (saved === null) return fallback;
  return saved === 'true';
}

/**
 * «Мой профиль» — личные данные, безопасность и предпочтения.
 * Карточки в том же стиле, что «Управление» / «Персонал».
 */
export function ProfileRoute() {
  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <PersonalCard />
      <SecurityCard />
      <PreferencesCard />
      <NotificationsCard />
    </Flex>
  );
}

function PersonalCard() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  return (
    <ProfileCard icon={Person} title={t('profile.personalTitle')}>
      {isLoading && <LoadingState />}
      {!isLoading && !user && (
        <Text variant="body-2" color="secondary">
          {t('profile.personalEmpty')}
        </Text>
      )}
      {user && (
        <Flex direction="column" gap={3} style={{ maxWidth: 420 }}>
          <Field label={t('profile.fieldName')}>
            <TextInput value={user.name || '—'} readOnly />
          </Field>
          <Field label={t('profile.fieldEmail')}>
            <TextInput value={user.email || '—'} readOnly />
          </Field>
          <Field label={t('profile.fieldId')}>
            <TextInput value={user.id} readOnly />
          </Field>
        </Flex>
      )}
    </ProfileCard>
  );
}

function SecurityCard() {
  const { signOut } = useAuth();

  const openPasswordSettings = () => {
    window.open(config.logto.endpoint, '_blank', 'noopener,noreferrer');
  };

  const { t } = useTranslation();

  return (
    <ProfileCard icon={ShieldCheck} title={t('profile.securityTitle')}>
      <Flex direction="column" gap={3} style={{ maxWidth: 520 }}>
        <Text variant="body-2" color="secondary">
          {t('profile.securityDesc')}
        </Text>
        <Flex gap={2} wrap>
          <Button view="outlined" onClick={openPasswordSettings}>
            <Icon data={Key} size={16} />
            {t('profile.managePassword')}
          </Button>
          <Button view="outlined-danger" onClick={() => void signOut()}>
            <Icon data={ArrowRightFromSquare} size={16} />
            {t('profile.signOut')}
          </Button>
        </Flex>
      </Flex>
    </ProfileCard>
  );
}

function PreferencesCard() {
  const { t } = useTranslation();
  const { theme, setTheme } = useAppTheme();

  return (
    <ProfileCard icon={Gear} title={t('profile.preferencesTitle')}>
      <Flex direction="column" gap={3} style={{ maxWidth: 420 }}>
        <Field label={t('profile.themeLabel')}>
          <Select
            width="max"
            value={[theme]}
            onUpdate={(value) => {
              const next = value[0];
              if (next === 'light' || next === 'dark') setTheme(next);
            }}
            options={[
              { value: 'light', content: t('profile.themeLight') },
              { value: 'dark', content: t('profile.themeDark') },
            ]}
          />
        </Field>
        <Field label={t('profile.languageLabel')}>
          <Select
            width="max"
            value={[i18n.language]}
            onUpdate={(value) => setLanguage(value[0] as Language)}
            options={LANGUAGES.map((language) => ({
              value: language.code,
              content: language.label,
            }))}
          />
          <Text variant="caption-2" color="secondary">
            {t('profile.languageCaption')}
          </Text>
        </Field>
      </Flex>
    </ProfileCard>
  );
}

function NotificationsCard() {
  const [invites, setInvites] = useState(() => readFlag(NOTIFY_INVITES_KEY, true));
  const [imports, setImports] = useState(() => readFlag(NOTIFY_IMPORTS_KEY, true));

  useEffect(() => {
    localStorage.setItem(NOTIFY_INVITES_KEY, String(invites));
  }, [invites]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_IMPORTS_KEY, String(imports));
  }, [imports]);

  const { t } = useTranslation();

  return (
    <ProfileCard icon={Bell} title={t('profile.notificationsTitle')}>
      <Flex direction="column" gap={3} style={{ maxWidth: 520 }}>
        <Text variant="body-2" color="secondary">
          {t('profile.notificationsDesc')}
        </Text>
        <Switch checked={invites} onUpdate={setInvites}>
          {t('profile.notifyInvites')}
        </Switch>
        <Switch checked={imports} onUpdate={setImports}>
          {t('profile.notifyImports')}
        </Switch>
      </Flex>
    </ProfileCard>
  );
}

function ProfileCard({
  icon,
  title,
  children,
}: {
  icon: IconData;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex alignItems="center" gap={2} style={{ padding: '12px 16px' }}>
        <Icon data={icon} size={16} />
        <Text variant="subheader-2">{title}</Text>
      </Flex>
      <div style={{ borderTop: '1px solid var(--g-color-line-generic)', padding: 16 }}>
        {children}
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex direction="column" gap={1}>
      <Text variant="body-1" color="secondary">
        {label}
      </Text>
      {children}
    </Flex>
  );
}
