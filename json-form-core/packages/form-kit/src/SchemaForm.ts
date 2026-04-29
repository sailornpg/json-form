import {
  JsonFormsRuntime,
  type ErrorObject,
  type JsonFormsCellRendererRegistryEntry,
  type JsonFormsRendererRegistryEntry,
  type JsonSchema,
  type UISchemaElement,
} from '@json-form/engine-adapter'
import { antdvCells, antdvRenderers } from '@json-form/renderer-antdv'
import {
  registerSchemaFormWidgets,
  unregisterSchemaFormWidgets,
} from '@json-form/renderer-antdv'
import {
  computed,
  defineComponent,
  h,
  markRaw,
  onUnmounted,
  shallowRef,
  toRaw,
  watch,
  type PropType,
} from 'vue'

import {
  areSameData,
  clearValueAtPath,
  createFormContext,
  extractFieldDefinitions,
  hasOptionValue,
  resolveFieldRuntime,
  resolveFieldState,
  runEffects,
  toOptionsErrorMessage,
  type DynamicFieldStateMap,
} from './dynamic'
import {
  buildValidationResult,
  runValidators,
  toAdditionalError,
} from './validation'
import type {
  SchemaFormChangeEvent,
  SchemaFormContext,
  SchemaFormEffect,
  SchemaFormData,
  SchemaFormError,
  SchemaFormExposed,
  SchemaFormFieldResolver,
  SchemaFormOption,
  SchemaFormSubmitOptions,
  SchemaFormValidateOptions,
  SchemaFormValidationResult,
  SchemaFormValidator,
  SchemaFormWidgetMap,
  ValidationDisplayMode,
} from './types'

const defaultRenderers = Object.freeze([...antdvRenderers])
const defaultCells = Object.freeze([...antdvCells])
const emptySchemaErrors = Object.freeze([] as ErrorObject[])

const copyFormDataRoot = <T extends SchemaFormData>(data: T): T => {
  if (Array.isArray(data)) {
    return [...data] as T
  }

  return { ...(data as Record<string, unknown>) } as T
}

const areSameSchemaErrors = (left: ErrorObject[], right: ErrorObject[]) =>
  JSON.stringify(left) === JSON.stringify(right)

let schemaFormIdSeed = 0

const normalizeWidgets = (widgets: SchemaFormWidgetMap | undefined): SchemaFormWidgetMap => {
  const rawWidgets = toRaw(widgets ?? {}) as SchemaFormWidgetMap
  const normalizedWidgets: SchemaFormWidgetMap = {}

  for (const [name, widget] of Object.entries(rawWidgets)) {
    normalizedWidgets[name] = markRaw(toRaw(widget) as SchemaFormWidgetMap[string])
  }

  return markRaw(normalizedWidgets)
}

type SchemaFormInternalConfig = {
  __schemaForm: {
    validation: {
      displayMode: ValidationDisplayMode
      submitted: boolean
      touchedPaths: string[]
      onFieldInput: (path: string) => void
    }
    widgetsId: string
    fields: DynamicFieldStateMap
  }
}

