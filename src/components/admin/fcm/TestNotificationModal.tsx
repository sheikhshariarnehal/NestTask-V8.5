import { useState } from 'react';
import { X, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { TestNotificationPayload } from '../../../types/fcm';

interface TestNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: TestNotificationPayload) => Promise<{ success: boolean; message: string }>;
  userName?: string;
  userId?: string;
}

export function TestNotificationModal({ 
  isOpen, 
  onClose, 
  onSend, 
  userName,
  userId 
}: TestNotificationModalProps) {
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from FCM Manager');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setResult({ success: false, message: 'Title and body are required' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const payload: TestNotificationPayload = {
        title: title.trim(),
        body: body.trim(),
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
        userIds: userId ? [userId] : undefined,
      };

      const response = await onSend(payload);
      setResult(response);

      if (response.success) {
        // Auto-close after 2 seconds on success
        setTimeout(() => {
          onClose();
          setTitle('Test Notification');
          setBody('This is a test notification from FCM Manager');
          setResult(null);
        }, 2000);
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Failed to send notification' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
      setResult(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send Test Notification
              </h3>
              {userName && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  To: {userName}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={sending}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notification Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={sending}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50"
                placeholder="Enter notification title"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {title.length}/100 characters
              </p>
            </div>

            {/* Body Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notification Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sending}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none disabled:opacity-50"
                placeholder="Enter notification message"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {body.length}/200 characters
              </p>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
              <div className="space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{title || 'Title'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{body || 'Message body'}</p>
              </div>
            </div>

            {/* Result Message */}
            {result && (
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                result.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <p className={`text-sm ${
                  result.success 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {result.message}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
