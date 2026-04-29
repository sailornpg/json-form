import dayjs, { type Dayjs } from 'dayjs'

export const normalizeNumberValue = (value: number | null) => value ?? undefined

export const normalizeBooleanValue = (value: unknown) => Boolean(value)

export const normalizeArrayValue = (value: unknown) => (Array.isArray(value) ? value : [])

export const parseDateValue = (value: unknown, format: string): Dayjs | undefined => {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }

  const parsed = format === timeFormat ? dayjs(`1970-01-01T${value}`) : dayjs(value)
  return parsed.isValid() ? parsed : undefined
}

export const formatDateValue = (value: unknown, format: string) => {
  if (!value || !dayjs.isDayjs(value)) {
    return undefined
  }

  return value.format(format)
}

export const dateFormat = 'YYYY-MM-DD'
export const timeFormat = 'HH:mm:ss'
export const dateTimeFormat = 'YYYY-MM-DDTHH:mm:ss'
