import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within, expect } from 'storybook/test';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form';
import { Input } from './input';
import { Button } from './button';

const meta = {
  component: Form,
  tags: ['autodocs'],
} satisfies Meta<typeof Form>;
export default meta;
type Story = StoryObj<typeof meta>;

function BasicForm() {
  const form = useForm<{ username: string }>({
    defaultValues: { username: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => { return; })} className="w-72 space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

export const Default: Story = {
  render: () => <BasicForm />,
};

function ValidatedForm() {
  const form = useForm<{ email: string }>({
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(() => { return; });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="w-72 space-y-4">
        <FormField
          control={form.control}
          name="email"
          rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

export const WithValidation: Story = {
  render: () => <ValidatedForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole('button', { name: /submit/i });
    await userEvent.click(submit);
    await expect(canvas.getByText(/email is required/i)).toBeInTheDocument();
  },
};
