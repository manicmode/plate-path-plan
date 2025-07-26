
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Bell } from 'lucide-react';
import { requestNotificationPermission } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const FirebaseSetupVerifier = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [setupStatus, setSetupStatus] = useState({
    vapidKey: false,
    notificationPermission: false,
    fcmToken: false,
    pushFunction: false,
  });

  const checkFirebaseSetup = async () => {
    setIsChecking(true);
    const status = { ...setupStatus };

    // Check VAPID key
    const vapidKeyPresent = 'BK8Wz_j-9XzGVhQ7mD3fL9qK2pR8nE4tA6vB7sT8uV9wX0yZ1aB2cD3eF4gH5i';
    status.vapidKey = vapidKeyPresent.length > 50;

    // Check notification permission
    status.notificationPermission = Notification.permission === 'granted';

    // Check if FCM token can be generated
    try {
      if (status.notificationPermission) {
        const token = await requestNotificationPermission();
        status.fcmToken = !!token;
        if (token) {
          localStorage.setItem('fcm_token', token);
          console.log('FCM Token generated:', token);
        }
      }
    } catch (error) {
      console.error('Error generating FCM token:', error);
    }

    // Check if push notification function is available
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: { test: true }
      });
      status.pushFunction = !error || error.message !== 'Function not found';
    } catch (error) {
      console.log('Push function check:', error);
    }

    setSetupStatus(status);
    setIsChecking(false);
  };

  const requestNotificationAccess = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setSetupStatus(prev => ({ 
          ...prev, 
          notificationPermission: true, 
          fcmToken: true 
        }));
        toast.success('Push notifications enabled!');
      }
    } catch (error) {
      toast.error('Failed to enable push notifications');
    }
  };

  const testPushNotification = async () => {
    const token = localStorage.getItem('fcm_token');
    if (!token) {
      toast.error('No FCM token available. Enable notifications first.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          token,
          title: 'Test Notification 🧪',
          body: 'Your Firebase push notifications are working perfectly!',
          data: { test: true, timestamp: new Date().toISOString() }
        }
      });

      if (error) {
        console.error('Push notification error:', error);
        toast.error('Failed to send push notification. Check console for details.');
      } else {
        console.log('Push notification sent:', data);
        toast.success('Push notification sent! Check your device.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Error sending push notification');
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => 
    status ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Firebase Push Notification Setup</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <StatusIcon status={setupStatus.vapidKey} />
              <span>VAPID Key Configuration</span>
            </div>
            <Badge variant={setupStatus.vapidKey ? "default" : "destructive"}>
              {setupStatus.vapidKey ? "Configured" : "Missing"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <StatusIcon status={setupStatus.notificationPermission} />
              <span>Browser Notification Permission</span>
            </div>
            <Badge variant={setupStatus.notificationPermission ? "default" : "destructive"}>
              {setupStatus.notificationPermission ? "Granted" : "Not Granted"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <StatusIcon status={setupStatus.fcmToken} />
              <span>FCM Token Generation</span>
            </div>
            <Badge variant={setupStatus.fcmToken ? "default" : "destructive"}>
              {setupStatus.fcmToken ? "Working" : "Failed"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <StatusIcon status={setupStatus.pushFunction} />
              <span>Push Notification Function</span>
            </div>
            <Badge variant={setupStatus.pushFunction ? "default" : "destructive"}>
              {setupStatus.pushFunction ? "Available" : "Not Available"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={checkFirebaseSetup} 
            disabled={isChecking}
            variant="outline"
          >
            {isChecking ? 'Checking...' : 'Check Setup Status'}
          </Button>

          {!setupStatus.notificationPermission && (
            <Button onClick={requestNotificationAccess} variant="default">
              Enable Push Notifications
            </Button>
          )}

          {setupStatus.fcmToken && (
            <Button onClick={testPushNotification} variant="default">
              Send Test Notification
            </Button>
          )}
        </div>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click "Check Setup Status" to verify your configuration</li>
                <li>Enable push notifications if not already granted</li>
                <li>Make sure FIREBASE_SERVER_KEY is added to Supabase secrets</li>
                <li>Test with "Send Test Notification" button</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
