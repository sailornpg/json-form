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
