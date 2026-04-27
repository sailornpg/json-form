# SchemaForm 响应式递归更新修复设计

日期：2026-04-27

## 背景

当前 `SchemaForm` 在 demo 中会持续触发 Vue 运行时错误：

```text
Maximum recursive updates exceeded in component <SchemaForm>
```

从表现看，控制台报错像是“定时”出现；从根因看，它不是显式 `setInterval` 导致，而是 `SchemaForm`、`@jsonforms/vue`、异步 options 三者之间形成了响应式反馈环。demo 中异步下拉选项使用 `window.setTimeout(700)` 模拟网络延迟，因此反馈环被异步 resolve 周期持续重新点燃，看起来像固定时间间隔的报错。

## 目标

- 切断 `SchemaForm` 与 `@jsonforms/vue` 之间的无意义重复更新。
- 保留现有 API：`data/schema/uischema/validators/fieldResolvers/effects` 不做破坏性调整。
- 让异步 options 只在有效输入变化时重新请求。
- 避免 renderer/cell 引用在每次 render 中被重新创建。
- 为后续 provider 化的 options 调度留下边界。

## 非目标

- 不重写 JSON Forms runtime。
- 不引入新的异步请求库或缓存库。
- 不在本次修复中设计完整 provider API。
- 不改变 demo 的业务行为。

## 根因分析

### 1. `onChange` 中无条件写响应式状态

`@jsonforms/vue` 会在 mounted 和 core 更新后 emit `change`。原实现收到事件后，即使数据和错误内容没有变化，也会执行：

```ts
currentData.value = eventData
schemaErrors.value = event.errors
```

其中 `eventData` 由浅拷贝产生，每次都是新对象引用。`currentData` 和 `schemaErrors` 又参与：

```text
customErrors
-> validationResult
-> formContext
-> resolvedFields
-> fieldStates
-> runtimeConfig
-> JsonFormsRuntime.config
```

`runtimeConfig` 变化后传回 JSON Forms，JSON Forms 内部 watcher 更新 core 或 config，然后再次 emit `change`。这就构成：

```text
JsonForms change
-> SchemaForm 写 currentData/schemaErrors
-> SchemaForm 重新计算 runtimeConfig/additionalErrors
-> JsonForms 接收新 props 并更新内部状态
-> JsonForms 再次 change
-> SchemaForm 再次写 ref
```

Vue 检测到同一响应式链路在不断修改自己的依赖，于是报递归更新。

### 2. 异步 options 在 computed 链路中创建 Promise

原实现把 `resolveFieldOptionsInput()` 放在 `resolvedFields` computed 中。对于异步 options，每次 `resolvedFields` 重算都会创建新的 Promise，并立即开始一次异步请求。

这有两个问题：

- computed 应保持纯派生，不应启动异步副作用。
- Promise 身份每次都不同，会放大 watcher 触发和请求重入。

demo 中 `province` 和 `city` 的 options 都是异步函数，并带有 700ms 延迟，因此每轮递归会在异步完成后继续推动 `asyncFieldStates`、`runtimeConfig` 和 JSON Forms 更新。

### 3. render 中创建不稳定数组引用

原实现每次 render 都执行：

```ts
renderers: [...(props.renderers ?? defaultRenderers)]
cells: [...(props.cells ?? defaultCells)]
```

这会让 JSON Forms 的 `renderers/cells` watcher 认为引用发生变化。它不是递归更新的唯一根因，但会增加不必要的下游更新。

## 修复方案

### 1. 响应式写入必须做内容相等保护

新增受控写入函数：

- `setCurrentData(nextData)`
- `setSchemaErrors(nextErrors)`
- `setAsyncFieldStates(nextStates)`

只有内容实际变化时才写入 ref。这样 JSON Forms 的重复 change 不再把等价数据变成新响应式变更。

### 2. 异步 options 从 computed 中移出

`resolvedFields` 只负责解析字段定义、runtime 和静态状态，不再执行 options 函数。`fieldStates` 根据 runtime 判断：

- `options === undefined`：无选项状态。
- `Array.isArray(options)`：同步静态选项，直接使用。
- `typeof options === 'function'`：从 `asyncFieldStates` 读取请求结果。

真正执行 options 函数的位置收敛到 `watch(resolvedFields)` 中，并通过请求签名控制重入。

### 3. 使用请求签名避免重复请求

为函数型 options 维护：

- `optionRequestIds`
- `optionRequestSignatures`

当前签名由字段路径和当前数据构成：

```ts
{
  path,
  data: currentData.value,
}
```

当签名不变且已有状态时，复用已有 options 状态，不再重新发起请求。请求完成时用 request id 丢弃过期结果，避免慢请求覆盖新数据。

### 4. 稳定 renderer/cell 引用

把 render 中的新数组创建改为 computed：

```ts
const effectiveRenderers = computed(() => props.renderers ?? defaultRenderers)
const effectiveCells = computed(() => props.cells ?? defaultCells)
```

下游 JSON Forms 只有在调用方真正传入新引用时才会收到变更。

## 数据流修复后

修复后的主要链路为：

```text
用户输入
-> renderer 调用 handleChange
-> JsonForms core 更新并 emit change
-> SchemaForm 仅在内容变化时写 currentData/schemaErrors
-> effects 可选地产生 programmatic data
-> update:data/change 向业务侧发出
```

异步 options 链路为：

```text
data 或字段 runtime 变化
-> resolvedFields 变化
-> watch 判断 options 请求签名
-> 仅签名变化时请求 options
-> request id 校验最新请求
-> asyncFieldStates 内容变化后才写入
-> runtimeConfig 更新 renderer 展示状态
```

## 行为约束

- `SchemaForm` 仍是 controlled component：外部 `data` 是输入源，内部通过 `update:data` 通知变更。
- JSON Forms 的 mounted 初始 change 仍允许向业务侧同步一次结果。
- programmatic data echo 仍通过 `pendingProgrammaticData` 识别，避免 effect 产生的数据被误判为用户输入。
- 异步 options 的请求签名当前以字段路径和表单数据为主，后续 provider API 落地后可以扩展为显式 dependency key。

## 后续建议

- 将 `areSameData(JSON.stringify)` 替换为稳定的深比较工具，避免属性顺序、不可序列化值和大对象性能问题。
- 为 options 增加显式 `dependencies` 或 `cacheKey` API，避免全表数据变化导致不必要的选项请求。
- 给 `SchemaForm` 增加集成测试，覆盖：
  - 初始 mounted change 不递归。
  - 异步 options resolve 后不重复请求。
  - effects programmatic update 只 echo 一次。
  - `additionalErrors` 变化不会导致无限 change。
- 后续 provider 化时，把 options 请求、取消、错误恢复和缓存策略从组件中拆出。

## 验证

- `npm run build` 通过。
- 使用 Vite dev server 在浏览器打开 demo，等待异步省州和城市 options resolve 后，控制台没有出现 `Maximum recursive updates exceeded`。
