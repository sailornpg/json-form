# @sailornpg/renderer-antdv

`@sailornpg/renderer-antdv` 提供当前仓库的一等 Ant Design Vue renderer adapter。

## 安装

```bash
npm install @sailornpg/renderer-antdv @sailornpg/form-kit vue ant-design-vue
```

## 用法

```ts
import { antdvPreset } from '@sailornpg/renderer-antdv'
```

```vue
<SchemaForm
  :data="formData"
  :schema="schema"
  :uischema="uischema"
  :renderer-preset="antdvPreset"
/>
```

## 导出内容

- `antdvPreset`
- `antdvRenderers`
- `antdvCells`

普通业务页面推荐优先使用 `antdvPreset`，而不是手动拼装 renderer registry。
