# 项目内 Skill 使用说明

本文档说明当前仓库 `.agents/skills/` 下各个项目级 skill 的用途、适用场景与使用建议，便于在日常开发、设计、排障、拆解需求时快速判断该用哪一个。

## 当前仓库包含哪些 skill

当前项目内可用的项目级 skill 有：

- `brainstorming`
- `caveman`
- `diagnose`
- `grill-me`
- `grill-with-docs`
- `improve-codebase-architecture`
- `requesting-code-review`
- `setup-matt-pocock-skills`
- `tdd`
- `to-issues`
- `to-prd`
- `triage`
- `write-a-skill`
- `zoom-out`

## 快速选择

如果你的目标是……

- 先把想法聊清楚、形成设计，再开始实现：用 `brainstorming`
- 想让我用极简、低 token 的方式回答：用 `caveman`
- 遇到 bug、异常、性能回退，要系统化排查：用 `diagnose`
- 想让方案被连续追问、压测决策树：用 `grill-me`
- 想在追问方案时顺便校准项目术语、补 `CONTEXT.md` / ADR：用 `grill-with-docs`
- 想找架构薄弱点、重构机会、可测试性问题：用 `improve-codebase-architecture`
- 想在合并前或阶段结束后做代码审查：用 `requesting-code-review`
- 想让 issue/triage/PRD 相关 skill 知道本仓库的 issue tracker、标签、领域文档位置：用 `setup-matt-pocock-skills`
- 想按 red-green-refactor 做测试先行开发：用 `tdd`
- 想把计划或 spec 拆成可执行 issue：用 `to-issues`
- 想把当前讨论整理成 PRD 并发布到 issue tracker：用 `to-prd`
- 想整理 issue、分诊、推进状态流转：用 `triage`
- 想新增一个 skill：用 `write-a-skill`
- 想先从高层看懂某块代码的模块关系：用 `zoom-out`

## 逐个说明

### `brainstorming`

**它是干什么的**

在任何“要新增能力、改功能、做设计”的任务开始前，先把需求、约束、成功标准和方案方向聊清楚，并形成设计文档。

**什么情景下使用**

- 你要新增一个功能，但还没定方案
- 你只给了目标，还没给出清晰实现边界
- 你希望先做设计，再进入实现
- 你要改动行为逻辑，而不是只做纯文档整理

**使用特征**

- 一次问一个问题
- 会先看代码和上下文
- 会给出 2 到 3 种方案并说明取舍
- 用户确认后才进入设计文档和后续实现

**一句话理解**

先设计，后动手；没有设计确认，不直接写代码。

### `caveman`

**它是干什么的**

把回答切到“极简表达模式”，减少废话和 token 消耗，但保留技术信息。

**什么情景下使用**

- 你说“简短点”“少点 token”“caveman mode”
- 你只想快速拿结论，不想看铺垫
- 你已经熟悉上下文，只想要直接指令

**使用特征**

- 句子短
- 少修饰词
- 保留术语和代码准确性
- 持续生效，直到你明确说恢复正常模式

**一句话理解**

适合高频来回、只要结论不要包装的场景。

### `diagnose`

**它是干什么的**

用一套严格的排障闭环处理复杂 bug 或性能回退：`复现 -> 缩小范围 -> 假设 -> 打点/探针 -> 修复 -> 回归验证`。

**什么情景下使用**

- 某个 bug 很绕，不适合拍脑袋改
- 页面/接口“偶发失败”“有时错有时对”
- 性能退化、响应变慢、渲染卡顿
- 你明确说“debug this”“diagnose this”

**使用特征**

- 强调先建立稳定反馈回路
- 不鼓励上来就猜原因
- 会要求能复现、能验证、能回归
- 修完后还要清理调试痕迹并补回归测试

**一句话理解**

这是“硬核排障流程”，不是“试试看改哪行”的临场修补。

### `grill-me`

**它是干什么的**

对一个计划或设计做高强度追问，把每个分支决策都问清楚。

