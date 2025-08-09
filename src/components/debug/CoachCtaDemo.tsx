import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCoachCta } from '@/hooks/useCoachCta';
import { MessageSquare, CheckCircle, AlertTriangle, Droplets, Utensils, Target } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

/**
 * Demo component to test Coach CTA functionality
 * Shows how AI coach can inject dynamic messages into the ticker
 */
export const CoachCtaDemo = () => {
  const { sendCoachMessage, getQueueInfo, clearCurrentMessage } = useCoachCta();
  const queueInfo = getQueueInfo();
  const { playAIThought } = useSound();

  const handleCtaClick = (ctaType: string, ctaText: string) => {
    console.debug(`[CoachCtaDemo Click] Type: ${ctaType}, Text: "${ctaText}", Timestamp: ${new Date().toISOString()}`);
    // Play AI thought beep immediately on user click
    void playAIThought();
    sendCoachMessage(ctaText);
  };

  const demoMessages = [
    {
      icon: CheckCircle,
      label: "Healthy Choice",
      message: "✅ Great choice on that quinoa bowl! Keep it up!",
      color: "text-green-600"
    },
    {
      icon: AlertTriangle,
      label: "Slip-up Support",
      message: "⚠️ Don't worry about the slip-up. Let's do better at dinner.",
      color: "text-yellow-600"
    },
    {
      icon: Droplets,
      label: "Hydration Reminder",
      message: "💧 You're behind on water today. Let's grab a glass now.",
      color: "text-blue-600"
    },
    {
      icon: Utensils,
      label: "Meal Suggestion",
      message: "🍎 How about a healthy snack? An apple with peanut butter sounds good!",
      color: "text-orange-600"
    },
    {
      icon: Target,
      label: "Goal Progress",
      message: "🎯 You're 80% to your protein goal today! One more serving should do it.",
      color: "text-purple-600"
    }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Coach CTA Demo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test the dynamic CTA injection system. Messages will appear in the home page ticker.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Status */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-1">Queue Status:</div>
          <div className="text-xs text-muted-foreground">
            Active Message: {queueInfo.currentMessage || 'None'}
          </div>
          <div className="text-xs text-muted-foreground">
            Queued Messages: {queueInfo.queueLength}
          </div>
        </div>

        {/* Demo Buttons */}
        <div className="grid grid-cols-1 gap-2">
          {demoMessages.map((demo, index) => (
            <Button
              key={index}
              variant="outline"
              className="justify-start h-auto p-3"
              onClick={() => handleCtaClick(demo.label, demo.message)}
            >
              <demo.icon className={`h-4 w-4 mr-2 ${demo.color}`} />
              <div className="text-left">
                <div className="font-medium text-sm">{demo.label}</div>
                <div className="text-xs text-muted-foreground">
                  {demo.message}
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              console.debug('[CoachCtaDemo] Click', { type: 'Clear Current', text: queueInfo.currentMessage, timestamp: new Date().toISOString() });
              clearCurrentMessage();
            }}
            disabled={!queueInfo.hasActiveMessage}
          >
            Clear Current
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const ts = new Date().toISOString();
              console.debug('[CoachCtaDemo] Click', { type: 'Test Queue', text: '🚀 Multiple message test 1', timestamp: ts });
              sendCoachMessage('🚀 Multiple message test 1');
              console.debug('[CoachCtaDemo] Click', { type: 'Test Queue', text: '🎉 Multiple message test 2', timestamp: ts });
              sendCoachMessage('🎉 Multiple message test 2');
              console.debug('[CoachCtaDemo] Click', { type: 'Test Queue', text: '💪 Multiple message test 3', timestamp: ts });
              sendCoachMessage('💪 Multiple message test 3');
            }}
          >
            Test Queue (3 messages)
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950 rounded">
          <strong>Instructions:</strong> Click any button above to inject a CTA message. 
          Go to the Home page to see it appear in the ticker. Messages have highest priority 
          and will override seasonal/holiday CTAs. Multiple messages are queued and rotate automatically.
        </div>
      </CardContent>
    </Card>
  );
};