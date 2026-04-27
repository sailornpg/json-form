import {
  isControl,
  rankWith,
  type ControlElement,
  type JsonFormsRendererRegistryEntry,
  type JsonSchema,
} from '@jsonforms/core'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { Form, Input, InputNumber, Select, Switch, Typography } from 'ant-design-vue'
import { defineComponent, h } from 'vue'

const FormItem = Form.Item
const TextArea = Input.TextArea as any
const Text = Typography.Text as any
const InputComponent = Input as any
const InputNumberComponent = InputNumber as any
const SelectComponent = Select as any
const SwitchComponent = Switch as any

type PrimitiveSchema = JsonSchema & {
  enum?: unknown[]
  format?: string
  type?: string | string[]
}

type SchemaFormValidationConfig = {
  displayMode?: 'touched' | 'submit' | 'always'
  submitted?: boolean
  touchedPaths?: string[]
  onFieldInput?: (path: string) => void
}

type SchemaFormFieldOption = {
  label: string
  value: unknown
  disabled?: boolean
}

type SchemaFormFieldState = {
  visible?: boolean
  disabled?: boolean
  required?: boolean
  placeholder?: string
  description?: string
  options?: SchemaFormFieldOption[]
  loading?: boolean
  optionsError?: string
}

type SchemaFormInternalConfig = {
  validation?: SchemaFormValidationConfig
  fields?: Record<string, SchemaFormFieldState>
}

const getSchemaType = (schema: PrimitiveSchema) =>
  Array.isArray(schema.type) ? schema.type[0] : schema.type

const buildEnumOptions = (schema: PrimitiveSchema) =>
  (schema.enum ?? []).map((value) => ({
    label: String(value),
    value,
  }))

const resolveSchemaFormConfig = (config: unknown): SchemaFormInternalConfig | undefined => {
  if (!config || typeof config !== 'object') {
    return undefined
  }

  return (config as { __schemaForm?: SchemaFormInternalConfig }).__schemaForm
}

const shouldDisplayErrors = (
  config: SchemaFormValidationConfig | undefined,
  path: string,
) => {
  if (!config || config.displayMode === undefined || config.displayMode === 'always') {
    return true
  }

  if (config.submitted) {
    return true
  }

  if (config.displayMode === 'submit') {
    return false
  }

  return config.touchedPaths?.includes(path) ?? false
}

const resolveFieldState = (
  config: SchemaFormInternalConfig | undefined,
  path: string,
) => config?.fields?.[path]

export const AntdvControlRenderer = defineComponent({
  name: 'AntdvControlRenderer',
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props) {
    const { control, handleChange } = useJsonFormsControl(props)

    const renderControl = () => {
      const state = control.value
      const schema = state.schema as PrimitiveSchema
      const schemaType = getSchemaType(schema)
      const isMultiline = props.uischema.options?.multi === true
      const schemaFormConfig = resolveSchemaFormConfig(state.config)
      const validationConfig = schemaFormConfig?.validation
      const runtimeState = resolveFieldState(schemaFormConfig, state.path)

      const markTouched = () => {
        validationConfig?.onFieldInput?.(state.path)
      }

      const disabled = !state.enabled || runtimeState?.disabled === true
      const runtimeOptions = runtimeState?.options
      const description = runtimeState?.description ?? state.description
      const placeholder = runtimeState?.placeholder ?? description ?? state.label ?? undefined

      if (runtimeOptions !== undefined || Array.isArray(schema.enum)) {
        return h(SelectComponent, {
          value: state.data,
          disabled,
          loading: runtimeState?.loading === true,
          options: runtimeOptions ?? buildEnumOptions(schema),
          placeholder,
          notFoundContent: runtimeState?.optionsError,
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, value)
          },
        })
      }

      if (schemaType === 'boolean') {
        return h(SwitchComponent, {
          checked: Boolean(state.data),
          disabled,
          'onUpdate:checked': (value: unknown) => {
            markTouched()
            handleChange(state.path, Boolean(value))
          },
        })
      }

      if (schemaType === 'number' || schemaType === 'integer') {
        return h(InputNumberComponent, {
          value: state.data as number | undefined,
          disabled,
          style: { width: '100%' },
          'onUpdate:value': (value: number | null) => {
            markTouched()
            handleChange(state.path, value ?? undefined)
          },
        })
      }

      if (schemaType === 'string' || schemaType === undefined) {
        const component = isMultiline ? TextArea : InputComponent

        return h(component, {
          value: state.data as string | undefined,
          disabled,
          rows: isMultiline ? 4 : undefined,
          placeholder,
          'onUpdate:value': (value: string) => {
            markTouched()
            handleChange(state.path, value)
          },
        })
      }

      return h(Text, { type: 'secondary' }, () => `Unsupported control type: ${String(schemaType)}`)
    }

    return () => {
      const state = control.value
      const schemaFormConfig = resolveSchemaFormConfig(state.config)
      const validationConfig = schemaFormConfig?.validation
      const runtimeState = resolveFieldState(schemaFormConfig, state.path)
      const visible = state.visible && runtimeState?.visible !== false

      if (!visible) {
        return null
      }

      const hasErrors = state.errors.length > 0
      const showErrors = shouldDisplayErrors(validationConfig, state.path)
      const description = runtimeState?.description ?? state.description
      const help =
        showErrors && hasErrors
          ? state.errors
          : runtimeState?.optionsError || description || undefined

      return h(
        FormItem,
        {
          label: state.label || undefined,
          required: runtimeState?.required ?? state.required,
          help,
          validateStatus: showErrors && hasErrors ? 'error' : undefined,
        },
        {
          default: () => renderControl(),
        },
      )
    }
  },
})

export const antdvControlRendererEntry: JsonFormsRendererRegistryEntry = {
  tester: rankWith(10, isControl),
  renderer: AntdvControlRenderer,
}
