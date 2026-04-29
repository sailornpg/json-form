import type { ErrorObject, JsonSchema, UISchemaElement } from '@json-form/engine-adapter'
import type { Component } from 'vue'

export type SchemaFormData = Record<string, unknown> | unknown[]

export type ValidationDisplayMode = 'touched' | 'submit' | 'always'

export type SchemaFormErrorSource = 'schema' | 'custom'

export type SchemaFormError = {
  path: string
  message: string
  source: SchemaFormErrorSource
}

export type SchemaFormValidatorContext = {
  data: SchemaFormData
  schema: JsonSchema
  uischema?: UISchemaElement
}

export type SchemaFormValidator = (
  context: SchemaFormValidatorContext,
) => SchemaFormError[] | void

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

export type SchemaFormContext = {
  data: SchemaFormData
  schema: JsonSchema
  uischema?: UISchemaElement
  errors: SchemaFormError[]
  valid: boolean
  submitted: boolean
  touchedPaths: string[]
  getValue: (path: string) => unknown
}

export type SchemaFormFieldRuntime = {
  visible?: boolean | ((context: SchemaFormContext) => boolean)
  disabled?: boolean | ((context: SchemaFormContext) => boolean)
  required?: boolean | ((context: SchemaFormContext) => boolean)
  placeholder?: string | ((context: SchemaFormContext) => string | undefined)
  description?: string | ((context: SchemaFormContext) => string | undefined)
  options?:
    | SchemaFormOption[]
    | ((context: SchemaFormContext) => SchemaFormOption[] | Promise<SchemaFormOption[]>)
  optionsDependencies?: string[] | ((context: SchemaFormContext) => unknown)
}

export type SchemaFormFieldResolver = (args: {
  path: string
  schema: JsonSchema
  uischema: UISchemaElement
  context: SchemaFormContext
}) => Partial<SchemaFormFieldRuntime> | void

export type SchemaFormEffectContext = SchemaFormContext & {
  changedPath: string
  setValue: (path: string, value: unknown) => void
  clearValue: (path: string) => void
}

export type SchemaFormEffect = (
  context: SchemaFormEffectContext,
) => void | Promise<void>

export type SchemaFormControlOptions<
  TWidgetProps extends Record<string, unknown> = Record<string, unknown>,
> = {
  widget?: string
  widgetProps?: TWidgetProps
  runtime?: Partial<SchemaFormFieldRuntime>
  effects?: SchemaFormEffect[]
}

export type SchemaFormValidationResult = {
  data: SchemaFormData
  errors: SchemaFormError[]
  valid: boolean
  schemaErrors: ErrorObject[]
  customErrors: SchemaFormError[]
}

export type SchemaFormChangeEvent = SchemaFormValidationResult

export type SchemaFormValidateOptions = {
  onInvalid?: (result: SchemaFormValidationResult) => void | Promise<void>
}

export type SchemaFormSubmitOptions = SchemaFormValidateOptions & {
  onSubmit?: (result: SchemaFormValidationResult) => void | Promise<void>
}

export type SchemaFormExposed = {
  validate: (options?: SchemaFormValidateOptions) => Promise<SchemaFormValidationResult>
  submit: (options?: SchemaFormSubmitOptions) => Promise<SchemaFormValidationResult>
  resetValidation: () => void
}
