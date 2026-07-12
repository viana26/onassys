import { useEffect, useState, useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { welcomeTourSteps } from './helpSteps';

const TOUR_COMPLETED_KEY = 'onassys_welcome_tour_completed';

export default function OnboardingTour() {
  const [hasRun, setHasRun] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!completed) {
      setHasRun(false);
    }
  }, []);

  const startTour = useCallback(() => {
    const availableSteps: DriveStep[] = welcomeTourSteps
      .filter(s => document.querySelector(s.element))
      .map(s => ({
        element: s.element,
        popover: {
          title: s.popover.title,
          description: s.popover.description,
          side: s.popover.side || 'bottom',
        },
      }));

    if (availableSteps.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');

    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
      progressText: '{{current}} de {{total}}',
      popoverOffset: 8,
      stagePadding: 6,
      stageRadius: 8,
      allowClose: true,
      onDestroyStarted: () => {
        d.destroy();
        localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
        setHasRun(true);
      },
      onHighlightStarted: () => {},
      steps: availableSteps,
    });

    d.drive();
  }, []);

  useEffect(() => {
    if (!hasRun) {
      const timer = setTimeout(startTour, 800);
      return () => clearTimeout(timer);
    }
  }, [hasRun, startTour]);

  return null;
}
