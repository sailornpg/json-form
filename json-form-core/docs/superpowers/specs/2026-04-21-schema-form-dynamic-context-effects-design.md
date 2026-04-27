# SchemaForm 动态上下文、联动副作用与异步选项设计

Date: 2026-04-21

## 摘要

当前仓库已经具备以下基础能力：

- 基于 `JSON Forms + AJV` 的 schema 校验
- `SchemaForm` 级别的 `validate()`、`submit()`、`resetValidation()`
- 自定义同步校验器与跨字段校验
- 字段级错误展示策略控制

但在更高一层的业务交互上，仍缺少以下能力：

- 字段配置无法基于整个表单上下文动态计算
- 字段联动只能依赖上层手写逻辑，库内没有统一副作用模型
- 下拉选项只能依赖静态 `schema.enum`，没有异步数据源机制

本设计的目标是在不让业务方直接使用 `watch` 的前提下，为 `SchemaForm` 增加三类能力：

1. 基于统一表单上下文的动态字段配置
2. 基于字段变更的联动副作用 `effects`
3. 基于上下文的同步/异步选项解析

## 目标

- 支持字段根据表单上下文动态计算 `visible`、`disabled`、`required`、`placeholder`、`description`
- 支持字段根据表单上下文动态计算 `options`
- 支持字段变更后触发联动副作用，如清空值、设置默认值、批量重置
- 同时支持字段级配置入口和 `SchemaForm` 级全局入口
- 明确字段级优先、全局级兜底的覆盖规则
- 明确动态配置与副作用的职责边界，避免渲染期副作用

## 非目标

- 第一版不支持任意自定义组件 props 的动态推导
- 第一版不支持 effect 内部发起复杂异步事务编排
- 第一版不支持远程错误映射与服务端联动校验
- 第一版不引入新的 DSL，不创造额外配置语言

## 核心设计原则

### 1. 业务方不直接写 `watch`

响应式更新机制由库内部接管，对外暴露声明式配置与 effect 模型。

### 2. 动态配置只读

所有字段动态配置回调只能读取上下文并返回派生值，不能直接修改表单数据。

### 3. 副作用单独建模

所有联动改值行为都只能通过 `effects` 执行，不能夹带在字段动态配置回调中。

### 4. 字段级优先，全局级兜底

同一字段同时存在字段级与全局级动态配置时，字段级配置优先。

## 方案选择

本次采用“双入口 + 单上下文 + 独立 effect”的方案。

### 双入口

动态配置支持两个入口：

- 字段级：定义在 `uischema.options`
- 全局级：定义在 `SchemaForm` props

### 单上下文

所有动态配置回调与 effect 都基于统一的 `formContext`

### 独立 effect

动态配置负责“当前应该怎么显示和计算”，effect 负责“变更后要不要联动改值”

选择该方案的原因：

- 满足局部声明与全局复用两种使用习惯
- 能避免“渲染时顺手改状态”导致的不可预测行为
- 为后续扩展异步数据源、远程联动、复杂条件规则保留清晰边界

## 分层职责

### `packages/form-kit`

新增职责：

- 构造统一的 `formContext`
- 聚合字段级与全局级动态配置
- 解析动态字段属性并透传到 renderer
- 管理 effect 执行时机
- 管理异步选项的缓存、加载、错误与失效值清理

### `packages/renderer-antdv`

新增职责：

- 消费 `form-kit` 解析后的字段运行时配置
- 展示动态 `placeholder`、`description`、`required`
- 展示异步选项的 loading / error / empty 状态

约束：

- renderer 不直接发起业务请求
- renderer 不直接执行 effect

### `packages/engine-adapter`

职责不变：

- 继续作为 JSON Forms runtime bridge
- 不承载项目级联动编排与异步选项管理

## 表单上下文设计

所有动态配置回调与 effect 都拿到统一的 `formContext`。

