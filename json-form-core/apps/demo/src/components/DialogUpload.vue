<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button, Modal, Upload, type UploadFile } from 'ant-design-vue'

type UploadedFileValue = {
  name: string
  size?: number
  type?: string
}

const props = defineProps<{
  value?: UploadedFileValue[]
  disabled?: boolean
  placeholder?: string
  accept?: string
  maxCount?: number
  multiple?: boolean
  buttonText?: string
  modalTitle?: string
}>()

const emit = defineEmits<{
  'update:value': [value: UploadedFileValue[]]
  blur: []
}>()

const open = ref(false)

const fileList = computed<UploadFile[]>(() =>
  (props.value ?? []).map((file, index) => ({
    uid: `${index}-${file.name}`,
    name: file.name,
    size: file.size,
    type: file.type,
    status: 'done',
  })),
)

const summary = computed(() => {
  const files = props.value ?? []

  if (files.length === 0) {
    return props.placeholder ?? 'No files selected'
  }

  return files.map((file) => file.name).join(', ')
})

const canSelectMore = computed(() => {
  if (props.maxCount === undefined) {
    return true
  }

  return (props.value ?? []).length < props.maxCount
})

const openDialog = () => {
  if (props.disabled) {
    return
  }

  open.value = true
}

const closeDialog = () => {
  open.value = false
  emit('blur')
}

const normalizeFiles = (files: UploadFile[]): UploadedFileValue[] => {
  const limitedFiles = props.maxCount === undefined ? files : files.slice(0, props.maxCount)

  return limitedFiles.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
  }))
}

const handleChange = ({ fileList: nextFileList }: { fileList: UploadFile[] }) => {
  emit('update:value', normalizeFiles(nextFileList))
}

const handleRemove = (file: UploadFile) => {
  emit('update:value', normalizeFiles(fileList.value.filter((item) => item.uid !== file.uid)))
}
</script>

<template>
  <div class="dialog-upload">
    <Button :disabled="disabled" @click="openDialog">{{ buttonText ?? 'Select files' }}</Button>
    <span class="dialog-upload__summary">{{ summary }}</span>

    <Modal
      v-model:open="open"
      :title="modalTitle ?? 'Upload files'"
      :footer="null"
      @cancel="closeDialog"
    >
      <Upload
        :file-list="fileList"
        :multiple="multiple ?? true"
        :accept="accept"
        :max-count="maxCount"
        :before-upload="() => false"
        @change="handleChange"
        @remove="handleRemove"
      >
        <Button :disabled="!canSelectMore">{{ buttonText ?? 'Select local files' }}</Button>
      </Upload>
    </Modal>
  </div>
</template>

<style scoped>
.dialog-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.dialog-upload__summary {
  min-width: 0;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
