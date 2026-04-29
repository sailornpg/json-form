import type { JsonFormsCellRendererRegistryEntry, JsonFormsRendererRegistryEntry } from '@json-form/engine-adapter'

import { antdvControlRendererEntry } from './AntdvControlRenderer'
import { antdvLayoutRendererEntry } from './AntdvLayoutRenderer'

export { AntdvControlRenderer, antdvControlRendererEntry } from './AntdvControlRenderer'
export { AntdvLayoutRenderer, antdvLayoutRendererEntry } from './AntdvLayoutRenderer'
export {
  getSchemaFormWidgets,
  registerSchemaFormWidgets,
  unregisterSchemaFormWidgets,
  type SchemaFormWidgetMap,
} from './widgetRegistry'

export const antdvRenderers = Object.freeze<JsonFormsRendererRegistryEntry[]>([
  antdvLayoutRendererEntry,
  antdvControlRendererEntry,
])

export const antdvCells = Object.freeze<JsonFormsCellRendererRegistryEntry[]>([])
