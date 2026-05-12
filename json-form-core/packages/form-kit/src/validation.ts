import { encode, getControlPath, type JsonSchema, type UISchemaElement } from '@sailornpg/engine-adapter'
import type { ErrorObject } from 'ajv'

import type {
  SchemaFormData,
  SchemaFormError,
  SchemaFormValidationResult,
  SchemaFormValidator,
} from './types'

type BuildValidationResultArgs = {
  data: SchemaFormData
  schemaErrors: ErrorObject[]
  customErrors: SchemaFormError[]
}

type RunValidatorsArgs = {
  data: SchemaFormData
  schema: JsonSchema
  uischema?: UISchemaElement
  validators: SchemaFormValidator[]
}

const fallbackSchemaErrorMessage = 'Invalid value'

const toInstancePath = (path: string) => {
  if (!path) {
    return ''
  }

  return `/${path
    .split('.')
    .filter(Boolean)
    .map((segment) => encode(segment))
    .join('/')}`
}

export const toSchemaFormError = (error: ErrorObject): SchemaFormError => ({
  path: getControlPath(error),
  message: error.message ?? fallbackSchemaErrorMessage,
  source: 'schema',
})

export const toAdditionalError = (error: SchemaFormError): ErrorObject => ({
  keyword: 'custom',
  instancePath: toInstancePath(error.path),
  schemaPath: '#/custom',
  params: {},
  message: error.message,
})

export const runValidators = ({
  data,
  schema,
  uischema,
  validators,
}: RunValidatorsArgs): SchemaFormError[] => {
  const errors: SchemaFormError[] = []

  for (const validator of validators) {
    try {
      const result =
        validator({
          data,
          schema,
          uischema,
        }) ?? []

      for (const error of result) {
        errors.push({
          ...error,
          source: 'custom',
        })
      }
    } catch (error) {
      console.error('SchemaForm validator failed.', error)
    }
  }

  return errors
}

export const buildValidationResult = ({
  data,
  schemaErrors,
  customErrors,
}: BuildValidationResultArgs): SchemaFormValidationResult => {
  const normalizedSchemaErrors = schemaErrors.map(toSchemaFormError)
  const errors = [...normalizedSchemaErrors, ...customErrors]

  return {
    data,
    errors,
    valid: errors.length === 0,
    schemaErrors: [...schemaErrors],
    customErrors: [...customErrors],
  }
}
