import { useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { HelpCircle } from 'lucide-react';
import { getModuleHelp } from './helpSteps';

interface AjudaButtonProps {
  moduleId: string;
}

export default function AjudaButton({ moduleId }: AjudaButtonProps) {
  const handleHelp = useCallback(() => {
    const help = getModuleHelp(moduleId);
    if (!help || help.steps.length === 0) return;

    const steps: DriveStep[] = help.steps
      .filter(s => !!document.querySelector(s.element))
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
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition text-[11px] font-semibold"
    >
      <HelpCircle size={14} />
      Ajuda!
    </button>
  );
}
