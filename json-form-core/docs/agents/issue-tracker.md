# Issue tracker: GitHub

本仓库的 issue 与 PRD 记录在 `sailornpg/json-form` 的 GitHub Issues 中。涉及 issue tracker 的操作统一使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`
- **查看 issue**：`gh issue view <number> --comments`
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments`
- **评论 issue**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭 issue**：`gh issue close <number> --comment "..."`

仓库来源可从 `git remote -v` 推断；在当前 clone 内执行时，`gh` 会自动识别。

## 当某个 skill 说 “publish to the issue tracker”

创建一个 GitHub issue。

## 当某个 skill 说 “fetch the relevant ticket”

执行 `gh issue view <number> --comments`。
