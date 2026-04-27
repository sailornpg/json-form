import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  ValidationMode,
  UISchemaElement,
} from '@jsonforms/core'
import { JsonForms, type JsonFormsChangeEvent } from '@jsonforms/vue'
import type { ErrorObject } from 'ajv'
import { defineComponent, h, type PropType } from 'vue'

export const JsonFormsRuntime = defineComponent({
  name: 'JsonFormsRuntime',
  props: {
    data: {
      type: [Object, Array] as PropType<Record<string, unknown> | unknown[]>,
      required: true,
    },
    schema: {
      type: Object as PropType<JsonSchema>,
      required: true,
    },
    uischema: {
      type: Object as PropType<UISchemaElement>,
      required: false,
      default: undefined,
    },
    renderers: {
      type: Array as PropType<JsonFormsRendererRegistryEntry[]>,
      required: true,
    },
    cells: {
      type: Array as PropType<JsonFormsCellRendererRegistryEntry[]>,
      required: false,
      default: () => [],
    },
    config: {
      type: Object as PropType<Record<string, unknown>>,
      required: false,
      default: undefined,
    },
    validationMode: {
      type: String as PropType<ValidationMode>,
      required: false,
      default: undefined,
    },
    additionalErrors: {
      type: Array as PropType<ErrorObject[]>,
      required: false,
      default: () => [],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    change: (_event: JsonFormsChangeEvent) => true,
  },
  setup(props, { emit }) {
    return () =>
      h(JsonForms, {
        data: props.data,
        schema: props.schema,
        uischema: props.uischema,
        renderers: props.renderers,
        cells: props.cells,
        config: props.config,
        validationMode: props.validationMode,
        additionalErrors: props.additionalErrors,
        readonly: props.readonly,
        onChange: (event: JsonFormsChangeEvent) => emit('change', event),
      })
  },
})
