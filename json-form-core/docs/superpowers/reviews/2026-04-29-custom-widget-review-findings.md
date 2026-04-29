# 自定义 Widget 支持评审问题记录

日期：2026-04-29

## 背景

本次评审针对基础表单项与自定义 widget 扩展能力的实现。当前代码可以成功构建，但评审发现两个 P2 级正确性问题，都会影响业务方自定义表单项的可靠性。

## 问题 1：克隆逻辑会破坏非普通对象表单值

位置：

- `packages/form-kit/src/dynamic.ts`

现象：

当前 `cloneData` 会把所有 object-like 值都当作普通对象递归处理，并通过 `Object.entries` 重建。对于 `File`、`Blob`、`Date`、`Dayjs` 等非普通对象，这会丢失原型和内部状态，严重时会变成 `{}`。

影响：

- 自定义上传组件写入 `File` 或 `Blob` 时，后续 effect、`setValueAtPath`、`clearValueAtPath` 触发根数据克隆，可能破坏无关字段。
- 日期时间类自定义组件如果返回 `Date` 或 `Dayjs`，也可能在联动过程中被错误转换。
- 问题不一定发生在当前修改的字段上，因此排查成本较高。

建议修复：

- 只对 plain object 做深递归克隆。
- 对 `File`、`Blob`、`Date`、`Dayjs` 等非 plain object 保持原引用，或对明确支持的类型做专门复制。
- 补充覆盖 `setValueAtPath` / `clearValueAtPath` 不破坏旁路非普通对象值的测试或手工验证用例。

验收点：

- 表单数据包含 `File`、`Date` 等值时，调用 effect 清空另一个字段后，这些值仍保持原类型。
- 自定义上传 widget 的文件对象不会在联动后变成普通对象或空对象。

## 问题 2：自定义枚举 Widget 拿不到 Schema 推导选项

位置：

- `packages/renderer-antdv/src/AntdvControlRenderer.ts`

现象：

当前自定义 widget 分支传入的 `options` 只来自 `runtimeState?.options`。如果字段选项来自 `schema.enum` 或 `schema.items.enum`，内置控件可以在后续逻辑中解析出来，但自定义 widget 会收到 `options: undefined`。

影响：

- 业务方实现自定义单选、多选、标签选择器时，必须在 `runtime.options` 里重复声明 enum。
- 这与公开的 `options` 契约不一致：同一个字段，内置控件能拿到选项，自定义 widget 拿不到。
- 容易造成 schema 与 runtime 配置双写、漂移。

建议修复：

- 在进入自定义 widget 分支前，复用内置控件的选项解析逻辑。
- 自定义 widget 的 `options` 应优先使用 `runtimeState?.options`，没有时回退到 `schema.enum` 或 `schema.items.enum` 推导结果。
- 确保 array enum 场景同样支持，例如 `schema.items.enum` 对应多选 widget。

验收点：

- `schema.enum` 字段使用自定义 `radio` 类 widget 时，组件能通过 `options` 直接拿到选项。
- `schema.items.enum` 数组字段使用自定义多选 widget 时，组件能通过 `options` 直接拿到选项。
- 不要求业务方在 `runtime.options` 中重复写 schema 已声明的枚举。

## 后续处理建议

优先修复以上两个 P2 问题后，再继续扩展更多自定义 widget 示例。修复后建议执行：

- `npm run build`
- 在 demo 中验证自定义金额、上传、枚举选择 widget 的输入、联动和异步选项行为。
