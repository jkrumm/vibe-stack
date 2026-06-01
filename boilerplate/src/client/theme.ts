import { createTheme, Input, NumberInput, Textarea, TextInput } from '@mantine/core'

// Inputs default to a 16px font ("md") so iPhones don't zoom the page in when you tap a field.
export const theme = createTheme({
  primaryColor: 'indigo',
  components: {
    Input: Input.extend({ defaultProps: { size: 'md' } }),
    TextInput: TextInput.extend({ defaultProps: { size: 'md' } }),
    NumberInput: NumberInput.extend({ defaultProps: { size: 'md' } }),
    Textarea: Textarea.extend({ defaultProps: { size: 'md' } }),
  },
})
