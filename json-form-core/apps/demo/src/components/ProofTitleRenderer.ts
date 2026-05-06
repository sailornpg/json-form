import {
  isControl,
  type RankedTester,
  type ControlElement,
  type JsonFormsRendererRegistryEntry,
} from '@jsonforms/core'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { defineComponent, h } from 'vue'

const isProofOverrideControl = (uischema: unknown) => {
  if (!uischema || typeof uischema !== 'object') {
    return false
  }

  const options = (uischema as { options?: unknown }).options
  if (!options || typeof options !== 'object') {
    return false
  }

  return (options as { proofOverride?: unknown }).proofOverride === true
}

export const ProofTitleRenderer = defineComponent({
  name: 'ProofTitleRenderer',
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props) {
    const { control, handleChange } = useJsonFormsControl(props)

    return () => {
      const state = control.value

      if (!state.visible) {
        return null
      }

      return h('div', { class: 'proof-renderer' }, [
        h('div', { class: 'proof-renderer__badge' }, 'Direct override renderer'),
        h('label', { class: 'proof-renderer__label' }, state.label || 'Proof Title'),
        h('input', {
          class: 'proof-renderer__input',
          value: (state.data as string | undefined) ?? '',
          disabled: !state.enabled,
          placeholder: 'This field is rendered by a direct override renderer',
          onInput: (event: Event) => {
            const nextValue = (event.target as HTMLInputElement).value
            handleChange(state.path, nextValue)
          },
        }),
        h(
          'p',
          { class: 'proof-renderer__hint' },
          'Preset 仍负责其他字段，这个字段由 direct renderers 局部覆盖。',
        ),
      ])
    }
  },
})

const proofTitleTester: RankedTester = (uischema, _schema, _context) =>
  isControl(uischema) && isProofOverrideControl(uischema) ? 1000 : -1

export const proofTitleRendererEntry: JsonFormsRendererRegistryEntry = {
  tester: proofTitleTester,
  renderer: ProofTitleRenderer,
}
