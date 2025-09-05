import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface Step {
  key: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProcessingStepperProps {
  steps: Step[];
  className?: string;
}

export const ProcessingStepper: React.FC<ProcessingStepperProps> = ({
  steps,
  className = ""
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => (
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3"
        >
          <div className="flex-shrink-0">
            {step.status === 'completed' && (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            )}
            {step.status === 'active' && (
              <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
            )}
            {step.status === 'pending' && (
              <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
            )}
          </div>
          
          <div className="flex-1">
            <div className={`text-sm font-medium transition-colors duration-200 ${
              step.status === 'completed' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : step.status === 'active'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {step.label}
              {step.status === 'active' && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="ml-1"
                >
                  ...
                </motion.span>
              )}
            </div>
            
            {step.status === 'active' && (
              <motion.div 
                className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </motion.div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};