```ts
type SchemaFormContext = {
  data: SchemaFormData
  schema: JsonSchema
  uischema?: UISchemaElement
  errors: SchemaFormError[]
  valid: boolean
  submitted: boolean
  touchedPaths: string[]
  getValue: (path: string) => unknown
}
```

说明：

- `data` 提供完整数据快照
- `getValue(path)` 提供路径级访问能力
- `errors/valid` 允许动态配置感知当前校验状态
- `submitted/touchedPaths` 允许配置根据交互阶段决定展示行为

## 动态字段配置设计

### 字段级入口

字段级动态配置放在 `uischema.options.runtime`

```ts
type SchemaFormFieldRuntime = {
  visible?: boolean | ((ctx: SchemaFormContext) => boolean)
  disabled?: boolean | ((ctx: SchemaFormContext) => boolean)
  required?: boolean | ((ctx: SchemaFormContext) => boolean)
  placeholder?: string | ((ctx: SchemaFormContext) => string | undefined)
  description?: string | ((ctx: SchemaFormContext) => string | undefined)
  options?:
    | SchemaFormOption[]
    | ((ctx: SchemaFormContext) => SchemaFormOption[] | Promise<SchemaFormOption[]>)
}
```

示例：

```ts
{
  type: 'Control',
  scope: '#/properties/city',
  options: {
    runtime: {
      visible: (ctx) => ctx.getValue('country') === 'CN',
      disabled: (ctx) => !ctx.getValue('province'),
      required: (ctx) => ctx.getValue('subscribed') === true,
      options: async (ctx) => fetchCities(ctx.getValue('province')),
    },
  },
}
```

### 全局级入口

`SchemaForm` 新增 `fieldResolvers` prop：

```ts
type SchemaFormFieldResolver = (
  args: {
    path: string
    schema: JsonSchema
    uischema: UISchemaElement
    context: SchemaFormContext
  },
) => Partial<SchemaFormFieldRuntime> | void
```

使用方式：

- 适合在一个地方统一管理多个字段的动态行为
- 适合跨页面共享字段策略

### 覆盖规则

同一字段动态配置的合并顺序为：

1. 静态基础配置
2. 全局 `fieldResolvers`
3. 字段级 `uischema.options.runtime`

即：

- 全局级是兜底
- 字段级覆盖全局级

### 动态配置的职责边界

动态配置回调只能做以下事情：

- 读取表单上下文
- 计算并返回派生属性

禁止行为：

- 直接调用 `setValue`
- 直接清空或修改其他字段
- 在回调内部做与渲染无关的副作用

## 联动副作用设计

### effect 上下文

联动副作用使用独立上下文：

```ts
type SchemaFormEffectContext = SchemaFormContext & {
  changedPath: string
  setValue: (path: string, value: unknown) => void
  clearValue: (path: string) => void
}
```

### effect 入口

同时支持两个入口：

- 全局 `effects` prop
- 字段级 `uischema.options.effects`

类型定义：

```ts
type SchemaFormEffect = (
  context: SchemaFormEffectContext,
) => void | Promise<void>
```

### effect 使用场景

- 省份变化后清空城市
- 类型变化后重置明细字段
- 开关勾选后补默认值
- 某字段变化后同步计算另一个字段

### effect 执行时机

effect 只在字段值变更后执行，不在渲染期执行。

执行流程：

1. 某字段触发 `handleChange`
2. 表单拿到 `changedPath`
3. 更新当前字段值
4. 运行全局与字段级 effect
5. 若 effect 修改了其他字段，则统一产生新的表单数据快照
6. 再进入校验与事件派发流程

### effect 执行顺序

第一版执行顺序为：

1. 全局 `effects`
2. 当前字段对应的字段级 `effects`

原因：

- 先让全局规则做通用处理
- 字段级规则作为局部补充或覆盖

### effect 限制

- effect 允许改值，但不允许直接操作 UI 状态
- effect 抛错不应导致整个表单崩溃
- effect 异常应记录开发期诊断信息，并降级为安全失败

