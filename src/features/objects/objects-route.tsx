import { useMemo, useState } from 'react';
import { Button, Card, Flex, Icon, Select, Table, Text } from '@gravity-ui/uikit';
import { House, Layers, Pencil, Plus } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useCateringObjects } from './api';
import { ObjectDrawer, SubObjectsDrawer } from './objects-dialog';
import { type CateringObject, type SubObject } from './types';
import './objects-route.css';

function groupRowClassNames(row: {
  isLastInDepartment: boolean;
  showDepartment: boolean;
  isLastInSubObject: boolean;
}): string[] {
  const classes: string[] = ['objects-group-row_no-divider'];
  // Первая строка отделения — больше отступ сверху.
  if (row.showDepartment) classes.push('objects-group-row_department-start');
  if (row.isLastInDepartment) {
    classes.push('objects-group-row_divider');
    // Между отделениями линия начинается от «Группа / класс»; между
    // подобъектами — на всю ширину (без модификатора «отделение»).
    if (!row.isLastInSubObject) classes.push('objects-group-row_department-divider');
  }
  return classes;
}

/**
 * «Объекты»: справочник объект → подобъект → отделения → столы.
 * Численность на дату — в «Порционнике».
 * У объекта своё меню; у подобъекта — меню объекта либо собственное.
 */
export function ObjectsRoute() {
  const { current } = useOrganizations();
  const objects = useCateringObjects();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  if (objects.isPending) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <LoadingState />
      </Flex>
    );
  }

  if (objects.isError || !objects.data) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      </Flex>
    );
  }

  const objectList = objects.data.objects;
  const activeObjectId =
    selectedObjectId && objectList.some((o) => o.id === selectedObjectId)
      ? selectedObjectId
      : (objectList[0]?.id ?? null);
  const subObjects = activeObjectId
    ? (objectList.find((o) => o.id === activeObjectId)?.subObjects ?? [])
    : objectList.flatMap((o) => o.subObjects);

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <SubObjectsCard
        objects={objectList}
        subObjects={subObjects}
        selectedObjectId={activeObjectId}
        onSelectObject={setSelectedObjectId}
      />
    </Flex>
  );
}

