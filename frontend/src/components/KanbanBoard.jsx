import React, { useState } from 'react';
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { updateTask } from '../services/api';

const COLUMNS = [
  { id: 'Backlog',      title: 'Backlog',      color: '#3b82f6' },
  { id: 'In Progress',  title: 'In Progress',  color: '#eab308' },
  { id: 'Review',       title: 'Review',       color: '#a855f7' },
  { id: 'Done',         title: 'Done',         color: '#22c55e' },
];

const COLUMN_IDS = new Set(COLUMNS.map(c => c.id));

// ─── Droppable column wrapper ────────────────────────────────────────────────
function DroppableColumn({ col, children, taskCount, isOver }) {
  const { setNodeRef } = useDroppable({ id: col.id });

  return (
    <div
      className="rounded-lg flex flex-col shadow-lg border border-gray-700 transition-colors duration-150 lg:max-h-screen lg:overflow-y-auto"
      style={{
        borderLeftColor: col.color,
        borderLeftWidth: 4,
        backgroundColor: isOver ? 'rgba(55,65,81,0.85)' : 'rgb(31,41,55)', // gray-700 tint vs gray-800
      }}
    >
      {/* Column header */}
      <div className="p-4 rounded-t-lg border-b border-gray-700 sticky top-0 z-10" style={{ backgroundColor: 'rgb(31,41,55)' }}>
        <h2 className="font-semibold text-lg">
          {col.title}{' '}
          <span className="text-gray-400 text-sm ml-2">({taskCount})</span>
        </h2>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className="flex-1 p-4 overflow-y-auto min-h-[200px]"
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main board ──────────────────────────────────────────────────────────────
const KanbanBoard = ({
  tasks,
  dependencies,
  onTaskUpdate,
  onTaskDelete,
  onDependencyAdd,
  onDependencyRemove,
  criticalPath,
  setTasks,
}) => {
  const [activeId,     setActiveId]     = useState(null);
  const [overId,       setOverId]       = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // ── sensors: 8px distance prevents accidental drags on button clicks ────
  const pointerSensor  = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
  const sensors        = useSensors(pointerSensor, keyboardSensor);

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Resolve which column an over.id belongs to (column id or card id). */
  const resolveTargetColumn = (id) => {
    if (COLUMN_IDS.has(id)) return id;
    const overTask = tasks.find(t => t.id === id);
    return overTask ? overTask.column_name : null;
  };

  const getTasksByColumn = (columnId) =>
    tasks.filter(t => t.column_name === columnId).sort((a, b) => a.position - b.position);

  // ── drag handlers ─────────────────────────────────────────────────────────

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  const handleDragOver = ({ over }) => {
    setOverId(over ? resolveTargetColumn(over.id) : null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const targetColumn = resolveTargetColumn(over.id);
    if (!targetColumn) return;

    // Nothing changed
    if (active.id === over.id && activeTask.column_name === targetColumn) return;

    // Optimistic update
    const previousTasks = tasks;
    if (setTasks) {
      setTasks(prev =>
        prev.map(t => t.id === activeTask.id ? { ...t, column_name: targetColumn } : t)
      );
    }

    try {
      await updateTask(activeTask.id, { column_name: targetColumn });
      if (onTaskUpdate) onTaskUpdate();
    } catch (err) {
      console.error('Failed to update task position', err);
      if (setTasks) setTasks(previousTasks);
      setToastMessage('Move failed, please try again');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Error toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 pointer-events-none">
          {toastMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        {COLUMNS.map(col => {
          const columnTasks = getTasksByColumn(col.id);
          return (
            <DroppableColumn
              key={col.id}
              col={col}
              taskCount={columnTasks.length}
              isOver={activeId !== null && overId === col.id}
            >
              <SortableContext
                items={columnTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      dependencies={dependencies}
                      onTaskUpdate={onTaskUpdate}
                      onTaskDelete={onTaskDelete}
                      onDependencyAdd={onDependencyAdd}
                      onDependencyRemove={onDependencyRemove}
                      isCritical={criticalPath.includes(task.id)}
                      allTasks={tasks}
                    />
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>

      {/* Floating drag overlay — lifted copy that follows the cursor */}
      <DragOverlay>
        {activeTask ? (
          <div
            style={{
              transform: 'scale(1.04)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
              opacity: 1,
              cursor: 'grabbing',
              borderRadius: 8,
            }}
          >
            <TaskCard
              task={activeTask}
              dependencies={dependencies}
              isCritical={criticalPath.includes(activeTask.id)}
              allTasks={tasks}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
