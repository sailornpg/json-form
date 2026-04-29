import { markRaw, type Component } from 'vue'

export const defineSchemaFormWidget = <TComponent extends Component>(
  component: TComponent,
) => markRaw(component) as TComponent
