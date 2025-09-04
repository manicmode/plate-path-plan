import { NudgeQARunner } from '@/components/NudgeQARunner';
import { QAAccessGate } from '@/components/qa/QAAccessGate';

export default function NudgeQAPage() {
  return (
    <QAAccessGate>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Nudge System QA</h1>
          <p className="text-muted-foreground mb-8">
            Validate nudge system fixes and behavior
          </p>
          <NudgeQARunner />
        </div>
      </div>
    </QAAccessGate>
  );
}