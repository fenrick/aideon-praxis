import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldTitle,
  FieldContent,
} from './field';
import { Input } from './input';
import { Checkbox } from './checkbox';

const meta = {
  component: Field,
  tags: ['autodocs'],
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <Input id="name" placeholder="Enter your name" />
      <FieldDescription>This is your display name.</FieldDescription>
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" placeholder="you@example.com" aria-invalid />
      <FieldError>Please enter a valid email address.</FieldError>
    </Field>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="w-72">
      <FieldTitle>Notifications</FieldTitle>
      <FieldContent>
        <FieldDescription>Receive email notifications.</FieldDescription>
      </FieldContent>
      <Checkbox />
    </Field>
  ),
};

export const FieldSetExample: Story = {
  render: () => (
    <FieldSet className="w-72">
      <FieldLegend>Personal information</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="first">First name</FieldLabel>
          <Input id="first" placeholder="First name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="last">Last name</FieldLabel>
          <Input id="last" placeholder="Last name" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
