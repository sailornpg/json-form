# SchemaForm 业务接入指南

本文面向业务页面开发者，说明如何接入 `SchemaForm`，以及不同扩展入口分别适合处理什么问题。

## 基础接入

业务页面通常只需要准备四类内容：

1. `schema`：描述字段数据结构、类型、必填、枚举和基础校验。
2. `uischema`：描述字段布局、label、控件类型和展示配置。
3. `data`：当前表单数据。
4. 事件和方法：监听 `update:data`、`change`，需要提交时调用 `submit()`。

示例：

```vue
<SchemaForm
  ref="formRef"
  :data="formData"
  :schema="schema"
  :uischema="uischema"
  @update:data="formData = $event"
  @change="lastValidation = $event"
/>
```

## 配置职责

| 能力 | 推荐位置 | 说明 |
|---|---|---|
| 字段类型、必填、枚举、基础校验 | JSON Schema | 使用标准 JSON Schema |
| 字段布局、label、widget | UI Schema | 描述展示方式 |
| placeholder、description、disabled、visible、options | `runtime` | 字段运行时状态 |
| 组件专属参数 | `widgetProps` | 只传给当前 widget |
| 跨字段改值 | `effects` | 例如国家变化清空城市 |
| 业务校验 | `validators` | 例如组合规则、远程校验结果 |
| 复杂结构渲染 | `renderers` | 完全接管 JSON Forms renderer |

## 内置控件

普通字段优先使用内置控件。常见写法：

```ts
{
  type: 'Control',
  label: 'Contact Method',
  scope: '#/properties/contactMethod',
  options: {
    widget: 'radio',
  },
}
```

常用内置 widget 名称：

- `input`
- `textarea`
- `password`
- `number`
- `switch`
- `checkbox`
- `select`
- `radio`
- `multiSelect`
- `checkboxGroup`
- `date`
- `time`
- `dateTime`

## 自定义 Widget

当一个字段仍然是“单字段输入”，但 UI 或交互比较特殊时，用自定义 widget。

适合场景：

- 金额输入
- 用户选择器
- 部门选择器
- 弹窗上传
- 远程搜索输入框

不适合场景：

- 整个数组编辑器
- 嵌套对象子表单
- 大块复杂布局
- 需要完全接管 JSON Forms 渲染状态的控件

这些复杂场景应使用 `renderers`。

### 最小协议

自定义 widget 至少要理解：

- `value`：当前字段值。
- `disabled`：是否禁用。
- `placeholder`：占位提示。
- `update:value`：值变化时通知表单。
- `blur`：失焦或弹窗关闭时通知表单标记 touched。

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

<template>
  <input
    :value="value ?? ''"
    :disabled="disabled"
    :placeholder="placeholder"
    @input="emit('update:value', ($event.target as HTMLInputElement).value)"
    @blur="emit('blur')"
  >
</template>
```

### 注册 Widget

```ts
import { defineSchemaFormWidget, type SchemaFormWidgetMap } from '@json-form/form-kit'
import MoneyInput from './components/MoneyInput.vue'

const widgets: SchemaFormWidgetMap = {
  moneyInput: defineSchemaFormWidget(MoneyInput),
}
```

```vue
<SchemaForm
  :widgets="widgets"
  ...
/>
```

### 使用 Widget

```ts
{
  type: 'Control',
  label: 'Budget',
  scope: '#/properties/budget',
  options: {
    widget: 'moneyInput',
    runtime: {
      placeholder: '请输入预算',
    },
  },
}
```

## widgetProps

`widgetProps` 用于传递组件专属参数。框架只负责透传，不理解这些配置的业务含义。

上传组件示例：

```ts
const attachmentsControlOptions: SchemaFormControlOptions<{
  accept: string
  maxCount: number
  multiple: boolean
  buttonText: string
  modalTitle: string
}> = {
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
}
```

使用：

```ts
{
  type: 'Control',
  label: 'Attachments',
  scope: '#/properties/attachments',
  options: attachmentsControlOptions,
}
```

### widgetProps 的边界

适合放入 `widgetProps`：

- 按钮文案
- 弹窗标题
- 上传文件类型
- 最大数量
- 组件展示模式

不适合放入 `widgetProps`：

- 跨字段联动逻辑
- 业务校验逻辑
- 全局权限逻辑
- 表单提交逻辑

这些应分别放在 `effects`、`validators`、业务页面或后续 provider 机制中。

## runtime

`runtime` 用于描述框架通用字段状态。

```ts
{
  runtime: {
    visible: (ctx) => ctx.getValue('accountType') === 'business',
    disabled: (ctx) => !ctx.getValue('country'),
    required: (ctx) => ctx.getValue('accountType') === 'business',
    placeholder: '请输入公司名称',
    description: '企业账号需要填写公司名称',
  },
}
```

`runtime.options` 可用于静态或异步选项：

```ts
{
  runtime: {
    optionsDependencies: ['province'],
    options: async (ctx) => loadCities(ctx.getValue('province')),
  },
}
```

`optionsDependencies` 用来声明异步选项依赖哪些字段。没有声明时，框架会保守地认为它依赖整份表单数据，因此任意字段变化都可能重新加载选项。对于省市级联这类场景，应显式声明依赖，避免无关字段变化触发 loading。

## effects

`effects` 用于字段变化后的跨字段改值。

```ts
{
  effects: [
    ({ changedPath, clearValue }) => {
      if (changedPath === 'country') {
        clearValue('province')
        clearValue('city')
      }
    },
  ],
}
```

不要在 widget 组件内部直接修改其他字段。widget 只负责当前字段的输入 UI。

## validators

`validators` 用于业务校验。

```ts
const validators: SchemaFormValidator[] = [
  ({ data }) => {
    if (Array.isArray(data)) {
      return []
    }

    if (data.accountType === 'business' && !data.company) {
      return [{
        path: 'company',
        message: '企业账号必须填写公司名称。',
        source: 'custom',
      }]
    }

    return []
  },
]
```

## renderers

当 widget 不够用时，再使用 `renderers`。

适合使用 `renderers` 的情况：

- 完全自定义数组编辑体验。
- 完全自定义对象子表单。
- 自定义布局容器。
- 需要控制 JSON Forms renderer tester rank。

普通业务字段不建议优先使用 `renderers`，因为它比 widget 更接近底层 JSON Forms API。

## 推荐判断顺序

1. 标准文本、数字、日期、枚举、布尔字段：用内置控件。
2. 单字段特殊 UI：用自定义 widget。
3. 字段展示状态变化：用 `runtime`。
4. 字段变化后改其他字段：用 `effects`。
5. 业务规则校验：用 `validators`。
6. 复杂结构或完全接管渲染：用 `renderers`。
