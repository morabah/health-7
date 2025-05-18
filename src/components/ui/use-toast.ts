import * as React from 'react';
import { X } from 'lucide-react';

// Utility to merge class names
function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export interface ToastActionElement {
  altText?: string;
  action: React.ReactNode;
}

const variantClasses: Record<ToastVariant, string> = {
  default: 'bg-background text-foreground border',
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
};

const ToastTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  ...props 
}) => (
  React.createElement("div", {
    className: cn("text-sm font-semibold", className),
    ...props
  })
);

const ToastDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  className, 
  ...props 
}) => (
  React.createElement("div", {
    className: cn("text-sm opacity-90", className),
    ...props
  })
);

const ToastClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ 
  className, 
  ...props 
}) => (
  React.createElement("button", {
    className: cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
      className
    ),
    ...props
  }, React.createElement(X, { className: "h-4 w-4" }))
);

const ToastAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ 
  className, 
  ...props 
}) => (
  React.createElement("button", {
    className: cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    ),
    ...props
  })
);

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      className,
      variant = 'default',
      onOpenChange,
      duration = 5000,
      title,
      description,
      children,
      ...props
    },
    ref
  ) => {
    return (
      React.createElement("div", {
        ref,
        role: "alert",
        "aria-live": "assertive",
        "aria-atomic": "true",
        className: cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all",
          variantClasses[variant],
          className
        ),
        ...props
      }, children)
    );
  }
);

Toast.displayName = "Toast";

type ToastPropsWithId = ToastProps & { id: string };

type ToastContextValue = {
  toasts: ToastPropsWithId[];
  addToast: (props: ToastProps) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, props: ToastProps) => void;
  toast: (props: ToastProps) => string;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: React.ReactNode;
  duration?: number;
}

export function ToastProvider({ children, duration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastPropsWithId[]>([]);

  const addToast = React.useCallback(
    (props: ToastProps) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prevToasts) => [...prevToasts, { id, ...props }]);

      return id;
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const updateToast = React.useCallback((id: string, props: ToastProps) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, ...props } : toast
      )
    );
  }, []);

  const contextValue = React.useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      updateToast,
      toast: addToast, // Alias for addToast for compatibility
    }),
    [toasts, addToast, removeToast, updateToast]
  );

  return (
    React.createElement(ToastContext.Provider, { value: contextValue },
      children,
      React.createElement("div", { className: "fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" },
        toasts.map((toast) => (
          React.createElement(Toast, {
            key: toast.id,
            ...toast,
            onOpenChange: (open: boolean) => {
              if (!open) removeToast(toast.id);
              if (toast.onOpenChange) toast.onOpenChange(open);
            },
            duration: toast.duration || duration
          },
            React.createElement("div", { className: "flex-1" },
              toast.title && React.createElement(ToastTitle, null, toast.title),
              toast.description && React.createElement(ToastDescription, null, toast.description),
              toast.children
            ),
            React.createElement(ToastClose, { onClick: () => {
              if (toast.onOpenChange) toast.onOpenChange(false);
            }})
          )
        ))
      )
    )
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return {
    toast: context.toast,
    dismiss: context.removeToast,
    update: context.updateToast,
    toasts: context.toasts,
  };
}
