import React, { useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { HelpCircle } from 'lucide-react';
import { getModuleHelp } from './helpSteps';

interface ContextualHelpProps {
  moduleId: string;
}

export default function ContextualHelp({ moduleId }: ContextualHelpProps) {
  const handleHelp = useCallback(() => {
    const help = getModuleHelp(moduleId);
    if (!help || help.steps.length === 0) return;

    const steps: DriveStep[] = help.steps
      .filter(s => document.querySelector(s.element))
      .map(s => ({
        element: s.element,
        popover: {
          title: s.popover.title,
          description: s.popover.description,
          side: s.popover.side || 'bottom' as const,
        },
      }));

    if (steps.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');

    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
      progressText: '{{current}} de {{total}}',
      popoverOffset: 8,
      stagePadding: 6,
      stageRadius: 8,
      steps,
    });

    d.drive();
  }, [moduleId]);

  return (
    <button
      onClick={handleHelp}
      title="Ajuda desta tela"
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition"
      data-help="ajuda"
    >
      <HelpCircle size={16} />
    </button>
  );
}
