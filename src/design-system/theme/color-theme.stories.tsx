import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ColorThemeProvider, useColorTheme } from './color-theme';

const meta = {
  component: ColorThemeProvider,
  tags: ['autodocs'],
  args: {
    children: <div />,
  },
} satisfies Meta<typeof ColorThemeProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 *
 */
function ThemeSwitcher() {
  const { colorTheme, setColorTheme, options } = useColorTheme();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase">
          Active theme
        </p>
        <p className="text-sm font-medium">{colorTheme}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setColorTheme(option.id);
            }}
            className={[
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              colorTheme === option.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-secondary',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {options.map((option) => (
          <div key={option.id} className="rounded-md border p-3">
            <p className="text-sm font-medium">{option.label}</p>
            <p className="text-muted-foreground mt-1 text-xs">{option.description}</p>
            {option.source ? (
              <p className="text-muted-foreground/60 mt-1 text-xs">Source: {option.source}</p>
            ) : undefined}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Default: Story = {
  name: 'Theme switcher',
  render: () => (
    <ColorThemeProvider>
      <ThemeSwitcher />
    </ColorThemeProvider>
  ),
};

/**
 *
 */
function ThemeTokens() {
  const { colorTheme } = useColorTheme();
  const swatches = [
    { label: 'background', className: 'bg-background border' },
    { label: 'foreground', className: 'bg-foreground' },
    { label: 'primary', className: 'bg-primary' },
    { label: 'primary-foreground', className: 'bg-primary-foreground border' },
    { label: 'secondary', className: 'bg-secondary' },
    { label: 'muted', className: 'bg-muted' },
    { label: 'accent', className: 'bg-accent' },
    { label: 'card', className: 'bg-card border' },
    { label: 'destructive', className: 'bg-destructive' },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-muted-foreground text-xs">
        Active: <strong>{colorTheme}</strong>
      </p>
      <div className="flex flex-wrap gap-3">
        {swatches.map(({ label, className }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className={`h-10 w-10 rounded-md ${className}`} />
            <span className="text-muted-foreground text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 *
 */
function TokensDemo() {
  const { setColorTheme, options, colorTheme } = useColorTheme();
  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b p-4">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setColorTheme(option.id);
            }}
            className={[
              'rounded border px-2 py-1 text-xs transition-colors',
              colorTheme === option.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-secondary',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
      <ThemeTokens />
    </div>
  );
}

export const ColorTokens: Story = {
  name: 'Color token swatches',
  render: () => (
    <ColorThemeProvider>
      <TokensDemo />
    </ColorThemeProvider>
  ),
};
