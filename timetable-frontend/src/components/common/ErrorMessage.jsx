import React from 'react';

const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex justify-between items-center">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-red-600 hover:text-red-800">
          ✕
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;