**什么情景下使用**

- 你已经有方案，但想被挑战一下
- 你担心自己考虑得不够全
- 你要做关键设计决策，想先把坑暴露出来

**使用特征**

- 一次只问一个问题
- 会沿着决策树一层层追问
- 每个问题通常会给出推荐答案

**一句话理解**

适合“压力测试方案”，不适合直接开工实现。

### `grill-with-docs`

**它是干什么的**

和 `grill-me` 类似，但会把讨论结果绑定到项目术语、`CONTEXT.md` 和 ADR 上，边聊边沉淀文档。

**什么情景下使用**

- 你不仅要挑战方案，还想顺手固化项目语言
- 团队里术语容易混
- 某些架构决策需要留下长期可追溯记录
- 你担心“代码里这么做”和“文档里怎么定义”不一致

**使用特征**

- 会检查术语是否和项目现有定义冲突
- 需要时会增补 `CONTEXT.md`
- 对“难以回退、值得记录”的决策会建议写 ADR

**一句话理解**

这是“带项目语义约束的方案拷问版”。

### `improve-codebase-architecture`

**它是干什么的**

寻找代码库里的架构摩擦点，提出“更深的模块、更好的 seam、更强可测试性”的重构机会。

**什么情景下使用**

- 你想系统性重构
- 某块代码理解成本高、改动扩散大
- 模块拆很多，但都很浅、只是转发
- 你想让 AI 或人类更容易导航这套代码

**使用特征**

- 会先看领域词汇和 ADR
- 关注 module/interface/depth/seam/locality/leverage
- 先给候选项，不会直接上来改代码
- 用户选定候选方向后再进入深挖和设计讨论

**一句话理解**

适合“找哪里该重构、为什么重构、往哪种结构演进”。

### `requesting-code-review`

**它是干什么的**

在任务完成后、合并前、阶段性里程碑后，触发一次偏代码审查视角的质量检查。

**什么情景下使用**

- 刚完成一个重要功能
- 修了复杂 bug，想看有没有副作用
- 准备合并到主分支前
- 子任务很多，想每完成一批就审一次

**使用特征**

- 强调 review 要尽早、要频繁
- 重点找问题，不是泛泛点评
- 通常基于提交区间或明确改动范围来审

**一句话理解**

这是“完成后拉一轮技术体检”。

### `setup-matt-pocock-skills`

**它是干什么的**

为一组工程类 skill 配置仓库级上下文，让它们知道这个仓库的 issue tracker 在哪、triage 标签叫什么、领域文档怎么找。

**什么情景下使用**

- 第一次接入 `to-issues`、`to-prd`、`triage`、`diagnose`、`tdd`、`improve-codebase-architecture`、`zoom-out`
- 这些 skill 不知道该往哪发 issue
- 这些 skill 不知道 triage label 用哪套名称
- 你切换了 issue tracker 或文档布局

**使用特征**

- 会探查仓库现状
- 会逐项和用户确认
- 最终写入 `AGENTS.md` / `CLAUDE.md` 与 `docs/agents/*.md`

**一句话理解**

这是这些工程 skill 的“仓库接线配置器”。

### `tdd`

**它是干什么的**

按 `red -> green -> refactor` 的节奏进行测试驱动开发，强调通过公开接口验证行为，而不是测试实现细节。

**什么情景下使用**

- 你明确想用 TDD 开发
- 你要先写测试再写功能
- 某块逻辑风险高，想用测试稳住
- 你要补 integration-style 的行为测试

**使用特征**

- 一次只写一个测试
- 一个行为对应一个最小实现
- 反对先把所有测试一口气写完
- 重视 public interface，而不是内部私有结构

**一句话理解**

适合“行为先行、增量推进、测试随实现长出来”的开发方式。

### `to-issues`

**它是干什么的**

把计划、spec 或 PRD 拆成可独立认领、可独立推进的 issue，强调 vertical slice，而不是按前后端/接口/组件横切。

**什么情景下使用**

