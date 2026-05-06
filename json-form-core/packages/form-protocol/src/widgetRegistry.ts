import { markRaw, toRaw } from 'vue'

import type { SchemaFormWidgetMap } from './types'

const widgetRegistry = new Map<string, SchemaFormWidgetMap>()

export const registerSchemaFormWidgets = (
  id: string,
  widgets: SchemaFormWidgetMap,
) => {
  const normalizedWidgets: SchemaFormWidgetMap = {}

  for (const [name, widget] of Object.entries(toRaw(widgets))) {
    normalizedWidgets[name] = markRaw(toRaw(widget) as SchemaFormWidgetMap[string])
  }

  widgetRegistry.set(id, markRaw(normalizedWidgets))
}

export const getSchemaFormWidgets = (id: string | undefined) =>
  id ? widgetRegistry.get(id) : undefined

export const unregisterSchemaFormWidgets = (id: string) => {
  widgetRegistry.delete(id)
}
