import React, { useState } from 'react';
import TaskModal from './TaskModal';

const CreateTaskButton = ({ onTaskCreate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg text-2xl flex items-center justify-center transition-transform hover:scale-110 z-50"
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
