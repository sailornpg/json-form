# `rendererPreset` 兼容性人工验收记录

日期：2026-05-06

## 验收目标

验证当前仓库中的 `rendererPreset` 兼容性链路已经成立，并覆盖以下三点：

1. `rendererPreset` 可以提供默认 renderer
2. direct `renderers` 可以局部覆盖 preset
3. custom widget 在同一路径下继续可用

## 验收环境

- 仓库：`json-form-core`
- 页面：`apps/demo`
- 本地命令：`npm run dev --workspace @sailornpg/demo -- --host localhost --port 5199`
- 构建命令：`npm run build`

## 构建验证

已完成：

- `npm run build` 通过

说明：

- `engine-adapter`
- `form-protocol`
- `renderer-antdv`
- `form-kit`
- `demo`

五段构建均通过，demo 产物成功输出。

## 页面人工验收清单

### 1. 基础 preset 路径

检查项：

- 页面主表单可正常渲染
- 主表单继续通过 `:renderer-preset="antdvPreset"` 工作
- 未做 direct override 的字段仍表现为 Antdv 默认控件

期望：

- preset 仍然提供默认 renderer

### 2. Direct override 生效

检查项：

- 页面下方存在 `Compatibility Proof` 区块
- `Proof Title` 字段显示 `Direct override renderer` 标记
- `Proof Title` 使用明显不同于默认 Antdv `Form.Item + Input` 的自定义外观

期望：

- 该字段优先命中 direct `renderers`

### 3. Preset 继续托底

检查项：

- `Compatibility Proof` 区块里的 `Proof Role` 字段仍以 preset 默认控件渲染
- 没有因为 direct override 的存在而退化为“只剩 custom renderer”

期望：

- direct override 只覆盖目标字段，其余字段继续由 preset 托底

### 4. Custom widget 继续可用

检查项：

- `Compatibility Proof` 区块里的 `Proof Budget` 字段继续通过 `moneyInput` widget 渲染
- 修改值后，右侧 JSON 预览同步更新

期望：

- custom widget 链路未被 preset + direct override 组合破坏

## 结果记录

本次验收结论：

- [x] `rendererPreset` 默认路径成立
- [x] direct `renderers` 局部覆盖成立
- [x] custom widget 兼容链路成立
- [x] `npm run build` 通过

## 备注

- 当前 demo 构建仍会提示 bundle chunk 偏大警告，但不影响本次功能验收结论
- 本文档关注的是能力证明与交互链路，不覆盖后续性能优化议题
