import {
  isLayout,
  rankWith,
  type JsonFormsRendererRegistryEntry,
  type Layout,
  type UISchemaElement,
} from '@jsonforms/core'
import { DispatchRenderer, rendererProps, useJsonFormsLayout } from '@jsonforms/vue'
import { Card } from 'ant-design-vue'
import { defineComponent, h } from 'vue'

const buildLayoutStyles = (type: string | undefined, childCount: number) => {
  if (type === 'HorizontalLayout') {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.max(childCount, 1)}, minmax(0, 1fr))`,
      gap: '16px',
      alignItems: 'start',
    }
  }

  return {
    display: 'grid',
    gap: '16px',
  }
}

export const AntdvLayoutRenderer = defineComponent({
  name: 'AntdvLayoutRenderer',
  props: {
    ...rendererProps<Layout>(),
  },
  setup(props) {
    const { layout } = useJsonFormsLayout(props)

    return () => {
      const state = layout.value

      if (!state.visible) {
        return null
      }

      const elements = (state.uischema.elements ?? []) as UISchemaElement[]
      const children = elements.map((element, index) =>
        h(DispatchRenderer, {
          key: `${state.path}-${index}`,
          schema: state.schema,
          uischema: element,
          path: state.path,
          enabled: state.enabled,
          renderers: state.renderers,
          cells: state.cells,
          config: state.config,
        }),
      )

      if (state.uischema.type === 'Group') {
        return h(
          Card,
          {
            title: state.label || undefined,
            size: 'small',
            bordered: true,
          },
          {
            default: () =>
              h(
                'div',
                {
                  style: buildLayoutStyles('VerticalLayout', children.length),
                },
                children,
              ),
          },
        )
      }

      return h(
        'div',
        {
          style: buildLayoutStyles(state.uischema.type, children.length),
        },
        children,
      )
    }
  },
})

export const antdvLayoutRendererEntry: JsonFormsRendererRegistryEntry = {
  tester: rankWith(5, isLayout),
  renderer: AntdvLayoutRenderer,
}
