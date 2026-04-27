# SchemaForm 校验与提交流程设计

Date: 2026-04-21

## 摘要

当前仓库已经通过 `@jsonforms/core + @jsonforms/vue` 获得了基于 JSON Schema 的基础校验能力，渲染层也已经能够消费字段级错误并展示在 `Ant Design Vue` 的 `Form.Item` 上。

但在项目自有封装层中，`SchemaForm` 仍缺少一套稳定、明确、可复用的表单校验 API。外部调用方目前只能感知数据变更，无法统一拿到 `valid/errors`，也没有显式的 `validate()` 与 `submit()` 能力，导致“默认阻止非法提交”和“业务侧自定义失败处理”都无法被一致实现。

本设计的目标是在不破坏现有分层的前提下，为 `packages/form-kit` 中的 `SchemaForm` 增加一套组件级校验与提交能力，并保持底层 runtime 仍由 JSON Forms 驱动。

## 目标

- 对外提供稳定的校验结果模型：`data`、`errors`、`valid`
- 提供显式实例方法：`validate()`、`submit()`、`resetValidation()`
- 默认支持“显示错误并阻止非法提交”
- 同时支持模板侧事件和命令式方法回调两种扩展方式
- 支持三类校验来源：
  - JSON Forms / AJV 内建 schema 校验
  - 自定义同步校验
  - 跨字段校验

## 非目标

- 第一版不支持异步校验
- 第一版不引入服务端远程错误映射机制
- 第一版不提供 `focusFirstError()` 之类依赖具体 DOM 结构的能力
- 第一版不改动 `engine-adapter` 的职责边界，不把提交语义下沉到底层

## 方案选择

本次采用“组件化表单方案”。

方案说明：

- `engine-adapter` 继续只负责桥接 `JsonForms`
- `renderer-antdv` 继续负责把字段状态映射到 `Form.Item`
- `form-kit` 的 `SchemaForm` 负责聚合校验结果、维护提交态与触碰态、暴露实例方法和业务事件

选择该方案的原因：

- 能在现有封装层上补齐缺失能力，不需要重构底层
- 能满足“默认阻止提交 + 可自定义处理”的业务诉求
- 对未来继续扩展异步校验、服务端错误回写仍有清晰演进空间

## 分层职责

### `packages/engine-adapter`

职责保持不变：

- 透传 `data`、`schema`、`uischema`
- 透传 JSON Forms 的 `change` 事件
- 不引入表单提交流程与业务校验编排

### `packages/renderer-antdv`

职责调整为：

- 继续读取字段级 `errors`、`required`、`enabled`
- 增加“错误是否可展示”的判断输入
- 只处理展示，不生成跨字段错误，不持有提交状态

### `packages/form-kit`

新增职责：

- 维护最近一次 runtime 校验结果
- 合并内建错误与自定义错误
- 维护 `submitted` 和 `touchedPaths`
- 暴露 `validate()`、`submit()`、`resetValidation()`
- 派发 `change`、`submit`、`invalid` 事件
- 为 renderers 提供“当前字段是否允许显示错误”的策略输入

## 对外 API 设计

### 组件 Props

在保留现有 props 的基础上，增加：

- `validators?: SchemaFormValidator[]`
  - 用于注册项目级同步校验器
- `validationDisplayMode?: 'touched' | 'submit' | 'always'`
  - 默认值为 `'touched'`
  - `'touched'` 表示字段在已触碰或表单已提交后显示错误
  - `'submit'` 表示仅在提交后显示错误
  - `'always'` 表示实时显示错误

### 组件事件

`SchemaForm` 对外统一使用结构化事件负载。

#### `change`

在任意数据变更后触发，负载为：

- `data`
- `errors`
- `valid`

说明：

- `change` 仍是持续通知通道
- `valid` 基于“内建错误 + 自定义错误”聚合后计算

#### `submit`

在显式调用 `submit()` 且校验通过后触发，负载为：

- `data`
- `errors`
- `valid`

#### `invalid`

在显式调用 `submit()` 或 `validate()` 进入失败分支时触发，负载为：

- `data`
- `errors`
- `valid`

### 组件实例方法

`SchemaForm` 通过 `ref` 暴露以下方法：

#### `validate(options?)`

触发表单级全量校验，返回：

```ts
type SchemaFormValidationResult = {
  data: Record<string, unknown> | unknown[]
  errors: SchemaFormError[]
  valid: boolean
}
```

行为约束：

- 会执行内建校验与全部自定义校验器
- 会根据当前策略切换到“可展示错误”状态
- 校验失败时触发 `invalid`

#### `submit(options?)`

先执行 `validate()`，再根据结果决定是否进入提交成功分支。

行为约束：

- 校验失败时必须阻止成功提交
- 校验失败时必须触发 `invalid`
- 校验成功时必须触发 `submit`
- 返回值与 `validate()` 相同，便于业务侧统一处理

#### `resetValidation()`

重置表单展示态，但不重置数据。

行为约束：

- 清空 `submitted`
- 清空 `touchedPaths`
- 不改动业务数据

### 方法级回调

方法调用时允许传入一次性回调，而不是长期挂在组件 props 上。

