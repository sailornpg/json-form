import { markRaw, toRaw, type Component } from 'vue'

export type SchemaFormWidgetMap = Record<string, Component>

const widgetRegistry = new Map<string, SchemaFormWidgetMap>()

export const registerSchemaFormWidgets = (
  id: string,
  widgets: SchemaFormWidgetMap,
) => {
  const normalizedWidgets: SchemaFormWidgetMap = {}

  for (const [name, widget] of Object.entries(toRaw(widgets))) {
    normalizedWidgets[name] = markRaw(toRaw(widget) as Component)
  }

  widgetRegistry.set(id, markRaw(normalizedWidgets))
}

export const getSchemaFormWidgets = (id: string | undefined) =>
  id ? widgetRegistry.get(id) : undefined

export const unregisterSchemaFormWidgets = (id: string) => {
  widgetRegistry.delete(id)
}