- 你已经有方案文档，下一步要拆任务
- 你要把一个大需求拆成多张票
- 你想让 agent 或多人并行接活

**使用特征**

- 倾向拆成窄而完整的 tracer bullet
- 会区分 `HITL` 与 `AFK`
- 发布到 issue tracker 时会带 `needs-triage`

**一句话理解**

这是“把方案拆成能真正执行的 issue 列表”。

### `to-prd`

**它是干什么的**

把当前对话上下文和代码库理解整理成一份 PRD，并发布到 issue tracker。

**什么情景下使用**

- 你已经在聊天里把背景说得差不多了
- 不想再被反复提问，只想让我归纳成正式 PRD
- 你要把零散讨论沉淀成需求单

**使用特征**

- 不会重新做一轮长访谈
- 会总结问题、方案、用户故事、实现决策、测试决策、范围边界
- 发布时带 `needs-triage`

**一句话理解**

适合“已经聊明白了，现在整理成正式需求文档”。

### `triage`

**它是干什么的**

按固定状态机管理 issue，从未分诊、待评估、待补信息，到适合 agent 接手或人工处理。

**什么情景下使用**

- 你要查看有哪些 issue 需要处理
- 你要评估某个 bug/需求现在该进入什么状态
- 你要把 issue 推到 `ready-for-agent` 或 `ready-for-human`
- 你要补一份适合 agent 接手的 brief

**使用特征**

- 区分 category role 和 state role
- 支持 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`
- 对 bug 会优先尝试复现
- 输出到 issue tracker 的 triage 评论必须带 AI disclaimer

**一句话理解**

这是“issue 分诊和状态推进器”。

### `write-a-skill`

**它是干什么的**

帮助为仓库或个人工作流编写新的 skill，包括 `SKILL.md`、附加参考文件和必要脚本。

**什么情景下使用**

- 你想把常见流程固化成 skill
- 某类任务重复出现，想形成可复用说明
- 你要新增项目内定制 skill

**使用特征**

- 会先问需求范围和使用场景
- 会控制 `SKILL.md` 的结构和长度
- 会强调 description 里的触发条件要写清楚

**一句话理解**

适合“把经验流程产品化成一个可复用 skill”。

### `zoom-out`

**它是干什么的**

先退一层抽象，从更高视角理解一块代码的模块地图、调用关系和它在整体中的位置。

**什么情景下使用**

- 你刚进一个陌生模块
- 你不想立刻看实现细节，想先看整体结构
- 你要弄清“谁调谁、入口在哪、职责怎么分”

**使用特征**

- 关注相关模块与调用方
- 强调用项目自己的领域术语来解释
- 适合在深入某块代码前先用一次

**一句话理解**

先看地图，再进街道。

## 常见组合用法

### 新功能从想法到落地

1. `brainstorming`
2. `to-prd`
3. `to-issues`
4. `tdd` 或常规实现
5. `requesting-code-review`

### 复杂 bug 排查

1. `zoom-out`
2. `diagnose`
3. 必要时 `improve-codebase-architecture`
4. `requesting-code-review`

### 方案评审与术语沉淀

1. `grill-me` 或 `grill-with-docs`
2. 如果结论要长期保留，补 `CONTEXT.md` / ADR
3. 再进入 `to-prd` 或实现阶段

### issue 驱动的工作流

1. `setup-matt-pocock-skills`
2. `triage`
3. `to-prd`
4. `to-issues`

## 对当前仓库的建议

- 这批 skill 里，和当前仓库最直接相关的是：`brainstorming`、`diagnose`、`improve-codebase-architecture`、`tdd`、`to-issues`、`to-prd`、`triage`、`zoom-out`
- 由于本仓库已经完成 `setup-matt-pocock-skills`，`docs/agents/` 下的配置已经可供这些工程类 skill 直接使用
- 如果你后面想继续扩充项目内 skill，建议统一放在 `.agents/skills/<skill-name>/`，并保持 `description` 里把“做什么”和“什么情景下触发”写清楚
