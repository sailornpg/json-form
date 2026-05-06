# 可执行 Issue 拆分示例

本文档用当前仓库里最贴近的一项真实目标，演示“怎么把一个大目标拆成可执行 issue”。

## 选取的目标

这里选择 `task_plan.md` 里 Phase 10 的目标作为示范：

> 为 `SchemaForm` 引入 UI-neutral 的 `rendererPreset` 和共享 `widget protocol`，同时保持现有 `renderers/cells` 与自定义 `widgets` 的兼容性。

这是一个适合演示的目标，因为它同时涉及：

- `packages/form-protocol`
- `packages/form-kit`
- `packages/renderer-antdv`
- `apps/demo`
- 构建与兼容性验证

如果拆得不好，很容易变成这种“不可执行大口号”：

- 支持 `rendererPreset`
- 重构 renderer 架构
- 优化 widget 协议

这种标题的问题是：接手的人还要自己重新分析边界、依赖、验收方式，实际上并不能直接开工。

## 什么叫“可执行”

在这个仓库里，一张可执行 issue 至少应该满足：

- 目标是单一且清楚的
- 改动范围可以收敛到一条窄链路
- 做完后可以构建、验证或演示
- 依赖关系明确
- 接手的人不需要再花大量时间补上下文

`to-issues` 追求的是 vertical slice，而不是 horizontal slice。

### 不推荐的横切拆法

- `form-protocol` 新增类型
- `form-kit` 新增 props
- `renderer-antdv` 迁移实现
- `demo` 再接入

这类拆法的问题是：前几张票做完后都无法单独证明“用户价值是否落地”，更像内部施工清单。

### 推荐的纵切拆法

每张 issue 都尽量围绕一个“用户或调用方能感知到的能力”来拆，比如：

- 消费方可以把 `rendererPreset` 传给 `SchemaForm` 并正常渲染
- 同时传 `rendererPreset` 和 `renderers/cells` 时，直接传入项优先级更高
- 自定义 `widget` 在 preset 路径下依然可用

这样每张票都能单独验收。

## 示例拆分结果

下面给出一组适合当前仓库的 issue 草稿。它们不一定是唯一正确答案，但都满足“可以直接拿去建票并开工”。

### Issue 1

**Title**

`SchemaForm` 支持 `rendererPreset` 的最小可用接入路径

**Type**

`AFK`

**Blocked by**

None - can start immediately

**User stories covered**

- 作为表单接入方，我希望给 `SchemaForm` 传入一个 `rendererPreset`，这样我不必每次手动组装 `renderers` 和 `cells`
- 作为框架维护者，我希望这个能力不引入 `form-kit <-> renderer-antdv` 的包循环依赖

**What to build**

在共享协议层定义最小 `SchemaFormRendererPreset` 契约，让 `SchemaForm` 能接收 `rendererPreset`，并在未显式传入 `renderers/cells` 时走 preset 提供的默认值。为了让这一能力真正落地，本 issue 必须同时串通协议类型、`SchemaForm` 入口和 demo 使用路径，而不是只停留在类型声明。

**Acceptance criteria**

- [ ] `@json-form/form-protocol` 暴露 `SchemaFormRendererPreset` 所需最小类型
- [ ] `SchemaForm` 新增 `rendererPreset` 接口
- [ ] 当未传 `renderers/cells` 时，`SchemaForm` 能使用 `rendererPreset` 中的 `renderers/cells`
- [ ] demo 改为显式传入一个 preset，并保持现有页面可正常构建和渲染
- [ ] `npm run build` 通过

### Issue 2

**Title**

保证 `renderers/cells` 对 `rendererPreset` 的覆盖优先级

**Type**

`AFK`

**Blocked by**

- Issue 1

**User stories covered**

- 作为高级接入方，我希望在使用 `rendererPreset` 的同时，仍然可以对个别 renderer 或 cell 做显式覆盖
- 作为维护者，我希望这个优先级规则稳定且不含糊，避免后续 API 语义漂移

**What to build**

在 `SchemaForm` 内明确并固化优先级规则：直接传入的 `renderers/cells` 高于 preset 中的值。需要补一个最小示例或验证路径来证明不是“类型上支持、运行时无保证”。

**Acceptance criteria**

- [ ] `SchemaForm` 明确实现“direct props override preset”的合并规则
- [ ] 至少有一个可运行示例或验证路径证明优先级生效
- [ ] 没有传 direct props 时，preset 默认行为不变
- [ ] `npm run build` 通过

### Issue 3

**Title**

让自定义 `widgets + uischema.options.widget` 在 preset 路径下继续可用

**Type**

`AFK`

**Blocked by**

- Issue 1

**User stories covered**

- 作为业务接入方，我希望升级到 `rendererPreset` 后，不需要放弃现有的自定义 widget 能力
- 作为维护者，我希望 widget registry 的共享边界落在独立协议包，而不是分散在 UI 实现包和表单入口包之间

**What to build**

把 widget 相关协议与 registry 能力沉到共享协议层，确保 `SchemaForm` 的 `widgets` 注册、`renderer-antdv` 的 widget 查找，以及 `uischema.options.widget` 的运行时解析仍然能串起来。这个 issue 的重点是“兼容现有 widget 使用方式”，不是只迁移文件位置。

