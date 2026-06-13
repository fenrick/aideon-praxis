import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from './index';

const meta = {
  component: KanbanProvider,
  tags: ['autodocs'],
  title: 'Kibo UI/Kanban',
} satisfies Meta<typeof KanbanProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const initialColumns = [
  { id: 'todo', name: 'To Do' },
  { id: 'in-progress', name: 'In Progress' },
  { id: 'done', name: 'Done' },
];

const initialData = [
  { id: 'task-1', name: 'Design wireframes', column: 'todo' },
  { id: 'task-2', name: 'Set up project scaffolding', column: 'todo' },
  { id: 'task-3', name: 'Implement authentication', column: 'in-progress' },
  { id: 'task-4', name: 'Write unit tests', column: 'in-progress' },
  { id: 'task-5', name: 'Deploy to staging', column: 'done' },
  { id: 'task-6', name: 'Code review', column: 'done' },
];

const KanbanDemo = () => {
  const [data, setData] = useState(initialData);

  return (
    <div style={{ height: 500 }}>
      <KanbanProvider
        columns={initialColumns}
        data={data}
        onDataChange={setData}
      >
        {(column) => (
          <KanbanBoard id={column.id} key={column.id}>
            <KanbanHeader>{column.name}</KanbanHeader>
            <KanbanCards id={column.id}>
              {(item) => (
                <KanbanCard column={item.column} id={item.id} key={item.id} name={item.name} />
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  );
};

export const Default: Story = {
  render: () => <KanbanDemo />,
};

const richColumns = [
  { id: 'backlog', name: 'Backlog' },
  { id: 'todo', name: 'To Do' },
  { id: 'in-progress', name: 'In Progress' },
  { id: 'review', name: 'Review' },
  { id: 'done', name: 'Done' },
];

const richData = [
  { id: 'i1', name: 'Research competitors', column: 'backlog', priority: 'low' },
  { id: 'i2', name: 'Create user personas', column: 'backlog', priority: 'medium' },
  { id: 'i3', name: 'Define MVP scope', column: 'todo', priority: 'high' },
  { id: 'i4', name: 'Design system setup', column: 'todo', priority: 'high' },
  { id: 'i5', name: 'API endpoints', column: 'in-progress', priority: 'high' },
  { id: 'i6', name: 'Onboarding flow', column: 'in-progress', priority: 'medium' },
  { id: 'i7', name: 'Performance audit', column: 'review', priority: 'low' },
  { id: 'i8', name: 'Landing page', column: 'done', priority: 'medium' },
];

const priorityColors: Record<string, string> = {
  low: 'text-sky-500',
  medium: 'text-amber-500',
  high: 'text-rose-500',
};

const RichKanbanDemo = () => {
  const [data, setData] = useState(richData);

  return (
    <div style={{ height: 500 }}>
      <KanbanProvider columns={richColumns} data={data} onDataChange={setData}>
        {(column) => (
          <KanbanBoard id={column.id} key={column.id}>
            <KanbanHeader>
              <span>{column.name}</span>
              <span className="text-muted-foreground text-xs font-normal ml-1">
                ({data.filter((d) => d.column === column.id).length})
              </span>
            </KanbanHeader>
            <KanbanCards id={column.id}>
              {(item) => (
                <KanbanCard column={item.column} id={item.id} key={item.id} name={item.name}>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <span className={`text-xs ${priorityColors[item.priority] ?? ''}`}>
                      {item.priority}
                    </span>
                  </div>
                </KanbanCard>
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  );
};

export const MultiColumn: Story = {
  render: () => <RichKanbanDemo />,
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: 300 }}>
      <KanbanProvider columns={initialColumns} data={[]}>
        {(column) => (
          <KanbanBoard id={column.id} key={column.id}>
            <KanbanHeader>{column.name}</KanbanHeader>
            <KanbanCards id={column.id}>
              {(item) => (
                <KanbanCard column={item.column} id={item.id} key={item.id} name={item.name} />
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  ),
};