## 异步选项设计

### 选项结构

```ts
type SchemaFormOption = {
  label: string
  value: unknown
  disabled?: boolean
}
```

### 入口

异步选项既可在字段级定义，也可由全局 resolver 返回，统一通过 `options` 属性承载。

支持三种形式：

- 静态数组
- 同步回调
- 异步回调

### 内部状态

`form-kit` 需要为每个动态选项字段维护运行时状态：

- `loading`
- `options`
- `error`
- `requestId`

### 运行规则

当 `options(ctx)` 依赖的上下文变化后，库内部重新计算。

若返回 Promise，则：

1. 进入 loading 状态
2. 记录请求序号
3. 请求完成后仅接收最新结果
4. 若旧请求晚于新请求返回，则丢弃旧结果

### 失效值清理

当选项集更新后，若当前字段值已不在可选项中，则默认清空该字段值。

理由：

- 保证数据与当前可选项一致
- 避免保留不可见的脏值

### 错误处理

异步选项拉取失败时：

- renderer 展示受控的错误或空态
- 表单不因此整体崩溃
- 当前字段保留现有值，除非业务另有清理规则

## 运行时数据流

动态上下文与异步选项加入后的运行时流程如下：

1. `SchemaForm` 根据当前数据构造 `formContext`
2. 对每个字段解析动态配置：
   - 先应用全局 `fieldResolvers`
   - 再应用字段级 `runtime`
3. 将解析后的字段配置透传给 renderer
4. 字段变更时：
   - 更新当前字段值
   - 运行全局与字段级 effect
   - 更新表单数据快照
   - 重新计算校验结果
   - 触发 `change`
5. 若字段存在动态 `options`：
   - 基于最新 `formContext` 重新解析选项
   - 处理 loading / error / 过期请求 / 失效值清理

## 兼容性要求

- 现有基于 `schema.enum` 的静态下拉必须保持可用
- 现有校验与提交 API 不得被破坏
- 未传入任何 `fieldResolvers` / `effects` / `runtime` 时，组件行为应与当前一致
- JSON Forms 原生 `rule` 继续保留并优先作为显隐/禁用的标准能力

## 与现有 `rule` 的关系

本设计不替代 JSON Forms 原生 `rule`。

建议职责划分：

- `rule`：标准显隐/禁用控制
- 动态配置回调：动态 `required`、`placeholder`、`description`、`options`
- `effects`：改值、副作用、联动重置

这样可以避免把所有条件逻辑都挤进一个机制中。

## 验证策略

当前仓库没有测试框架，第一版至少需要以下验证手段：

- `npm run build` 通过
- demo 中验证字段根据上下文动态显示和禁用
- demo 中验证动态 `required`、`placeholder`、`description`
- demo 中验证 effect 可清空依赖字段
- demo 中验证异步下拉 loading / 成功 / 失败状态
- demo 中验证选项更新后失效值被清空

## 验收标准

实现完成后，应满足以下条件：

- `SchemaForm` 支持全局 `fieldResolvers`
- 字段可通过 `uischema.options.runtime` 声明动态配置
- `SchemaForm` 支持全局 `effects`
- 字段可通过 `uischema.options.effects` 声明局部联动
- 字段级动态配置覆盖全局级动态配置
- 异步 `options(ctx)` 可正常工作，并具备 loading / error / 过期请求保护
- 当前值失效时会自动清空
- demo 能直观看到条件联动与异步选项能力

## 实施说明

建议按以下顺序实施：

1. 在 `form-kit` 定义 `SchemaFormContext`、`fieldResolvers`、`effects` 相关类型
2. 建立动态字段配置解析逻辑
3. 建立 effect 执行链路
4. 在 renderer 层消费动态 `required/placeholder/description/options`
5. 为异步选项增加 loading / error / 过期请求保护
6. 在 demo 中添加条件联动与异步下拉示例

下一步应先由用户审核此 spec，再进入具体实现。
