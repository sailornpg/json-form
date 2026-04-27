import {
  getPropPath,
  resolveData,
  resolveSchema,
  toDataPath,
  type JsonSchema,
  type UISchemaElement,
} from '@json-form/engine-adapter'

import type {
  SchemaFormContext,
  SchemaFormControlOptions,
  SchemaFormData,
  SchemaFormEffect,
  SchemaFormEffectContext,
  SchemaFormError,
  SchemaFormFieldResolver,
  SchemaFormFieldRuntime,
  SchemaFormOption,
} from './types'

type SchemaFormControlElement = UISchemaElement & {
  scope?: string
  options?: SchemaFormControlOptions
}

type DynamicFieldDefinition = {
  path: string
  schema: JsonSchema
  uischema: UISchemaElement
  runtime: Partial<SchemaFormFieldRuntime>
  effects: SchemaFormEffect[]
}

export type ResolvedFieldState = {
  visible?: boolean
  disabled?: boolean
  required?: boolean
  placeholder?: string
  description?: string
  options?: SchemaFormOption[]
  loading?: boolean
  optionsError?: string
}

const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isControlElement = (uischema: UISchemaElement): uischema is SchemaFormControlElement =>
  uischema.type === 'Control' && typeof (uischema as SchemaFormControlElement).scope === 'string'

const cloneData = <T>(data: T): T => {
  if (!isObjectLike(data) && !Array.isArray(data)) {
    return data
  }

  return structuredClone(data)
}

const toPathSegments = (path: string) => path.split('.').filter(Boolean)

const isIndexSegment = (segment: string) => /^\d+$/.test(segment)

const ensureChildContainer = (
  target: Record<string, unknown> | unknown[],
  segment: string,
  nextSegment: string,
) => {
  const nextContainer = isIndexSegment(nextSegment) ? [] : {}

  if (Array.isArray(target) && isIndexSegment(segment)) {
    const index = Number(segment)
    if (!isObjectLike(target[index]) && !Array.isArray(target[index])) {
      target[index] = nextContainer
    }

    return target[index] as Record<string, unknown> | unknown[]
  }

  const current = (target as Record<string, unknown>)[segment]
  if (!isObjectLike(current) && !Array.isArray(current)) {
    ;(target as Record<string, unknown>)[segment] = nextContainer
  }

  return (target as Record<string, unknown>)[segment] as Record<string, unknown> | unknown[]
}

export const setValueAtPath = (data: SchemaFormData, path: string, value: unknown): SchemaFormData => {
  if (!path) {
    return value as SchemaFormData
  }

  const nextData = cloneData(data)
  const segments = toPathSegments(path)

  if (segments.length === 0) {
    return value as SchemaFormData
  }

  let target = nextData as Record<string, unknown> | unknown[]

  for (let index = 0; index < segments.length - 1; index += 1) {
    target = ensureChildContainer(target, segments[index], segments[index + 1])
  }

  const finalSegment = segments[segments.length - 1]
  if (Array.isArray(target) && isIndexSegment(finalSegment)) {
    target[Number(finalSegment)] = value
  } else {
    ;(target as Record<string, unknown>)[finalSegment] = value
  }

  return nextData
}

export const clearValueAtPath = (data: SchemaFormData, path: string): SchemaFormData => {
  if (!path) {
    return data
  }

  const nextData = cloneData(data)
  const segments = toPathSegments(path)

  if (segments.length === 0) {
    return nextData
  }

  let target = nextData as Record<string, unknown> | unknown[]

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]
    const nextTarget = Array.isArray(target) && isIndexSegment(segment)
      ? target[Number(segment)]
      : (target as Record<string, unknown>)[segment]

    if (!isObjectLike(nextTarget) && !Array.isArray(nextTarget)) {
      return nextData
    }

    target = nextTarget as Record<string, unknown> | unknown[]
  }

  const finalSegment = segments[segments.length - 1]
  if (Array.isArray(target) && isIndexSegment(finalSegment)) {
    target[Number(finalSegment)] = undefined
  } else {
    delete (target as Record<string, unknown>)[finalSegment]
  }

  return nextData
}

const safeEvaluate = <T>(
  resolver: T | ((context: SchemaFormContext) => T),
  context: SchemaFormContext,
): T | undefined => {
  if (typeof resolver !== 'function') {
    return resolver
  }

  try {
    return (resolver as (value: SchemaFormContext) => T)(context)
  } catch (error) {
    console.error('SchemaForm runtime resolver failed.', error)
    return undefined
  }
}

const getControlOptions = (uischema: UISchemaElement): SchemaFormControlOptions =>
  ((uischema as SchemaFormControlElement).options ?? {}) as SchemaFormControlOptions

