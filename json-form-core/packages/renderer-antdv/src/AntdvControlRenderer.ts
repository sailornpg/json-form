import {
  isControl,
  rankWith,
  type ControlElement,
  type JsonFormsRendererRegistryEntry,
} from '@jsonforms/core'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import {
  getSchemaFormWidgets,
  type SchemaFormRendererConfig,
} from '@sailornpg/form-protocol'
import {
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
  TimePicker,
  Typography,
} from 'ant-design-vue'
import { defineComponent, h, toRaw } from 'vue'

import {
  buildArrayEnumOptions,
  buildEnumOptions,
  getSchemaType,
  getUiWidget,
  isBuiltInControlKind,
  resolveControlKind,
  type BuiltInControlKind,
  type PrimitiveSchema,
  type SchemaFormFieldOption,
} from './controlKinds'
import {
  dateFormat,
  dateTimeFormat,
  formatDateValue,
  normalizeArrayValue,
  normalizeBooleanValue,
  normalizeNumberValue,
  parseDateValue,
  timeFormat,
} from './controlValues'
const FormItem = Form.Item
const TextArea = Input.TextArea as any
const Password = Input.Password as any
const Text = Typography.Text as any
const CheckboxComponent = Checkbox as any
const CheckboxGroupComponent = Checkbox.Group as any
const DatePickerComponent = DatePicker as any
const InputComponent = Input as any
const InputNumberComponent = InputNumber as any
const RadioGroupComponent = Radio.Group as any
const SelectComponent = Select as any
const SwitchComponent = Switch as any
const TimePickerComponent = TimePicker as any

const resolveWidgetProps = (options: unknown) => {
  if (!options || typeof options !== 'object') {
    return undefined
  }

  const widgetProps = (options as { widgetProps?: unknown }).widgetProps
  return widgetProps && typeof widgetProps === 'object'
    ? widgetProps as Record<string, unknown>
    : undefined
}

const resolveSchemaFormConfig = (config: unknown): SchemaFormRendererConfig | undefined => {
  if (!config || typeof config !== 'object') {
    return undefined
  }

  return (config as { __schemaForm?: SchemaFormRendererConfig }).__schemaForm
}

const shouldDisplayErrors = (
  config: SchemaFormRendererConfig['validation'] | undefined,
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
  config: SchemaFormRendererConfig | undefined,
  path: string,
) => config?.fields?.[path]

const resolveOptions = (
  schema: PrimitiveSchema,
  runtimeOptions: SchemaFormFieldOption[] | undefined,
  kind: BuiltInControlKind | undefined,
) => {
  if (runtimeOptions !== undefined) {
    return runtimeOptions
  }

  if (kind === 'multiSelect' || kind === 'checkboxGroup') {
    return buildArrayEnumOptions(schema)
  }

  return buildEnumOptions(schema)
}

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
      const widget = getUiWidget(props.uischema.options)
      const widgetProps = resolveWidgetProps(props.uischema.options)
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
      const registeredWidgets = getSchemaFormWidgets(schemaFormConfig?.widgetsId)
      const customWidget = widget
        ? registeredWidgets?.[widget] ?? schemaFormConfig?.widgets?.[widget]
        : undefined
      const kind = resolveControlKind({
        schema,
        isMultiline,
        hasOptions: runtimeOptions !== undefined || Array.isArray(schema.enum),
        widget,
      })
      const required = runtimeState?.required ?? state.required

      if (customWidget) {
        return h(toRaw(customWidget) as any, {
          ...(widgetProps ?? {}),
          value: state.data,
          path: state.path,
          label: state.label || undefined,
          disabled,
          required,
          placeholder,
          description,
          options: runtimeOptions,
          loading: runtimeState?.loading === true,
          error: runtimeState?.optionsError,
          schema,
          uischema: props.uischema,
          'onUpdate:value': (value: unknown) => {
            handleChange(state.path, value)
          },
          onBlur: markTouched,
        })
      }

      if (widget && !isBuiltInControlKind(widget)) {
        return h(Text, { type: 'secondary' }, () => `Unsupported widget: ${widget}`)
      }

      const options = resolveOptions(schema, runtimeOptions, kind)

      if (kind === 'select') {
        return h(SelectComponent, {
          value: state.data,
          disabled,
          loading: runtimeState?.loading === true,
          options,
          placeholder,
          notFoundContent: runtimeState?.optionsError,
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, value)
          },
        })
      }

      if (kind === 'radio') {
        return h(RadioGroupComponent, {
          value: state.data,
          disabled,
          options,
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, value)
          },
        })
      }

      if (kind === 'multiSelect') {
        return h(SelectComponent, {
          value: normalizeArrayValue(state.data),
          disabled,
          loading: runtimeState?.loading === true,
          mode: 'multiple',
          options,
          placeholder,
          notFoundContent: runtimeState?.optionsError,
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, normalizeArrayValue(value))
          },
        })
      }

      if (kind === 'checkboxGroup') {
        return h(CheckboxGroupComponent, {
          value: normalizeArrayValue(state.data),
          disabled,
          options,
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, normalizeArrayValue(value))
          },
        })
      }

      if (kind === 'switch') {
        return h(SwitchComponent, {
          checked: Boolean(state.data),
          disabled,
          'onUpdate:checked': (value: unknown) => {
            markTouched()
            handleChange(state.path, normalizeBooleanValue(value))
          },
        })
      }

      if (kind === 'checkbox') {
        return h(CheckboxComponent, {
          checked: Boolean(state.data),
          disabled,
          'onUpdate:checked': (value: unknown) => {
            markTouched()
            handleChange(state.path, normalizeBooleanValue(value))
          },
        })
      }

      if (kind === 'number') {
        return h(InputNumberComponent, {
          value: state.data as number | undefined,
          disabled,
          style: { width: '100%' },
          'onUpdate:value': (value: number | null) => {
            markTouched()
            handleChange(state.path, normalizeNumberValue(value))
          },
        })
      }

      if (kind === 'date') {
        return h(DatePickerComponent, {
          value: parseDateValue(state.data, dateFormat),
          disabled,
          format: dateFormat,
          placeholder,
          style: { width: '100%' },
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, formatDateValue(value, dateFormat))
          },
        })
      }

      if (kind === 'time') {
        return h(TimePickerComponent, {
          value: parseDateValue(state.data, timeFormat),
          disabled,
          format: timeFormat,
          placeholder,
          style: { width: '100%' },
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, formatDateValue(value, timeFormat))
          },
        })
      }

      if (kind === 'dateTime') {
        return h(DatePickerComponent, {
          value: parseDateValue(state.data, dateTimeFormat),
          disabled,
          format: 'YYYY-MM-DD HH:mm:ss',
          placeholder,
          showTime: { format: timeFormat },
          style: { width: '100%' },
          'onUpdate:value': (value: unknown) => {
            markTouched()
            handleChange(state.path, formatDateValue(value, dateTimeFormat))
          },
        })
      }

      if (kind === 'input' || kind === 'textarea' || kind === 'password') {
        const component = kind === 'textarea' ? TextArea : kind === 'password' ? Password : InputComponent

        return h(component, {
          value: state.data as string | undefined,
          disabled,
          rows: kind === 'textarea' ? 4 : undefined,
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