function SubObjectsCard({
  objects,
  subObjects,
  selectedObjectId,
  onSelectObject,
}: {
  objects: CateringObject[];
  subObjects: SubObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingSubObjects, setEditingSubObjects] = useState(false);

  const selectedObject = objects.find((o) => o.id === selectedObjectId) ?? objects[0] ?? null;

  /** Строки первой таблицы: группы/классы самого объекта. */
  const objectRows = useMemo(() => {
    const result: Array<{
      id: string;
      departmentId: string;
      departmentName: string;
      tableName: string;
      showDepartment: boolean;
      isLastInDepartment: boolean;
    }> = [];
    for (const department of selectedObject?.departments ?? []) {
      for (const table of department.tables) {
        const prevRow = result[result.length - 1];
        const showDepartment = !prevRow || prevRow.departmentId !== department.id;
        result.push({
          id: table.id,
          departmentId: department.id,
          departmentName: department.name,
          tableName: table.name,
          showDepartment,
          isLastInDepartment: false,
        });
      }
    }
    for (let i = result.length - 1; i >= 0; i--) {
      result[i].isLastInDepartment =
        !result[i + 1] || result[i + 1].departmentId !== result[i].departmentId;
    }
    return result;
  }, [selectedObject]);

  /** Строки второй таблицы: группы/классы подобъектов. */
  const subObjectRows = useMemo(() => {
    const result: Array<{
      id: string;
      subObjectId: string;
      subObjectName: string;
      departmentId: string;
      departmentName: string;
      tableName: string;
      showSubObject: boolean;
      showDepartment: boolean;
      isLastInDepartment: boolean;
      isLastInSubObject: boolean;
      nextShowDepartment: boolean;
      nextShowSubObject: boolean;
    }> = [];
    for (const subObject of subObjects) {
      for (const department of subObject.departments) {
        for (const table of department.tables) {
          const prevRow = result[result.length - 1];
          const showSubObject = !prevRow || prevRow.subObjectId !== subObject.id;
          const showDepartment =
            showSubObject || !prevRow || prevRow.departmentId !== department.id;
          result.push({
            id: table.id,
            subObjectId: subObject.id,
            subObjectName: subObject.name,
            departmentId: department.id,
            departmentName: department.name,
            tableName: table.name,
            showSubObject,
            showDepartment,
            isLastInDepartment: false,
            isLastInSubObject: false,
            nextShowDepartment: false,
            nextShowSubObject: false,
          });
        }
      }
    }
    // Mark last rows and propagate next-flags.
    for (let i = result.length - 1; i >= 0; i--) {
      const row = result[i];
      const next = result[i + 1];
      row.isLastInDepartment = !next || next.departmentId !== row.departmentId;
      row.isLastInSubObject = !next || next.subObjectId !== row.subObjectId;
      row.nextShowDepartment = next?.showDepartment ?? false;
      row.nextShowSubObject = next?.showSubObject ?? false;
    }
    return result;
  }, [subObjects]);

  return (
    <>
      <Flex alignItems="center" justifyContent="space-between" gap={2}>
        {objects.length > 0 && (
          <Select
            size="l"
            width={360}
            label="Объект:"
            value={selectedObjectId ? [selectedObjectId] : []}
            onUpdate={(value) => onSelectObject(value[0] ?? null)}
            placeholder="Все объекты"
            options={objects.map((obj) => ({
              value: obj.id,
              content: obj.name,
            }))}
          />
        )}
        <Button view="normal-contrast" size="l" onClick={() => setCreating(true)}>
          <Icon data={Plus} size={16} />
          Добавить объект
        </Button>
      </Flex>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={House} size={16} />
            <Text variant="subheader-2">{selectedObject ? selectedObject.name : 'Объект'}</Text>
          </Flex>
          {objects.length > 0 && (
            <Button
              view="normal"
              size="m"
              disabled={selectedObject === null}
              onClick={() => setEditing(true)}
            >
              <Icon data={Pencil} size={16} />
              Редактировать
            </Button>
          )}
        </Flex>

        <div
          style={{
            borderTop: '1px solid var(--g-color-line-generic)',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          {objectRows.length === 0 ? (
            <EmptyState text="У объекта пока нет групп/классов" />
          ) : (
            <div className="admin-table-wrap">
              <Table
                width="max"
                className="admin-table objects-group-table objects-facility-tables"
                data={objectRows}
                getRowClassNames={(row) =>
                  groupRowClassNames({
                    isLastInDepartment: row.isLastInDepartment,
                    showDepartment: row.showDepartment,
                    // У таблицы групп самого объекта колонка «Группа / класс»
                    // стоит первой, поэтому разделители на всю ширину.
                    isLastInSubObject: true,
                  })
                }
                columns={[
                  {
                    id: 'departmentName',
                    name: 'Группа / класс',
                    width: '60%',
                    template: (row) => (row.showDepartment ? row.departmentName : null),
                    placeholder: () => null,
                  },
                  {
                    id: 'tableName',
                    name: 'Рацион',
                    width: '40%',
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Card>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--g-color-line-generic)' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={Layers} size={16} />
            <Text variant="subheader-2">
              Подобъекты{selectedObject ? ` объекта «${selectedObject.name}»` : ''}
            </Text>
          </Flex>
          <Button
            view="normal"
            size="m"
            disabled={selectedObject === null || subObjects.length === 0}
            onClick={() => setEditingSubObjects(true)}
          >
            <Icon data={Pencil} size={16} />
            Редактировать подобъекты
          </Button>
        </Flex>

        <div
          style={{
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          {subObjects.length === 0 ? (
            <EmptyState text="Подобъекты пока не добавлены" />
          ) : subObjectRows.length === 0 ? (
            <EmptyState text="В подобъектах нет групп/классов" />
          ) : (
            <div className="admin-table-wrap">
              <Table
                width="max"
                className="admin-table objects-group-table objects-facility-tables objects-subobjects-table"
                data={subObjectRows}
                getRowClassNames={(row) =>
                  groupRowClassNames({
                    isLastInDepartment: row.isLastInDepartment,
                    showDepartment: row.showDepartment,
                    isLastInSubObject: row.isLastInSubObject,
                  })
                }
                columns={[
                  {
                    id: 'subObjectName',
                    name: 'Подобъект',
                    width: '34%',
                    template: (row) => (row.showSubObject ? row.subObjectName : null),
                    placeholder: () => null,
                  },
                  {
                    id: 'departmentName',
                    name: 'Группа / класс',
                    width: '33%',
                    template: (row) => (row.showDepartment ? row.departmentName : null),
                    placeholder: () => null,
                  },
                  {
                    id: 'tableName',
                    name: 'Рацион',
                    width: '33%',
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Card>

      <ObjectDrawer
        object={editing ? selectedObject : null}
        mode={creating ? 'create' : 'edit'}
        onClose={() => {
          setEditing(false);
          setCreating(false);
        }}
      />
      <SubObjectsDrawer
        object={editingSubObjects ? selectedObject : null}
        onClose={() => setEditingSubObjects(false)}
      />
    </>
  );
}