const visitUiSchema = (
  schema: JsonSchema,
  uischema: UISchemaElement | undefined,
  definitions: DynamicFieldDefinition[],
) => {
  if (!uischema) {
    return
  }

  if (isControlElement(uischema)) {
    const path = toDataPath(uischema.scope ?? '')
    const fieldSchema = resolveSchema(schema, getPropPath(path), schema) ?? schema
    const controlOptions = getControlOptions(uischema)

    definitions.push({
      path,
      schema: fieldSchema,
      uischema,
      runtime: controlOptions.runtime ?? {},
      effects: controlOptions.effects ?? [],
    })
  }

  const childElements = (uischema as UISchemaElement & { elements?: UISchemaElement[] }).elements
  childElements?.forEach((element) => visitUiSchema(schema, element, definitions))
}

export const extractFieldDefinitions = (
  schema: JsonSchema,
  uischema?: UISchemaElement,
): DynamicFieldDefinition[] => {
  const definitions: DynamicFieldDefinition[] = []
  visitUiSchema(schema, uischema, definitions)
  return definitions
}

export const createFormContext = ({
  data,
  schema,
  uischema,
  errors,
  valid,
  submitted,
  touchedPaths,
}: {
  data: SchemaFormData
  schema: JsonSchema
  uischema?: UISchemaElement
  errors: SchemaFormError[]
  valid: boolean
  submitted: boolean
  touchedPaths: string[]
}): SchemaFormContext => ({
  data,
  schema,
  uischema,
  errors,
  valid,
  submitted,
  touchedPaths,
  getValue: (path: string) => resolveData(data, path),
})

export const resolveFieldRuntime = ({
  definition,
  context,
  fieldResolvers,
}: {
  definition: DynamicFieldDefinition
  context: SchemaFormContext
  fieldResolvers: SchemaFormFieldResolver[]
}): {
  runtime: Partial<SchemaFormFieldRuntime>
  effects: SchemaFormEffect[]
} => {
  const runtimeFromResolvers = fieldResolvers.reduce<Partial<SchemaFormFieldRuntime>>(
    (result, resolver) => ({
      ...result,
      ...(resolver({
        path: definition.path,
        schema: definition.schema,
        uischema: definition.uischema,
        context,
      }) ?? {}),
    }),
    {},
  )

  return {
    runtime: {
      ...runtimeFromResolvers,
      ...definition.runtime,
    },
    effects: definition.effects,
  }
}

export const resolveFieldState = ({
  runtime,
  context,
}: {
  runtime: Partial<SchemaFormFieldRuntime>
  context: SchemaFormContext
}): ResolvedFieldState => ({
  visible: safeEvaluate(runtime.visible, context),
  disabled: safeEvaluate(runtime.disabled, context),
  required: safeEvaluate(runtime.required, context),
  placeholder: safeEvaluate(runtime.placeholder, context),
  description: safeEvaluate(runtime.description, context),
})

export const resolveFieldOptionsInput = ({
  runtime,
  context,
}: {
  runtime: Partial<SchemaFormFieldRuntime>
  context: SchemaFormContext
}): SchemaFormOption[] | Promise<SchemaFormOption[]> | undefined => {
  const { options } = runtime

  if (options === undefined) {
    return undefined
  }

  if (Array.isArray(options)) {
    return options
  }

  try {
    return options(context)
  } catch (error) {
    console.error('SchemaForm options resolver failed.', error)
    return undefined
  }
}

export const hasOptionValue = (options: SchemaFormOption[], value: unknown) => {
  if (value === undefined || value === null) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every((item) => options.some((option) => Object.is(option.value, item)))
  }

  return options.some((option) => Object.is(option.value, value))
}

export const toOptionsErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Failed to load options.'
}

export const areSameData = (left: SchemaFormData, right: SchemaFormData) =>
  JSON.stringify(left) === JSON.stringify(right)

export const runEffects = async ({
  data,
  changedPath,
  schema,
  uischema,
  errors,
  valid,
  submitted,
  touchedPaths,
  effects,
}: {
  data: SchemaFormData
  changedPath: string
  schema: JsonSchema
  uischema?: UISchemaElement
  errors: SchemaFormError[]
  valid: boolean
  submitted: boolean
  touchedPaths: string[]
  effects: SchemaFormEffect[]
}): Promise<SchemaFormData> => {
  let nextData = cloneData(data)

  const buildContext = (): SchemaFormEffectContext => ({
    ...createFormContext({
      data: nextData,
      schema,
      uischema,
      errors,
      valid,
      submitted,
      touchedPaths,
    }),
    changedPath,
    setValue: (path: string, value: unknown) => {
      nextData = setValueAtPath(nextData, path, value)
    },
    clearValue: (path: string) => {
      nextData = clearValueAtPath(nextData, path)
    },
  })

  for (const effect of effects) {
    try {
      await effect(buildContext())
    } catch (error) {
      console.error('SchemaForm effect failed.', error)
    }
  }

  return nextData
}

export type DynamicFieldStateMap = Record<string, ResolvedFieldState>
