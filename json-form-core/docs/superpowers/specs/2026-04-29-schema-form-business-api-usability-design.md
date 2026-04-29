# SchemaForm 业务接入体验改进设计

日期：2026-04-29

## 摘要

当前 `SchemaForm` 已经具备基础表单渲染、动态字段状态、异步选项、effects、validators、内置基础控件和自定义 widget 扩展能力。业务方现在可以通过 `widgets + uischema.options.widget` 接入 `.vue` 自定义表单项，也可以继续通过 `renderers` 深度覆盖 JSON Forms renderer。

但从业务接入体验看，现有 API 仍偏工程化：`schema` 与 `uischema` 需要双写，`uischema.options` 中的 widget 字符串和组件专属配置缺少强类型保护，自定义 widget 的 props/emits 契约虽然有类型定义但实际使用仍靠约定，业务方不容易判断 `runtime`、`effects`、`widgets`、`renderers` 各自该承担什么职责。

本设计聚焦第一阶段改进：不重构表单核心，不引入新的 schema DSL，而是在现有架构上补齐 widget 类型化、组件专属配置入口和业务接入文档，让业务方能更稳定地使用自定义表单项。

## 目标

- 提供 `defineSchemaFormWidget()` 帮助函数，让业务方定义自定义 widget 时获得更明确的类型提示。
- 扩展 `SchemaFormControlOptions`，新增 `widgetProps`，作为自定义 widget 的组件专属配置入口。
- 将 `widgetProps` 从 UI Schema 透传给自定义 widget。
- 保持现有 `runtime`、`effects`、`fieldResolvers`、`validators` 和 `renderers` 行为不变。
- 更新 demo 中的自定义上传 widget，让它读取 `widgetProps`，展示真实业务组件如何声明和消费配置。
- 新增业务接入指南，说明普通字段、自定义 widget、renderer override、runtime、effects、validators 的适用边界。

## 非目标

- 本阶段不实现字段配置 builder 或 schema factory。
- 本阶段不改变 JSON Schema + UI Schema 的公共表单描述协议。
- 本阶段不新增日期时间 `valueFormat` 设计。
- 本阶段不实现 async options 的 `dependencies/cacheKey`。
- 本阶段不改造提交 API，例如 `onSubmit` 高层封装或内置提交按钮。
- 本阶段不引入新的 UI 库或多 UI 渲染器。

这些能力可以作为第二阶段继续设计。

## 当前问题

### 1. 自定义 widget 契约偏“口头约定”

当前已经有 `SchemaFormWidgetProps` 类型，但为了兼容 `.vue` 组件，`SchemaFormWidgetComponent` 实际较宽松。业务方可以写出能运行的组件，但 TypeScript 不会主动提醒它应该接收哪些 props、应该 emit 哪些事件。

这会带来两个问题：

- 业务组件不知道最小必要协议是 `value`、`update:value` 和 `blur`。
- 组件作者容易把跨字段联动、远程选项、校验等逻辑塞进 widget 内部。

### 2. 组件专属配置没有标准位置

例如上传 widget 往往需要：

- `accept`
- `multiple`
- `maxCount`
- `buttonText`
- `modalTitle`

当前可以把这些配置塞进 `uischema.options`，但没有明确字段，也没有类型提示。长期会导致 `options` 成为混杂容器，难以维护。

### 3. `runtime` 与 `widget` 配置边界不够清晰

`runtime` 适合描述框架层通用字段状态，例如：

- `visible`
- `disabled`
- `required`
- `placeholder`
- `description`
- `options`

但组件专属配置不应该放进 `runtime`。例如上传的 `accept` 和 `maxCount` 不是字段运行时状态，而是上传组件自身配置。

### 4. 业务方缺少推荐接入路径

当前能力分散在代码和 demo 中，业务方需要自己推断：

- 普通控件用内置 widget。
- 特殊单字段用自定义 widget。
- 复杂结构用 JSON Forms renderer。
- 动态展示用 runtime。
- 跨字段改值用 effects。
- 校验用 validators 或 JSON Schema。

这些边界需要文档化，否则后续表单会出现多种写法并存。

## 设计方案

### 1. 新增 `defineSchemaFormWidget()`

在 `packages/form-kit` 中新增一个帮助函数：

```ts
export const defineSchemaFormWidget = <TProps extends Record<string, unknown> = {}>(
  component: SchemaFormWidgetComponent<TProps>,
) => component
```

