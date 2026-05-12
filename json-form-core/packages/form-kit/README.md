# @sailornpg/form-kit

`@sailornpg/form-kit` 是当前仓库面向业务接入方的主入口。

它提供：

- `SchemaForm`
- 表单校验与提交事件
- `widgets`
- `validators`
- `fieldResolvers`
- `effects`
- `rendererPreset` 接入能力

## 安装

```bash
npm install @sailornpg/form-kit @sailornpg/renderer-antdv vue ant-design-vue
```

## 推荐接法

```vue
<script setup lang="ts">
import { SchemaForm } from '@sailornpg/form-kit'
import { antdvPreset } from '@sailornpg/renderer-antdv'
</script>

<template>
  <SchemaForm
    :data="formData"
    :schema="schema"
    :uischema="uischema"
    :renderer-preset="antdvPreset"
  />
</template>
```

## 说明

当前版本仍以内置的 Ant Design Vue renderer 作为默认消费路径，因此推荐与 `@sailornpg/renderer-antdv` 搭配使用。
