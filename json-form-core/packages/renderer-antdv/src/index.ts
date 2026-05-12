import type { JsonFormsCellRendererRegistryEntry, JsonFormsRendererRegistryEntry } from '@sailornpg/engine-adapter'
import type { SchemaFormRendererPreset } from '@sailornpg/form-protocol'

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

export const antdvPreset = Object.freeze<SchemaFormRendererPreset>({
  renderers: antdvRenderers,
  cells: antdvCells,
})