概念上，widget 组件接收两类 props：

1. 框架通用 props：由 `SchemaForm` 统一注入。
2. 组件专属 props：由 `uischema.options.widgetProps` 提供。

建议类型形态：

```ts
type SchemaFormWidgetBaseProps = {
  value: unknown
  path: string
  label?: string
  disabled: boolean
  required: boolean
  placeholder?: string
  description?: string
  options?: SchemaFormOption[]
  loading?: boolean
  error?: string
  schema: JsonSchema
  uischema: UISchemaElement
}

type SchemaFormWidgetEmits = {
  'update:value': [value: unknown]
  blur: []
}
```

`.vue` 组件仍然可以直接导出普通组件；`defineSchemaFormWidget()` 是推荐增强入口，不强制所有业务组件使用。

### 2. 新增 `widgetProps`

扩展 `SchemaFormControlOptions`：

```ts
export type SchemaFormControlOptions<TWidgetProps extends Record<string, unknown> = Record<string, unknown>> = {
  widget?: string
  widgetProps?: TWidgetProps
  runtime?: Partial<SchemaFormFieldRuntime>
  effects?: SchemaFormEffect[]
}
```

使用示例：

```ts
const uploadOptions: SchemaFormControlOptions<{
  accept: string
  maxCount: number
  buttonText: string
  modalTitle: string
}> = {
  widget: 'dialogUpload',
  widgetProps: {
    accept: '.png,.jpg,.pdf',
    maxCount: 3,
    buttonText: '选择附件',
    modalTitle: '上传附件',
  },
  runtime: {
    placeholder: '请选择附件',
  },
}
```

`widgetProps` 的语义：

- 只用于当前 widget 组件。
- 不参与框架通用字段状态计算。
- 不触发 effects。
- 不用于校验。
- renderer 只负责透传，不理解具体含义。

### 3. renderer 透传规则

`AntdvControlRenderer` 渲染自定义 widget 时，除当前已有通用 props 外，继续透传 `widgetProps`：

```ts
h(customWidget, {
  value,
  path,
  label,
  disabled,
  required,
  placeholder,
  description,
  options,
  loading,
  error,
  schema,
  uischema,
  ...(widgetProps ?? {}),
  'onUpdate:value': handleWidgetValueUpdate,
  onBlur: markTouched,
})
```

合并优先级：

1. 框架通用 props 优先保留。
2. `widgetProps` 不允许覆盖 `value`、`path`、`schema`、`uischema`、`disabled`、`required`、`options`、`loading`、`error`、`onUpdate:value`、`onBlur` 等框架关键 props。
3. 如果实现上使用对象展开，应先展开 `widgetProps`，再覆盖框架关键 props。

推荐实现：

```ts
h(customWidget, {
  ...(widgetProps ?? {}),
  value,
  path,
  disabled,
  required,
  schema,
  uischema,
  'onUpdate:value': handleWidgetValueUpdate,
  onBlur: markTouched,
})
```

这样业务配置不能破坏表单数据流。

### 4. 上传 widget demo 改造

现有 `DialogUpload.vue` 作为示例 widget，增加以下 props：

```ts
type DialogUploadWidgetProps = {
  value?: UploadedFileValue[]
  disabled?: boolean
  placeholder?: string
  accept?: string
  maxCount?: number
  multiple?: boolean
  buttonText?: string
  modalTitle?: string
}
```

UI Schema 中配置：

```ts
{
  type: 'Control',
  label: 'Attachments',
  scope: '#/properties/attachments',
  options: {
    widget: 'dialogUpload',
    widgetProps: {
      accept: '.png,.jpg,.pdf',
      maxCount: 3,
      multiple: true,
      buttonText: '选择附件',
      modalTitle: '上传附件',
    },
    runtime: {
      placeholder: '请选择附件',
    },
  },
}
```

选择文件后仍写回稳定表单值：

```ts
type UploadedFileValue = {
  name: string
  size?: number
  type?: string
}
```

本 demo 不执行真实上传；真实上传应由业务 widget 内部处理，并在成功后通过 `update:value` 写回业务需要的文件对象。

## 业务接入指南

新增文档建议路径：

```text
docs/schema-form-business-usage.md
```

文档内容覆盖：

### 基础接入

