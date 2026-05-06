import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
} from '@json-form/engine-adapter'
import type { Component } from 'vue'

export type ValidationDisplayMode = 'touched' | 'submit' | 'always'

export type SchemaFormOption = {
  label: string
  value: unknown
  disabled?: boolean
}

export type SchemaFormWidgetProps = {
  value: unknown
  path: string
  label?: string
  disabled: boolean
  required: boolean
  placeholder?: string
  description?: string
  options?: SchemaFormOption[]
  loading?: boolean
  error?: string
  schema: JsonSchema
  uischema: UISchemaElement
}

export type SchemaFormWidgetComponent = Component

export type SchemaFormWidgetMap = Record<string, SchemaFormWidgetComponent>

export type SchemaFormRendererPreset = {
  renderers: readonly JsonFormsRendererRegistryEntry[]
  cells?: readonly JsonFormsCellRendererRegistryEntry[]
}

export type SchemaFormRendererValidationConfig = {
  displayMode?: ValidationDisplayMode
  submitted?: boolean
  touchedPaths?: string[]
  onFieldInput?: (path: string) => void
}

export type SchemaFormRendererFieldState = {
  visible?: boolean
  disabled?: boolean
  required?: boolean
  placeholder?: string
  description?: string
  options?: SchemaFormOption[]
  loading?: boolean
  optionsError?: string
}

export type SchemaFormRendererConfig = {
  validation?: SchemaFormRendererValidationConfig
  widgetsId?: string
  widgets?: SchemaFormWidgetMap
  fields?: Record<string, SchemaFormRendererFieldState>
}
