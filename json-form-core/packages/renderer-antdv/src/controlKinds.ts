import type { JsonSchema } from '@jsonforms/core'

export type BuiltInControlKind =
  | 'input'
  | 'textarea'
  | 'password'
  | 'number'
  | 'switch'
  | 'checkbox'
  | 'select'
  | 'radio'
  | 'multiSelect'
  | 'checkboxGroup'
  | 'date'
  | 'time'
  | 'dateTime'

export type PrimitiveSchema = JsonSchema & {
  enum?: unknown[]
  format?: string
  type?: string | string[]
  items?: PrimitiveSchema
}

export type SchemaFormFieldOption = {
  label: string
  value: unknown
  disabled?: boolean
}

export const builtInControlKinds = new Set<string>([
  'input',
  'textarea',
  'password',
  'number',
  'switch',
  'checkbox',
  'select',
  'radio',
  'multiSelect',
  'checkboxGroup',
  'date',
  'time',
  'dateTime',
])

export const getSchemaType = (schema: PrimitiveSchema) =>
  Array.isArray(schema.type) ? schema.type[0] : schema.type

export const getUiWidget = (options: unknown) => {
  if (!options || typeof options !== 'object') {
    return undefined
  }

  const widget = (options as { widget?: unknown }).widget
  return typeof widget === 'string' ? widget : undefined
}

export const isBuiltInControlKind = (widget: string): widget is BuiltInControlKind =>
  builtInControlKinds.has(widget)

export const buildEnumOptions = (schema: PrimitiveSchema) =>
  (schema.enum ?? []).map((value) => ({
    label: String(value),
    value,
  }))

export const buildArrayEnumOptions = (schema: PrimitiveSchema) =>
  (schema.items?.enum ?? []).map((value) => ({
    label: String(value),
    value,
  }))

export const resolveControlKind = ({
  schema,
  isMultiline,
  hasOptions,
  widget,
}: {
  schema: PrimitiveSchema
  isMultiline: boolean
  hasOptions: boolean
  widget?: string
}): BuiltInControlKind | undefined => {
  if (widget && isBuiltInControlKind(widget)) {
    return widget
  }

  const schemaType = getSchemaType(schema)

  if (schemaType === 'array' && (hasOptions || Array.isArray(schema.items?.enum))) {
    return 'multiSelect'
  }

  if (schemaType === 'string') {
    if (schema.format === 'date') {
      return 'date'
    }

    if (schema.format === 'time') {
      return 'time'
    }

    if (schema.format === 'date-time') {
      return 'dateTime'
    }
  }

  if (hasOptions || Array.isArray(schema.enum)) {
    return 'select'
  }

  if (schemaType === 'boolean') {
    return 'switch'
  }

  if (schemaType === 'number' || schemaType === 'integer') {
    return 'number'
  }

  if (schemaType === 'string' || schemaType === undefined) {
    return isMultiline ? 'textarea' : 'input'
  }

  return undefined
}
