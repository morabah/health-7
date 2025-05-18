'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, ArrowLeft, HelpCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomizableErrorBoundary, { ErrorAction } from './CustomizableErrorBoundary';
import { appEventBus, LogLevel } from '@/lib/eventBus';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';

interface PaymentError extends Error {
  code?: string;
  details?: {
    transactionId?: string;
    appointmentId?: string;
    paymentMethod?: string;
    amount?: number;
    [key: string]: unknown;
  };
}

/**
 * BookingPaymentErrorBoundary - Error boundary for payment processing during booking
 * 
 * This component provides specialized error handling for payment processing
 * in the booking workflow, handling specific payment failure scenarios
 * with user-friendly error messages and guidance.
 * 
 * @example
 * <BookingPaymentErrorBoundary>
 *   <PaymentProcessor appointmentData={data} />
 * </BookingPaymentErrorBoundary>
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
export default function BookingPaymentErrorBoundary({ 
  children,
  componentName = 'BookingPaymentComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  // Create a component that will handle the dynamic error message and actions
  const DynamicPaymentErrorHandler: React.FC<{
    error: Error | null;
    resetErrorBoundary: () => void;
  }> = ({ error, resetErrorBoundary }) => {
    const router = useRouter();
    const [title, setTitle] = useState('Payment Processing Error');
    const [message, setMessage] = useState('We encountered an issue while processing your payment.');
    const [guidance, setGuidance] = useState('Please try again with a different payment method or contact support.');
    const [actions, setActions] = useState<ErrorAction[]>([]);
    const [additionalContext, setAdditionalContext] = useState<Record<string, unknown>>({});
    
    useEffect(() => {
      if (!error) return;
      
      // Cast to PaymentError to access code and details properties
      const paymentError = error as PaymentError;
      const errorCode = paymentError.code;
      const errorDetails = paymentError.details || {};
      
      // Determine error category based on error code
      const errorCategory: ErrorCategory = 
        errorCode?.includes('PAYMENT') ? 'api' : 'appointment';
      
      // Emit error event for centralized logging
      appEventBus.emit('log_event', {
        level: LogLevel.ERROR,
        message: `Payment processing error: ${error.message}`,
        data: {
          component: componentName || 'BookingPayment',
          errorCode,
          errorDetails,
          stack: error.stack
        },
        timestamp: Date.now()
      });
      
      // Set additional context for error reporting
      setAdditionalContext({
        errorCode,
        transactionId: errorDetails.transactionId,
        appointmentId: errorDetails.appointmentId,
        paymentMethod: errorDetails.paymentMethod,
        amount: errorDetails.amount,
        workflow: 'payment'
      });
      
      // Get specific guidance based on error code
      let errorInfo = {
        title: 'Payment Processing Error',
        message: 'We encountered an issue while processing your payment.',
        guidance: 'Please try again with a different payment method or contact support.'
      };
      
      switch(errorCode) {
        case 'PAYMENT_DECLINED':
          errorInfo = {
            title: 'Payment Declined',
            message: 'Your payment was declined.',
            guidance: 'Please check your card details or try a different payment method.'
          };
          break;
        case 'PAYMENT_INSUFFICIENT_FUNDS':
          errorInfo = {
            title: 'Insufficient Funds',
            message: 'Your card has insufficient funds.',
            guidance: 'Please try a different payment method.'
          };
          break;
        case 'PAYMENT_CARD_EXPIRED':
          errorInfo = {
            title: 'Card Expired',
            message: 'Your card has expired.',
            guidance: 'Please update your card information or try a different payment method.'
          };
          break;
        case 'PAYMENT_PROCESSING_ERROR':
          errorInfo = {
            title: 'Processing Error',
            message: 'There was an error processing your payment.',
            guidance: 'Please try again in a few minutes.'
          };
          break;
        case 'PAYMENT_GATEWAY_ERROR':
          errorInfo = {
            title: 'Payment System Error',
            message: 'Our payment system is currently experiencing issues.',
            guidance: 'Please try again later or contact support.'
          };
          break;
        case 'PAYMENT_VALIDATION_ERROR':
          errorInfo = {
            title: 'Invalid Payment Information',
            message: 'Some of your payment information appears to be invalid.',
            guidance: 'Please check and try again.'
          };
          break;
        case 'PAYMENT_ALREADY_PROCESSED':
          errorInfo = {
            title: 'Payment Already Processed',
            message: 'This appointment has already been paid for.',
            guidance: 'Please check your email for confirmation.'
          };
          break;
        default:
          errorInfo = {
            title: 'Payment Issue',
            message: error.message || 'There was an issue with your payment.',
            guidance: 'Please try again or contact support for assistance.'
          };
      }
      
      setTitle(errorInfo.title);
      setMessage(`${errorInfo.message} ${errorInfo.guidance}`);
      setGuidance(errorInfo.guidance);
      
      // Set actions based on error
      const errorActions: ErrorAction[] = [
        {
          label: 'Try Again',
          icon: RefreshCw,
          onClick: resetErrorBoundary,
          variant: 'primary'
        },
        {
          label: 'Go Back',
          icon: ArrowLeft,
          onClick: () => router.back(),
          variant: 'outline'
        },
        {
          label: 'Payment Help',
          icon: HelpCircle,
          href: '/help/payment-issues',
          variant: 'ghost'
        }
      ];
      
      setActions(errorActions);
    }, [error, resetErrorBoundary, router, componentName]);
    
    // Create a custom message that includes transaction details if available
    const getCustomMessage = (): string => {
      if (!error) return message;
      
      const paymentError = error as PaymentError;
      if (!paymentError.details?.transactionId) return message;
      
      return `${message}\n\nTransaction ID: ${paymentError.details.transactionId}`;
    };
    
    return (
      <CustomizableErrorBoundary
        title={title}
        message={getCustomMessage()}
        icon={CreditCard}
        category="api"
        componentName={componentName}
        actions={actions}
        additionalContext={additionalContext}
      >
        {children}
      </CustomizableErrorBoundary>
    );
  };
  
  return <DynamicPaymentErrorHandler error={null} resetErrorBoundary={() => {}} />;
} 