- 如何准备 `schema`
- 如何准备 `uischema`
- 如何绑定 `data`
- 如何监听 `update:data`、`change`、`submit`、`invalid`

### 字段配置职责

| 能力 | 推荐位置 | 说明 |
|---|---|---|
| 字段类型、必填、枚举、基础校验 | JSON Schema | 使用标准 JSON Schema |
| 字段布局、label、widget | UI Schema | 描述展示方式 |
| placeholder、description、disabled、visible、options | `runtime` | 字段运行时状态 |
| 组件专属参数 | `widgetProps` | 只传给当前 widget |
| 跨字段改值 | `effects` | 例如国家变化清空城市 |
| 业务校验 | `validators` | 例如组合规则、远程校验结果 |
| 复杂结构渲染 | `renderers` | 完全接管 JSON Forms renderer |

### 自定义 widget 最小协议

示例：

```vue
<script setup lang="ts">
defineProps<{
  value?: string
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:value': [value: string]
  blur: []
}>()
</script>
```

### 什么时候不用 widget

- 只是要显隐字段：用 `runtime.visible` 或 JSON Forms rule。
- 只是要禁用字段：用 `runtime.disabled` 或 JSON Forms rule。
- 字段变化要清空其他字段：用 `effects`。
- 要改变整体布局或数组对象编辑器：用 `renderers`。

## 兼容性

- 现有 `uischema.options.widget` 行为不变。
- 没有 `widgetProps` 的字段行为不变。
- 已有自定义 widget 不需要强制修改。
- `defineSchemaFormWidget()` 是新增推荐 API，不是破坏性迁移。
- `renderers` 深度扩展能力继续保留。

## 验证策略

最低验证：

- `npm run build`
- demo 页面能正常渲染
- `moneyInput` 自定义 widget 仍可写回值
- `dialogUpload` 能从 `widgetProps` 读取按钮文案、弹窗标题、文件数量限制和 accept
- 控制台无 error/warn

如果后续引入测试框架，优先覆盖：

- `widgetProps` 不覆盖框架关键 props。
- 自定义 widget `update:value` 仍触发 touched 和 `handleChange`。
- 没有 `widgetProps` 时保持兼容。
- `SchemaFormControlOptions<TWidgetProps>` 类型能为业务配置提供提示。

## 验收标准

- `SchemaFormControlOptions` 支持泛型 `widgetProps`。
- `AntdvControlRenderer` 渲染自定义 widget 时透传 `widgetProps`。
- `defineSchemaFormWidget()` 从 `form-kit` 导出。
- demo 上传组件通过 `widgetProps` 配置 `accept/maxCount/multiple/buttonText/modalTitle`。
- 新增业务接入文档，说明各扩展入口职责。
- `npm run build` 通过。

## 风险与缓解

### `widgetProps` 变成业务杂物箱

风险：业务方可能把跨字段逻辑、校验规则、远程服务配置都塞进 `widgetProps`。

缓解：文档明确 `widgetProps` 只用于当前 widget 的展示和交互参数；联动和校验仍走 `effects`、`validators`。

### 类型增强影响 `.vue` 组件使用

风险：过强的 `Component<Props>` 类型会让普通 `.vue` 组件难以赋值给 `SchemaFormWidgetMap`。

缓解：`SchemaFormWidgetComponent` 仍保持兼容宽松，`defineSchemaFormWidget()` 作为推荐增强，不作为强制约束。

### 配置合并覆盖关键 props

风险：业务方在 `widgetProps` 中传入 `value` 或 `disabled`，导致框架状态被覆盖。

缓解：renderer 合并 props 时框架关键 props 后置，保证表单数据流和状态控制权不被覆盖。

## 实施顺序建议

1. 在 `form-kit` 类型中扩展 `SchemaFormControlOptions<TWidgetProps>`。
2. 新增并导出 `defineSchemaFormWidget()`。
3. 在 `renderer-antdv` 读取 `uischema.options.widgetProps`，渲染自定义 widget 时透传。
4. 更新 `DialogUpload.vue` props，消费 `accept/maxCount/multiple/buttonText/modalTitle`。
5. 更新 demo 的 `dialogUpload` UI Schema 配置。
6. 新增 `docs/schema-form-business-usage.md`。
7. 运行 `npm run build` 并手动验证 demo。

下一步应先由用户审核本 spec，再进入具体实施计划。
