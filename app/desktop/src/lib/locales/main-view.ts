export interface MainViewActivityCopy {
  summary: string;
  timelineCta: string;
  diffCta: string;
  canvasCta: string;
}

export interface MainViewTimelineEmptyCopy {
  title: string;
  description: string;
  styleGuideCta: string;
  scenarioCta: string;
}

export interface MainViewCopy {
  activity: MainViewActivityCopy;
  timeline: {
    empty: MainViewTimelineEmptyCopy;
  };
}

const en: MainViewCopy = {
  activity: {
    summary:
      'Explore the seeded timeline, compare the current snapshot, or inspect the canvas to understand what shipped with Praxis.',
    timelineCta: 'Open seeded timeline',
    diffCta: 'Review diff metrics',
    canvasCta: 'Inspect graph canvas',
  },
  timeline: {
    empty: {
      title: 'Start from the seeded snapshot',
      description:
        'Praxis seeds a baseline commit so you can explore the model before making changes. Review the canvas or spin up a scenario to branch safely.',
      styleGuideCta: 'Open Style Guide',
      scenarioCta: 'Plan a scenario',
    },
  },
};

export type SupportedLocale = 'en';

export function getMainViewCopy(_: SupportedLocale = 'en'): MainViewCopy {
  return en;
}