**Acceptance criteria**

- [ ] 共享协议包提供 widget 定义与 registry 能力
- [ ] `SchemaForm` 仍能按现有方式接收并注册 `widgets`
- [ ] `renderer-antdv` 通过共享协议解析 widget，而不是依赖 `form-kit` 私有实现
- [ ] demo 里的自定义 widget 示例继续可用
- [ ] `npm run build` 通过

### Issue 4

**Title**

对外导出稳定的 `antdvPreset` 消费路径

**Type**

`AFK`

**Blocked by**

- Issue 1
- Issue 3

**User stories covered**

- 作为消费方，我希望从 `@json-form/renderer-antdv` 直接拿到一个可用的 `antdvPreset`
- 作为维护者，我希望 demo 使用的就是未来推荐给外部用户的接入姿势，而不是内部特例

**What to build**

在 `renderer-antdv` 中导出稳定的 `antdvPreset`，并把 demo 改成“公共消费方式示范”，避免 demo 继续隐藏内部装配细节。这个 issue 完成后，仓库应该能清楚展示“推荐接法是什么”。

**Acceptance criteria**

- [ ] `@json-form/renderer-antdv` 对外导出 `antdvPreset`
- [ ] demo 使用 `antdvPreset`，而不是在应用侧拼装默认 renderer 列表
- [ ] demo 代码能够体现推荐的消费方式
- [ ] `npm run build` 通过

### Issue 5

**Title**

补一条兼容性证明链路：preset、direct override、custom widget 三者可共存

**Type**

`AFK`

**Blocked by**

- Issue 2
- Issue 3
- Issue 4

**User stories covered**

- 作为维护者，我希望这个新 API 不是“单点可用”，而是能证明和老扩展点一起工作
- 作为后续开发者，我希望看到一个最小但完整的兼容性示例，减少误用

**What to build**

在 demo 或可验证示例中补一条最小兼容链路，证明下面三件事可以同时成立：

- 通过 `rendererPreset` 提供默认 renderer
- 通过 direct `renderers/cells` 做局部覆盖
- 通过 `widgets + uischema.options.widget` 使用自定义 widget

这张 issue 的价值在于把“兼容性承诺”变成可观察事实。

**Acceptance criteria**

- [ ] 至少有一个示例同时覆盖 preset、direct override、custom widget
- [ ] 示例不依赖仓库内部隐式状态
- [ ] 维护者可以通过 demo 或构建产物确认兼容链路成立

### Issue 6

**Title**

为 `rendererPreset` 接入补最小文档和人工验收矩阵

**Type**

`HITL`

**Blocked by**

- Issue 5

**User stories covered**

- 作为维护者，我希望这次 API 演进的推荐用法和兼容边界被明确记录下来
- 作为评审者，我希望有一份人工验收矩阵确认构建通过之外的实际交互行为

**What to build**

补一份简短文档，说明推荐接法、优先级规则和 widget 兼容方式；同时做一次人工验收，记录至少以下检查项：demo 能打开、preset 路径能渲染、direct override 生效、自定义 widget 可交互。因为当前仓库还没有完整自动化测试体系，这张票需要人工参与，因此标为 `HITL`。

**Acceptance criteria**

- [ ] 文档说明 `rendererPreset` 的推荐接法
- [ ] 文档说明 direct `renderers/cells` 的优先级规则
- [ ] 文档说明 custom widget 兼容方式
- [ ] 完成一次人工验收并记录结果
- [ ] 至少包含 build 验证与浏览器交互验证

## 为什么这 6 张票算“可执行”

### 1. 每张票都有明确产出

不是“优化一下”“支持一下”，而是做完后能指出具体新增能力或具体兼容承诺。

### 2. 每张票都有清晰依赖

例如 Issue 5 依赖 Issue 2、3、4，因为它本质上是在证明前面三项能力可以共存。如果不先完成前置能力，这张票就无法验证。

### 3. 每张票都能独立验收

即使是偏基础设施的票，也被约束为必须落到 demo、构建或实际运行路径上，而不是只改内部类型。

### 4. 它们是纵切，不是纯横切

例如 Issue 3 不是“迁移 widgetRegistry.ts”，而是“让 custom widget 在 preset 路径下继续可用”。前者是内部施工动作，后者才是可交付能力。

## 如果真的要发到 GitHub Issues，建议怎么做

建议按依赖顺序创建：

1. Issue 1
2. Issue 2
3. Issue 3
4. Issue 4
5. Issue 5
6. Issue 6

这样后创建的 issue 可以直接在 `Blocked by` 里引用前面的真实 issue 编号。

## 一条实用判断规则

如果你写完一张 issue 后，接手的人还必须追问下面这些问题之一，那它大概率还不够可执行：

- “到底改哪些模块？”
- “做到什么算完成？”
- “这个和前一张票是什么依赖关系？”
- “这个能不能单独验证？”
- “这是用户能力，还是内部重构动作？”

如果这些问题在 issue 本身里已经回答了，它通常就已经接近一张合格的可执行 issue。