export const SchemaForm = defineComponent({
  name: 'SchemaForm',
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
      required: false,
      default: undefined,
    },
    cells: {
      type: Array as PropType<JsonFormsCellRendererRegistryEntry[]>,
      required: false,
      default: undefined,
    },
    config: {
      type: Object as PropType<Record<string, unknown>>,
      required: false,
      default: undefined,
    },
    validators: {
      type: Array as PropType<SchemaFormValidator[]>,
      required: false,
      default: () => [],
    },
    fieldResolvers: {
      type: Array as PropType<SchemaFormFieldResolver[]>,
      required: false,
      default: () => [],
    },
    effects: {
      type: Array as PropType<SchemaFormEffect[]>,
      required: false,
      default: () => [],
    },
    widgets: {
      type: Object as PropType<SchemaFormWidgetMap>,
      required: false,
      default: () => ({}),
    },
    validationDisplayMode: {
      type: String as PropType<ValidationDisplayMode>,
      required: false,
      default: 'touched',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    change: (_event: SchemaFormChangeEvent) => true,
    submit: (_event: SchemaFormValidationResult) => true,
    invalid: (_event: SchemaFormValidationResult) => true,
    'update:data': (_data: Record<string, unknown> | unknown[]) => true,
  },
  setup(props, { emit, expose }) {
    const currentData = shallowRef<SchemaFormData>(props.data as SchemaFormData)
    const schemaErrors = shallowRef<ErrorObject[]>([...emptySchemaErrors])
    const touchedPaths = shallowRef<string[]>([])
    const submitted = shallowRef(false)
    const asyncFieldStates = shallowRef<DynamicFieldStateMap>({})
    const pendingChangedPath = shallowRef<string>()
    const pendingProgrammaticData = shallowRef<SchemaFormData>()
    const hasEmittedRuntimeChange = shallowRef(false)
    const optionRequestIds = new Map<string, number>()
    const optionRequestSignatures = new Map<string, string>()
    const widgetsId = `schema-form-${++schemaFormIdSeed}`

    watch(
      () => props.data,
      (value) => {
        if (!areSameData(currentData.value, value as SchemaFormData)) {
          currentData.value = value as SchemaFormData
        }
      },
    )

    const trackFieldInput = (path: string) => {
      pendingChangedPath.value = path
      if (!path || touchedPaths.value.includes(path)) {
        return
      }

      touchedPaths.value = [...touchedPaths.value, path]
    }

    const customErrors = computed(() =>
      runValidators({
        data: currentData.value,
        schema: props.schema,
        uischema: props.uischema,
        validators: props.validators,
      }),
    )

    const additionalErrors = computed(() => customErrors.value.map(toAdditionalError))
    const validationResult = computed(() =>
      buildValidationResult({
        data: currentData.value,
        schemaErrors: schemaErrors.value,
        customErrors: customErrors.value,
      }),
    )
    const formContext = computed<SchemaFormContext>(() =>
      createFormContext({
        data: currentData.value,
        schema: props.schema,
        uischema: props.uischema,
        errors: validationResult.value.errors,
        valid: validationResult.value.valid,
        submitted: submitted.value,
        touchedPaths: touchedPaths.value,
      }),
    )
    const fieldDefinitions = computed(() => extractFieldDefinitions(props.schema, props.uischema))
    const resolvedFields = computed(() =>
      fieldDefinitions.value.map((definition) => {
        const { runtime, effects } = resolveFieldRuntime({
          definition,
          context: formContext.value,
          fieldResolvers: props.fieldResolvers,
        })

        return {
          definition,
          effects,
          runtime,
          state: resolveFieldState({
            runtime,
            context: formContext.value,
          }),
        }
      }),
    )
    const fieldStates = computed<DynamicFieldStateMap>(() => {
      const nextStates: DynamicFieldStateMap = {}

      for (const field of resolvedFields.value) {
        const options = field.runtime.options

        if (options === undefined) {
          nextStates[field.definition.path] = {
            ...field.state,
            options: undefined,
            loading: false,
            optionsError: undefined,
          }
          continue
        }

        if (Array.isArray(options)) {
          nextStates[field.definition.path] = {
            ...field.state,
            options,
            loading: false,
            optionsError: undefined,
          }
          continue
        }

        nextStates[field.definition.path] = {
          ...field.state,
          options: asyncFieldStates.value[field.definition.path]?.options ?? [],
          loading: asyncFieldStates.value[field.definition.path]?.loading ?? true,
          optionsError: asyncFieldStates.value[field.definition.path]?.optionsError,
        }
      }

      return nextStates
    })
    const effectiveRenderers = computed(() => props.renderers ?? defaultRenderers)
    const effectiveCells = computed(() => props.cells ?? defaultCells)
    const effectiveWidgets = computed(() => normalizeWidgets(props.widgets))

    watch(
      effectiveWidgets,
      (widgets) => {
        registerSchemaFormWidgets(widgetsId, widgets)
      },
      {
        immediate: true,
      },
    )

    onUnmounted(() => {
      unregisterSchemaFormWidgets(widgetsId)
    })

    const buildResult = (
      data: SchemaFormData = currentData.value,
      nextSchemaErrors: ErrorObject[] = schemaErrors.value,
      nextCustomErrors: SchemaFormError[] = customErrors.value,
    ) =>
      buildValidationResult({
        data,
        schemaErrors: nextSchemaErrors,
        customErrors: nextCustomErrors,
      })

    const emitDataUpdate = (nextData: SchemaFormData) => {
      if (areSameData(props.data as SchemaFormData, nextData)) {
        return
      }

      emit('update:data', nextData as Record<string, unknown> | unknown[])
    }

    const setCurrentData = (nextData: SchemaFormData) => {
      if (areSameData(currentData.value, nextData)) {
        return false
      }

      currentData.value = nextData
      return true
    }

    const setSchemaErrors = (nextErrors: ErrorObject[]) => {
      if (areSameSchemaErrors(schemaErrors.value, nextErrors)) {
        return false
      }

      schemaErrors.value = [...nextErrors]
      return true
    }

    const setAsyncFieldStates = (nextStates: DynamicFieldStateMap) => {
      if (areSameData(asyncFieldStates.value, nextStates)) {
        return false
      }

      asyncFieldStates.value = nextStates
      return true
    }

    const commitProgrammaticData = (nextData: SchemaFormData) => {
      if (areSameData(currentData.value, nextData)) {
        return
      }

      const nextSnapshot = copyFormDataRoot(nextData)

      pendingProgrammaticData.value = nextSnapshot
      setCurrentData(nextSnapshot)
      emitDataUpdate(nextSnapshot)
    }

    const clearInvalidOptionValue = ({
      path,
      options,
      data,
    }: {
      path: string
      options: SchemaFormOption[]
      data: SchemaFormData
    }) => {
      const currentValue = createFormContext({
        data,
        schema: props.schema,
        uischema: props.uischema,
        errors: validationResult.value.errors,
        valid: validationResult.value.valid,
        submitted: submitted.value,
        touchedPaths: touchedPaths.value,
      }).getValue(path)

      if (hasOptionValue(options, currentValue)) {
        return data
      }

      return clearValueAtPath(data, path)
    }

    const buildOptionRequestSignature = (field: (typeof resolvedFields.value)[number]) => {
      const dependencies = field.runtime.optionsDependencies

      if (Array.isArray(dependencies)) {
        return JSON.stringify({
          path: field.definition.path,
          dependencies: dependencies.map((path) => [
            path,
            formContext.value.getValue(path),
          ]),
        })
      }

      if (typeof dependencies === 'function') {
        return JSON.stringify({
          path: field.definition.path,
          dependencies: dependencies(formContext.value),
        })
      }

      return JSON.stringify({
        path: field.definition.path,
        data: currentData.value,
      })
    }

    watch(
      resolvedFields,
      () => {
        let nextData = currentData.value
        const nextAsyncStates: DynamicFieldStateMap = {}
        const activeAsyncPaths = new Set<string>()

        for (const field of resolvedFields.value) {
          const options = field.runtime.options

          if (options === undefined) {
            continue
          }

          if (Array.isArray(options)) {
            nextData = clearInvalidOptionValue({
              path: field.definition.path,
              options,
              data: nextData,
            })
            continue
          }

          activeAsyncPaths.add(field.definition.path)
          const previousState = asyncFieldStates.value[field.definition.path]
          const requestSignature = buildOptionRequestSignature(field)

          if (
            previousState !== undefined &&
            optionRequestSignatures.get(field.definition.path) === requestSignature
          ) {
            nextAsyncStates[field.definition.path] = previousState
            continue
          }

          optionRequestSignatures.set(field.definition.path, requestSignature)
          const requestId = (optionRequestIds.get(field.definition.path) ?? 0) + 1
          optionRequestIds.set(field.definition.path, requestId)

          nextAsyncStates[field.definition.path] = {
            ...field.state,
            options: previousState?.options ?? [],
            loading: true,
            optionsError: undefined,
          }

          void Promise.resolve(options(formContext.value))
          .then(async (options) => {
            if (optionRequestIds.get(field.definition.path) !== requestId) {
              return
            }

            let updatedData = currentData.value
            const currentValue = createFormContext({
              data: updatedData,
              schema: props.schema,
              uischema: props.uischema,
              errors: validationResult.value.errors,
              valid: validationResult.value.valid,
              submitted: submitted.value,
              touchedPaths: touchedPaths.value,
            }).getValue(field.definition.path)
            if (!hasOptionValue(options, currentValue)) {
              updatedData = clearInvalidOptionValue({
                path: field.definition.path,
                options,
                data: updatedData,
              })
              commitProgrammaticData(updatedData)
            }

            setAsyncFieldStates({
              ...asyncFieldStates.value,
              [field.definition.path]: {
                ...asyncFieldStates.value[field.definition.path],
                options,
                loading: false,
                optionsError: undefined,
              },
            })
          })
          .catch((error) => {
            if (optionRequestIds.get(field.definition.path) !== requestId) {
              return
            }

            setAsyncFieldStates({
              ...asyncFieldStates.value,
              [field.definition.path]: {
                ...asyncFieldStates.value[field.definition.path],
                options: asyncFieldStates.value[field.definition.path]?.options ?? [],
                loading: false,
                optionsError: toOptionsErrorMessage(error),
              },
            })
          })
        }

        for (const path of optionRequestSignatures.keys()) {
          if (!activeAsyncPaths.has(path)) {
            optionRequestSignatures.delete(path)
            optionRequestIds.delete(path)
          }
        }

        setAsyncFieldStates(nextAsyncStates)

        if (!areSameData(currentData.value, nextData)) {
          commitProgrammaticData(nextData)
        }
      },
      {
        immediate: true,
      },
    )

    const validate = async (
      options: SchemaFormValidateOptions = {},
    ): Promise<SchemaFormValidationResult> => {
      submitted.value = true
      const result = buildResult()

      if (!result.valid) {
        emit('invalid', result)
        await options.onInvalid?.(result)
      }

      return result
    }

    const submit = async (
      options: SchemaFormSubmitOptions = {},
    ): Promise<SchemaFormValidationResult> => {
      const result = await validate({
        onInvalid: options.onInvalid,
      })

      if (result.valid) {
        emit('submit', result)
        await options.onSubmit?.(result)
      }

      return result
    }

    const resetValidation = () => {
      submitted.value = false
      touchedPaths.value = []
    }

    expose<SchemaFormExposed>({
      validate,
      submit,
      resetValidation,
    })

    const runtimeConfig = computed<SchemaFormInternalConfig & Record<string, unknown>>(() => ({
      ...(props.config ?? {}),
      __schemaForm: {
        validation: {
          displayMode: props.validationDisplayMode,
          submitted: submitted.value,
          touchedPaths: touchedPaths.value,
          onFieldInput: trackFieldInput,
        },
        widgetsId,
        fields: fieldStates.value,
      },
    }))

    return () => {
      const runtimeProps: Record<string, unknown> = {
        data: currentData.value,
        schema: props.schema,
        renderers: effectiveRenderers.value,
        cells: effectiveCells.value,
        config: runtimeConfig.value,
        additionalErrors: additionalErrors.value,
        readonly: props.readonly,
        onChange: async (event: { data: SchemaFormData; errors: ErrorObject[] }) => {
          const eventData = copyFormDataRoot(event.data)
          const dataChanged = setCurrentData(eventData)
          const schemaErrorsChanged = setSchemaErrors(event.errors)

          if (
            pendingProgrammaticData.value !== undefined &&
            areSameData(pendingProgrammaticData.value, eventData)
          ) {
            pendingProgrammaticData.value = undefined

            hasEmittedRuntimeChange.value = true
            emit('change', buildResult(eventData, event.errors, customErrors.value))
            return
          }

          const changedPath = pendingChangedPath.value
          pendingChangedPath.value = undefined

          let nextData = eventData
          if (changedPath) {
            const fieldDefinition = resolvedFields.value.find((field) => field.definition.path === changedPath)
            const localEffects = fieldDefinition?.effects ?? []
            const effectedData = await runEffects({
              data: eventData,
              changedPath,
              schema: props.schema,
              uischema: props.uischema,
              errors: validationResult.value.errors,
              valid: validationResult.value.valid,
              submitted: submitted.value,
              touchedPaths: touchedPaths.value,
              effects: [...props.effects, ...localEffects],
            })

            if (!areSameData(eventData, effectedData)) {
              commitProgrammaticData(effectedData)
              return
            }

            nextData = effectedData
          }

          const effectedDataChanged = setCurrentData(nextData)

          const result = buildResult(nextData, event.errors, customErrors.value)

          emitDataUpdate(nextData)
          if (
            !hasEmittedRuntimeChange.value ||
            dataChanged ||
            schemaErrorsChanged ||
            effectedDataChanged ||
            changedPath
          ) {
            hasEmittedRuntimeChange.value = true
            emit('change', result)
          }
        },
      }

      if (props.uischema) {
        runtimeProps.uischema = props.uischema
      }

      return h(JsonFormsRuntime as any, runtimeProps)
    }
  },
})

export { defaultCells, defaultRenderers }
