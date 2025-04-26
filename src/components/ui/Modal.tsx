import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

/**
 * Modal component props
 * @interface ModalProps
 * @property {boolean} isOpen - Whether the modal is visible
 * @property {() => void} onClose - Function to call when modal is closed
 * @property {string} [title] - Modal title
 * @property {React.ReactNode} children - Modal content
 * @property {string} [className] - Additional CSS classes
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Modal component for displaying content in a dialog overlay
 * 
 * @example
 * <Modal 
 *   isOpen={isModalOpen} 
 *   onClose={() => setIsModalOpen(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure you want to continue?</p>
 *   <div className="mt-4 flex justify-end gap-2">
 *     <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
 *     <Button onClick={handleConfirm}>Confirm</Button>
 *   </div>
 * </Modal>
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className
}) => {
  if (!isOpen) return null;
  
  // Handle Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  // Close modal when clicking outside content
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={twMerge(
          clsx(
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-auto',
            className
          )
        )}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          {title && (
            <h2 className="text-lg font-semibold">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 