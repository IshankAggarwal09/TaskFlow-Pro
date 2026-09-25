import React, { useState } from 'react';
import TaskModal from './TaskModal';

const CreateTaskButton = ({ onTaskCreate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center transition-transform hover:scale-110 z-40"
      >
        +
      </button>
      
      {isOpen && (
        <TaskModal 
          task={null}
          onClose={() => setIsOpen(false)}
          onSave={() => {
            setIsOpen(false);
            if (onTaskCreate) onTaskCreate();
          }}
        />
      )}
    </>
  );
};

export default CreateTaskButton;
