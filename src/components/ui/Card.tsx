import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Card component props
 * @interface CardProps
 * @property {React.ReactNode} children - The content of the card
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [hoverable] - Whether the card should have hover effects
 * @property {string} [variant] - Card style variant
 * @property {boolean} [bordered] - Whether the card should have a border
 * @property {boolean} [compact] - Whether the card should have reduced padding
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  variant?: 'default' | 'flat' | 'elevated' | 'outlined' | 'gradient' | 'neomorphic' | 'health';
  bordered?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

/**
 * CardHeader component props
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * CardFooter component props
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

// Define the compound component type
type CardComponent = React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> & {
  Header: React.ForwardRefExoticComponent<CardHeaderProps & React.RefAttributes<HTMLDivElement>>;
  Footer: React.ForwardRefExoticComponent<CardFooterProps & React.RefAttributes<HTMLDivElement>>;
};

/**
 * Card component for displaying content in a contained box with shadow
 * 
 * @example
 * <Card>
 *   <Card.Header>
 *     <h3>Card Title</h3>
 *   </Card.Header>
 *   <p>Card content</p>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 * 
 * @example
 * <Card hoverable variant="elevated">
 *   <h3>Interactive Card</h3>
 *   <p>This card has hover effects</p>
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, hoverable = false, variant = 'default', bordered = false, compact = false, onClick, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white dark:bg-slate-800 shadow-sm',
      flat: 'bg-white dark:bg-slate-800',
      elevated: 'bg-white dark:bg-slate-800 shadow-md',
      outlined: 'bg-white dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700',
      gradient: 'bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-sm',
      neomorphic: 'bg-slate-100 dark:bg-slate-800 shadow-[8px_8px_16px_0px_rgba(0,0,0,0.1),-8px_-8px_16px_0px_rgba(255,255,255,0.8)] dark:shadow-[8px_8px_16px_0px_rgba(0,0,0,0.3),-8px_-8px_16px_0px_rgba(30,41,59,0.5)]',
      health: 'bg-white dark:bg-slate-800 border-t-4 border-t-primary dark:border-t-primary/80 shadow-lg rounded-lg overflow-hidden transition-all duration-200'
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'rounded-lg overflow-hidden',
            variantStyles[variant],
            bordered && 'border border-slate-200 dark:border-slate-700',
            hoverable && 'transition duration-200 hover:shadow-lg hover:-translate-y-0.5',
            !compact && 'divide-y divide-slate-200 dark:divide-slate-700',
            className
          )
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'px-5 py-4 flex items-center justify-between',
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'px-5 py-4 bg-slate-50 dark:bg-slate-800/50',
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';
CardFooter.displayName = 'CardFooter';
Card.displayName = 'Card';

// Add Header and Footer as compound components
(Card as CardComponent).Header = CardHeader;
(Card as CardComponent).Footer = CardFooter;

export type { CardProps, CardHeaderProps, CardFooterProps };
export default Card as CardComponent; 