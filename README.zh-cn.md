# CC Ring - Claude Code 声音通知器

[下载链接](https://marketplace.visualstudio.com/items?itemName=nelzomal.cc-ring)

再也不会错过 Claude Code 完成任务的时刻！CC Ring 会在 Claude Code 完成执行任务时播放可自定义的通知声音，帮助您保持高效，无需持续盯着屏幕。

## 功能特性

- **声音通知**：Claude Code 完成任务时立即获得音频反馈
- **可调节音量**：调整通知音量，范围 0-100%
- **多种声音选项**：从内置声音中选择或使用您自己的声音
  - 完成：标准完成提示音
  - 细微：安静、温和的通知音
  - 通知：清晰的警报提示音
  - 自定义：使用您自己的声音文件（WAV、MP3 或其他音频格式）
- **简易设置**：自动安装 Claude Code 集成钩子
- **灵活配置**：随时启用/禁用通知

## 系统要求

- **Claude Code**：此扩展需要在 VS Code 中安装并配置 [Claude Code](https://claude.com/claude-code)
- **VS Code**：版本 1.105.0 或更高

## 安装

1. 从 VS Code 市场安装扩展（或从 VSIX 安装）
2. 打开命令面板（macOS 上使用 `Cmd+Shift+P`，Windows/Linux 上使用 `Ctrl+Shift+P`）
3. 运行：`CC Ring: 安装/重新安装钩子`
4. 扩展将自动设置与 Claude Code 的集成

## 配置

此扩展提供以下设置（可通过设置界面或 `settings.json` 访问）：

### `cc-ring.enabled`
- **类型**：`boolean`
- **默认值**：`true`
- **说明**：启用或禁用 Claude Code 完成任务时的声音通知

### `cc-ring.volume`
- **类型**：`number`
- **默认值**：`50`
- **范围**：`0-100`
- **说明**：通知声音的音量级别（0 = 静音，100 = 最大音量）

### `cc-ring.sound`
- **类型**：`string`
- **默认值**：`"complete"`
- **选项**：`"complete"`、`"subtle"`、`"notification"`、`"custom"`
- **说明**：选择任务完成时播放的声音

### `cc-ring.customSoundPath`
- **类型**：`string`
- **默认值**：`""`
- **说明**：自定义声音文件的路径（仅在 `cc-ring.sound` 设置为 `"custom"` 时使用）

## 命令

通过命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）访问这些命令：

### `CC Ring: 测试通知声音`
预览您当前选择的声音和音量设置

### `CC Ring: 选择自定义声音文件`
打开文件选择器以选择用于通知的自定义声音文件

### `CC Ring: 安装/重新安装钩子`
设置或修复 Claude Code 集成钩子

### `CC Ring: 卸载钩子`
移除 Claude Code 集成钩子

### `CC Ring: 显示状态`
显示当前钩子安装状态和配置

## 使用方法

1. **基本设置**：
   - 安装扩展
   - 运行 `CC Ring: 安装/重新安装钩子` 命令
   - 现在 Claude Code 完成任务时将播放通知

2. **调整音量**：
   - 打开设置（`Cmd+,` / `Ctrl+,`）
   - 搜索 "cc-ring"
   - 调整"音量"滑块

3. **更换声音**：
   - 在设置中，将"声音"下拉菜单更改为您喜欢的选项
   - 使用 `CC Ring: 测试通知声音` 进行预览

4. **使用自定义声音**：
   - 运行 `CC Ring: 选择自定义声音文件`
   - 选择您的音频文件
   - 声音设置将自动更改为"自定义"

## 工作原理

CC Ring 使用 VS Code 的钩子系统与 Claude Code 集成。当 Claude Code 完成任务时，它会触发一个钩子，CC Ring 监听该钩子，然后播放您配置的通知声音。这种集成是无缝的，不会干扰 Claude Code 的正常操作。

## 故障排除

**没有播放声音？**
- 检查 `cc-ring.enabled` 是否设置为 `true`
- 确认音量未设置为 0
- 运行 `CC Ring: 显示状态` 检查钩子安装情况
- 尝试 `CC Ring: 安装/重新安装钩子` 修复集成

**自定义声音无法工作？**
- 确保文件路径正确且可访问
- 确认您的系统支持该音频文件格式
- 首先尝试使用内置声音进行测试

## 隐私与权限

此扩展：
- 仅监视 Claude Code 任务完成事件
- 不收集、传输或存储任何用户数据
- 完全在您的本地计算机上运行
- 仅访问您明确选择的音频文件

## 许可证

此扩展采用 [MIT 许可证](LICENSE)。

## 贡献

发现错误或有功能请求？请在 [GitHub](https://github.com/nelzomal/cc_ring/issues) 上提交 issue。

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本历史和更新。

---

**使用 Claude Code 享受高效编码！**
