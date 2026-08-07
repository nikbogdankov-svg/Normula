import { useEffect, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Flex,
  Icon,
  Select,
  Switch,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { ArrowRightFromSquare, Bell, Gear, Key, Person, ShieldCheck } from '@gravity-ui/icons';
import type { IconData } from '@gravity-ui/uikit';
import { useAuth } from '@/shared/auth';
import { config } from '@/shared/config';
import { useAppTheme } from '@/app/theme';
import { LoadingState } from '@/shared/ui/states';

const LOCALE_KEY = 'onemore.locale';
const NOTIFY_INVITES_KEY = 'onemore.notify.invites';
const NOTIFY_IMPORTS_KEY = 'onemore.notify.imports';

type Locale = 'ru' | 'en';

function readLocale(): Locale {
  return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'ru';
}

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
  const { user, isLoading } = useAuth();

  return (
    <ProfileCard icon={Person} title="Личные данные">
      {isLoading && <LoadingState />}
      {!isLoading && !user && (
        <Text variant="body-2" color="secondary">
          Не удалось загрузить данные пользователя. Имя и почта появятся, если служба входа отдаёт
          их в профиле.
        </Text>
      )}
      {user && (
        <Flex direction="column" gap={3} style={{ maxWidth: 420 }}>
          <Field label="Имя">
            <TextInput value={user.name || '—'} readOnly />
          </Field>
          <Field label="Электронная почта">
            <TextInput value={user.email || '—'} readOnly />
          </Field>
          <Field label="Идентификатор">
            <TextInput value={user.id} readOnly />
          </Field>
        </Flex>
      )}
    </ProfileCard>
  );
}

function SecurityCard() {
  const { signOut } = useAuth();
  const toaster = useToaster();

  const openPasswordSettings = () => {
    if (config.authMode === 'logto' && config.logto) {
      window.open(config.logto.endpoint, '_blank', 'noopener,noreferrer');
      return;
    }
    toaster.add({
      name: 'profile-password',
      title: 'Недоступно в offline-режиме',
      content: 'Смена пароля доступна при входе через службу идентификации.',
      theme: 'info',
    });
  };

  return (
    <ProfileCard icon={ShieldCheck} title="Безопасность">
      <Flex direction="column" gap={3} style={{ maxWidth: 520 }}>
        <Text variant="body-2" color="secondary">
          Пароль и сессии управляются службой входа. Здесь можно открыть её настройки или выйти из
          приложения.
        </Text>
        <Flex gap={2} wrap>
          <Button view="outlined" onClick={openPasswordSettings}>
            <Icon data={Key} size={16} />
            Управление паролем
          </Button>
          <Button view="outlined-danger" onClick={() => void signOut()}>
            <Icon data={ArrowRightFromSquare} size={16} />
            Выйти
          </Button>
        </Flex>
      </Flex>
    </ProfileCard>
  );
}

function PreferencesCard() {
  const { theme, setTheme } = useAppTheme();
  const [locale, setLocale] = useState<Locale>(readLocale);

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  return (
    <ProfileCard icon={Gear} title="Предпочтения">
      <Flex direction="column" gap={3} style={{ maxWidth: 420 }}>
        <Field label="Тема оформления">
          <Select
            width="max"
            value={[theme]}
            onUpdate={(value) => {
              const next = value[0];
              if (next === 'light' || next === 'dark') setTheme(next);
            }}
            options={[
              { value: 'light', content: 'Светлая' },
              { value: 'dark', content: 'Тёмная' },
            ]}
          />
        </Field>
        <Field label="Язык интерфейса">
          <Select
            width="max"
            value={[locale]}
            onUpdate={(value) => {
              const next = value[0];
              if (next === 'ru' || next === 'en') setLocale(next);
            }}
            options={[
              { value: 'ru', content: 'Русский' },
              { value: 'en', content: 'English (скоро)' },
            ]}
          />
          <Text variant="caption-2" color="secondary">
            Пока интерфейс всегда на русском — выбор сохраняется для будущей локализации.
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

  return (
    <ProfileCard icon={Bell} title="Уведомления">
      <Flex direction="column" gap={3} style={{ maxWidth: 520 }}>
        <Text variant="body-2" color="secondary">
          Настройки сохраняются в этом браузере. Доставка писем появится вместе с бэкендом
          уведомлений.
        </Text>
        <Switch checked={invites} onUpdate={setInvites}>
          Приглашения в организацию
        </Switch>
        <Switch checked={imports} onUpdate={setImports}>
          Результат импорта сборников ТТК
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
