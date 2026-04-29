<script setup lang="ts">
defineProps<{
  value?: string | number
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:value': [value: string]
  blur: []
}>()

const handleInput = (event: Event) => {
  emit('update:value', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="money-widget">
    <span class="money-widget__prefix">$</span>
    <input
      :value="value ?? ''"
      :disabled="disabled"
      :placeholder="placeholder"
      @input="handleInput"
      @blur="emit('blur')"
    >
  </div>
</template>

<style scoped>
.money-widget {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.money-widget:focus-within {
  border-color: #4096ff;
  box-shadow: 0 0 0 2px rgba(5, 145, 255, 0.1);
}

.money-widget__prefix {
  flex: 0 0 auto;
  padding: 0 10px;
  color: #64748b;
  border-right: 1px solid #e2e8f0;
}

.money-widget input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 4px 11px;
  color: #1f2937;
  background: transparent;
}
</style>
