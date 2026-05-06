# `rendererPreset` GitHub Issues 发布稿

本文档把 `docs/agents/executable-issues-example.md` 里的 6 张示例 issue 收敛成可直接发布到 GitHub Issues 的版本。

## 发布顺序

建议按下面顺序创建，这样后面的 issue 可以引用前面已经存在的 issue 编号：

1. `SchemaForm` 支持 `rendererPreset` 的最小可用接入路径
2. 保证 `renderers/cells` 对 `rendererPreset` 的覆盖优先级
3. 让自定义 `widgets + uischema.options.widget` 在 preset 路径下继续可用
4. 对外导出稳定的 `antdvPreset` 消费路径
5. 补一条兼容性证明链路：preset、direct override、custom widget 三者可共存
6. 为 `rendererPreset` 接入补最小文档和人工验收矩阵

所有 issue 建议统一加标签：

- `needs-triage`

## Issue 1

**Title**

`SchemaForm` 支持 `rendererPreset` 的最小可用接入路径

**Body**

```md
## What to build

为 `SchemaForm` 增加最小可用的 `rendererPreset` 接入路径。

这张票的目标不是只补类型，而是让调用方已经能够把一个 preset 传给 `SchemaForm`，并在未显式传入 `renderers/cells` 时使用 preset 提供的默认值。实现需要同时打通共享协议层、`SchemaForm` 入口以及 demo 的实际消费路径。

## Acceptance criteria

- [ ] `@json-form/form-protocol` 暴露 `SchemaFormRendererPreset` 所需最小类型
- [ ] `SchemaForm` 新增 `rendererPreset` 接口
- [ ] 当未传 `renderers/cells` 时，`SchemaForm` 能使用 `rendererPreset` 中的 `renderers/cells`
- [ ] demo 改为显式传入一个 preset，并保持现有页面可正常构建和渲染
- [ ] `npm run build` 通过

## Blocked by

None - can start immediately
```

## Issue 2

**Title**

保证 `renderers/cells` 对 `rendererPreset` 的覆盖优先级

**Body**

```md
## What to build

在 `SchemaForm` 内明确并固化优先级规则：直接传入的 `renderers/cells` 高于 `rendererPreset` 中的值。

这张票的重点不是“允许同时传入”，而是要保证优先级语义稳定、可验证，避免 API 后续产生歧义。需要补一条最小验证路径来证明运行时优先级确实生效。

## Acceptance criteria

- [ ] `SchemaForm` 明确实现 direct props override preset 的合并规则
- [ ] 至少有一个可运行示例或验证路径证明优先级生效
- [ ] 没有传 direct props 时，preset 默认行为不变
- [ ] `npm run build` 通过

## Blocked by

- #<Issue1>
```

## Issue 3

**Title**

让自定义 `widgets + uischema.options.widget` 在 preset 路径下继续可用

**Body**

```md
## What to build

把 widget 相关协议与 registry 能力沉到共享协议层，确保 `SchemaForm` 的 `widgets` 注册、`renderer-antdv` 的 widget 查找，以及 `uischema.options.widget` 的运行时解析在 `rendererPreset` 路径下依然可以串通。

这张票的重点是保持现有 custom widget 使用方式的兼容性，而不是只做文件迁移。

## Acceptance criteria

- [ ] 共享协议包提供 widget 定义与 registry 能力
- [ ] `SchemaForm` 仍能按现有方式接收并注册 `widgets`
- [ ] `renderer-antdv` 通过共享协议解析 widget，而不是依赖 `form-kit` 私有实现
- [ ] demo 里的自定义 widget 示例继续可用
- [ ] `npm run build` 通过

## Blocked by

- #<Issue1>
```

## Issue 4

**Title**

对外导出稳定的 `antdvPreset` 消费路径

**Body**

```md
## What to build

在 `@json-form/renderer-antdv` 中导出稳定的 `antdvPreset`，并把 demo 调整为使用这个公共消费入口，而不是在应用层拼装默认 renderer 列表。

完成后，仓库需要能清晰展示未来推荐给外部用户的接入姿势。

## Acceptance criteria

- [ ] `@json-form/renderer-antdv` 对外导出 `antdvPreset`
- [ ] demo 使用 `antdvPreset`，而不是在应用侧拼装默认 renderer 列表
- [ ] demo 代码能够体现推荐的消费方式
- [ ] `npm run build` 通过

## Blocked by

- #<Issue1>
- #<Issue3>
```

## Issue 5

**Title**

补一条兼容性证明链路：preset、direct override、custom widget 三者可共存

**Body**

```md
## What to build

在 demo 或可验证示例中补一条最小兼容链路，证明下面三件事可以同时成立：

- 通过 `rendererPreset` 提供默认 renderer
- 通过 direct `renderers/cells` 做局部覆盖
- 通过 `widgets + uischema.options.widget` 使用自定义 widget

这张票的价值是把“兼容性承诺”变成可观察事实，而不是停留在口头约定。

## Acceptance criteria

- [ ] 至少有一个示例同时覆盖 preset、direct override、custom widget
- [ ] 示例不依赖仓库内部隐式状态
- [ ] 维护者可以通过 demo 或构建产物确认兼容链路成立

## Blocked by

- #<Issue2>
- #<Issue3>
- #<Issue4>
```

## Issue 6

**Title**

为 `rendererPreset` 接入补最小文档和人工验收矩阵

**Body**

```md
## What to build

补一份简短文档，说明 `rendererPreset` 的推荐接法、direct `renderers/cells` 的优先级规则以及 custom widget 的兼容方式；同时做一次人工验收，记录至少以下检查项：

- demo 能打开
- preset 路径能渲染
- direct override 生效
- 自定义 widget 可交互

由于当前仓库还没有完整自动化测试体系，这张票需要人工参与，因此是 HITL 型 issue。

## Acceptance criteria

- [ ] 文档说明 `rendererPreset` 的推荐接法
- [ ] 文档说明 direct `renderers/cells` 的优先级规则
- [ ] 文档说明 custom widget 兼容方式
- [ ] 完成一次人工验收并记录结果
- [ ] 至少包含 build 验证与浏览器交互验证

## Blocked by

- #<Issue5>
```

## `gh` 发布模板

当前环境里没有 `gh`，所以暂时不能直接创建 issue。装好并登录 `gh` 后，可按下面方式发布：

```powershell
gh issue create --title "SchemaForm 支持 rendererPreset 的最小可用接入路径" --label "needs-triage" --body-file .\issue1.md
```

推荐流程：

1. 先把上面每个 `Body` 存成单独的 `issueN.md`
2. 按发布顺序创建 Issue 1 到 Issue 6
3. 创建后把 `#<Issue1>` 这类占位符替换成真实 issue 编号
4. 再继续创建依赖后续 issue