```ts
type ValidateOptions = {
  onInvalid?: (result: SchemaFormValidationResult) => void
}

type SubmitOptions = {
  onInvalid?: (result: SchemaFormValidationResult) => void
  onSubmit?: (result: SchemaFormValidationResult) => void
}
```

设计原则：

- 模板侧长期订阅使用事件
- 命令式调用的单次扩展使用方法级回调
- 避免 `emit` 和 props 回调在语义上完全重复

## 校验模型设计

### 错误结构

统一错误结构：

```ts
type SchemaFormError = {
  path: string
  message: string
  source: 'schema' | 'custom'
}
```

说明：

- `path` 使用字段路径表达错误归属
- `source` 用于区分 JSON Schema 内建错误与项目自定义错误
- 第一版仅处理字段路径错误，暂不单独抽象表单级错误类型

### 自定义校验器

第一版使用同步校验器数组：

```ts
type SchemaFormValidator = (context: {
  data: Record<string, unknown> | unknown[]
  schema: JsonSchema
  uischema?: UISchemaElement
}) => SchemaFormError[]
```

使用规则：

- 所有校验器按顺序执行
- 任一校验器抛错不应导致整个表单崩溃
- 校验器异常应在开发期暴露可诊断信息，并降级为安全失败

### 校验顺序

第一版校验顺序固定为：

1. JSON Forms / AJV 内建 schema 校验
2. 自定义同步校验
3. 跨字段校验

说明：

- 跨字段校验仍通过 `validators` 实现，只是业务语义上单独强调
- 最终错误列表按上述顺序合并

## 状态流与交互设计

### 内部状态

`SchemaForm` 内部维护以下状态：

- `lastChangeEvent`
  - 保存最近一次 JSON Forms 发出的变更结果
- `submitted`
  - 标记是否进入过提交流程
- `touchedPaths`
  - 记录已经交互过的字段路径

### 触碰与展示策略

系统始终计算完整校验结果，但错误是否显示由展示策略决定。

默认策略为 `touched`：

- 字段被编辑后，将该字段路径加入 `touchedPaths`
- 只有字段已触碰或表单已提交时，字段错误才在 UI 上展示

其他策略：

- `submit`: 只有 `submitted = true` 后展示错误
- `always`: 始终展示错误

### 提交流程

提交流程如下：

1. 业务侧通过 `formRef.submit()` 触发提交
2. 组件进入全量校验
3. 若存在错误：
   - 设置 `submitted = true`
   - 触发 `invalid`
   - 执行 `onInvalid`
   - 返回 `{ valid: false, data, errors }`
   - 不触发成功提交事件
4. 若无错误：
   - 触发 `submit`
   - 执行 `onSubmit`
   - 返回 `{ valid: true, data, errors: [] }`

## 渲染层落地要求

`renderer-antdv` 在第一版需要满足：

- 继续使用 `Form.Item` 的 `help` 与 `validateStatus`
- 根据“当前字段是否允许显示错误”的状态决定是否展示 `state.errors`
- 在字段值变化时，把路径回传给上层以便记录 `touchedPaths`

约束：

- renderer 不直接调用 `submit()`
- renderer 不维护表单级校验结果
- renderer 不负责跨字段错误分发

## 兼容性要求

- 现有 `@update:data` 用法必须保持可用
- 未传 `validators` 时，组件行为应退化为“仅内建 schema 校验”
- 不破坏当前 demo 中已存在的字段渲染逻辑
- 旧调用方即使不使用实例方法，也能通过增强后的 `change` 事件拿到 `valid/errors`

## 错误处理原则

- 校验失败属于业务失败，不属于运行时异常
- 运行时异常只应来自代码错误或不可恢复状态
- `submit()` 和 `validate()` 在校验失败时返回结果，不抛异常
- 自定义校验器内部的异常需要被保护，避免整个表单渲染链路中断

## 验证策略

当前仓库没有测试框架，第一版至少需要以下验证手段：

- `npm run build` 通过
- demo 中验证必填项错误展示
- demo 中验证提交失败会阻止成功事件
- demo 中验证自定义同步校验与跨字段校验生效
- demo 中验证 `resetValidation()` 可以清空错误展示态

## 验收标准

本设计实现完成后，应满足以下条件：

- `SchemaForm` 能稳定对外暴露 `data/errors/valid`
- `SchemaForm` 提供 `validate()`、`submit()`、`resetValidation()`
- 非法表单提交会被阻止
- 非法提交时会有可见错误提示
- 模板事件和方法级回调都可用于自定义处理
- 能注册同步自定义校验器
- 能支持至少一个跨字段校验示例
- 现有 demo 能直观看到校验与提交流程行为

## 实施说明

实现阶段建议按以下顺序推进：

1. 在 `form-kit` 中定义统一类型与实例方法
2. 扩展 `change` 事件负载并聚合错误结果
3. 增加 `submitted`、`touchedPaths` 与展示策略
4. 让 `renderer-antdv` 根据展示策略控制错误渲染
5. 在 demo 中接入 `submit()`、`invalid`、自定义校验器示例

下一步应进入具体实现，而不是继续修改底层技术选型。
