'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications, useDirectMessage } from '@/data/sharedLoaders';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { MessageSquare, Send, User } from 'lucide-react';
import { logInfo } from '@/lib/logger';
import { NotificationType } from '@/types/enums';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types/schemas';

export default function MessagesPage() {
  const { user } = useAuth();
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get notifications with message type
  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications();
  
  // Direct message mutation
  const directMessageMutation = useDirectMessage();
  
  // Filter for message-type notifications
  const messageNotifications = notificationsData?.success 
    ? notificationsData.notifications.filter((n: Notification) => n.type === NotificationType.NEW_MESSAGE)
    : [];
  
  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!recipientId) {
      setError('Please enter a recipient ID');
      return;
    }
    
    if (!message) {
      setError('Please enter a message');
      return;
    }
    
    try {
      const result = await directMessageMutation.mutateAsync({
        recipientId,
        subject: subject || 'New Message',
        message
      });
      
      if (result.success) {
        logInfo('messages', { action: 'send-message', recipientId, userId: user?.uid });
        setSuccessMessage('Message sent successfully');
        setMessage('');
        setSubject('');
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (err) {
      setError('An error occurred while sending the message');
      console.error(err);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare /> Messages
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Send a Message</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="recipientId" className="block text-sm font-medium mb-1">
                Recipient ID
              </label>
              <Input
                id="recipientId"
                type="text"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder="Enter user ID of recipient"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the user ID of the person you want to message
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="subject" className="block text-sm font-medium mb-1">
                Subject
              </label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                required
              />
            </div>
            
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}
            
            {successMessage && (
              <Alert variant="success" className="mb-4">
                {successMessage}
              </Alert>
            )}
            
            <Button 
              type="submit" 
              disabled={directMessageMutation.isPending}
              className="w-full"
            >
              {directMessageMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Send Message
                </>
              )}
            </Button>
          </form>
        </Card>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Received Messages</h2>
          
          {notificationsLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          
          {!notificationsLoading && messageNotifications.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-gray-500">You have no messages</p>
            </Card>
          )}
          
          {messageNotifications.length > 0 && (
            <div className="space-y-4">
              {messageNotifications.map((notification: Notification) => (
                <Card key={notification.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <div className="text-sm text-gray-500">
                          {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 my-1">{notification.message}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 