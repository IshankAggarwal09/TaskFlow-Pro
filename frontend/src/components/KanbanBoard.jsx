import React, { useState } from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { updateTask } from '../services/api';

const COLUMNS = [
  { id: 'Backlog', title: 'Backlog' },
  { id: 'In Progress', title: 'In Progress' },
  { id: 'Review', title: 'Review' },
  { id: 'Done', title: 'Done' }
];

const KanbanBoard = ({ tasks, dependencies, onTaskUpdate, onTaskDelete, onDependencyAdd, onDependencyRemove, criticalPath }) => {
  const [activeId, setActiveId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    
    if (!activeTask) return;
    
    const activeColumn = activeTask.column_name;
    const overColumn = overTask ? overTask.column_name : COLUMNS.find(c => c.id === over.id)?.id;
    
    if (!overColumn) return;

    let newPosition = activeTask.position;
    if (overTask && overTask.id !== activeTask.id) {
      newPosition = overTask.position;
    } else if (activeColumn !== overColumn) {
      newPosition = 1;
    }

    if (activeColumn !== overColumn || (overTask && activeTask.id !== overTask.id)) {
      try {
        await updateTask(activeTask.id, { column_name: overColumn, position: newPosition });
        if (onTaskUpdate) onTaskUpdate();
      } catch (err) {
        console.error('Failed to update task position', err);
        setToastMessage('Move failed, please try again');
        setTimeout(() => setToastMessage(''), 3000);
      }
    }
  };

  const getTasksByColumn = (columnId) => {
    return tasks.filter(t => t.column_name === columnId).sort((a, b) => a.position - b.position);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {toastMessage}
        </div>
      )}
      <div className="flex gap-6 h-full overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const columnTasks = getTasksByColumn(col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-80 bg-gray-800 rounded-lg flex flex-col shadow-lg border-l-4 border-t border-b border-r border-gray-700" style={{ borderLeftColor: col.id === 'Backlog' ? '#3b82f6' : col.id === 'In Progress' ? '#eab308' : col.id === 'Review' ? '#a855f7' : '#22c55e' }}>
              <div className="p-4 bg-gray-800 rounded-t-lg border-b border-gray-700 sticky top-0 z-10">
                <h2 className="font-semibold text-lg">{col.title} <span className="text-gray-400 text-sm ml-2">({columnTasks.length})</span></h2>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto min-h-[200px]" id={col.id}>
                <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
              </div>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80 scale-105 rotate-2">
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
