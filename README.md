# Microsoft TTS

Microsoft TTS 是 Manggo 的语音插件，通过 Microsoft Edge「大声朗读」在线合成语音。添加服务后即可使用默认设置，无需 API Key。

由 Pylogmon 维护。[插件主页](https://github.com/Pylogmon/manggo-plugin-microsoft-tts)

## 安装

需要 Manggo 1.3.10 及以上版本。使用插件需要 Manggo Pro。

1. 从 [GitHub Releases](https://github.com/Pylogmon/manggo-plugin-microsoft-tts/releases) 下载 `manggo-plugin-microsoft-tts.mplugin`，在 Manggo 的「插件管理」中安装。
2. 到「语音服务」添加 **Microsoft TTS**。保留默认设置即可试听。
3. 要让 Manggo 默认用它朗读，把 **Microsoft TTS** 拖到语音服务列表最前面。

## 检查更新

在支持插件更新的 Manggo 中，打开「插件管理」会自动检查更新。发现兼容的新版后，点击「可更新」查看发布说明并确认安装；原有的语音服务设置会保留。

新版插件从[最新正式 Release 的 `updates.json` 附件](https://github.com/Pylogmon/manggo-plugin-microsoft-tts/releases/latest/download/updates.json)读取更新。已安装的插件仍使用包内原有的更新地址；如果旧版没有更新地址，或无法通过旧地址收到新版，可以直接覆盖安装，不用先卸载。

## 语言和发音人

- 插件支持 Manggo 客户端语言选择器中的全部 **14 个选项**：简体中文、繁体中文、英语（美国）、日语、韩语、德语、法语、西班牙语、意大利语、巴西葡萄牙语、欧洲葡萄牙语、俄语、乌克兰语、越南语。Edge 另有其他语言和口音，本插件不列出。
- 可按语言选择发音人，巴西和欧洲葡萄牙语各有独立设置。升级后会保留已有的发音人选择。
- Manggo 没有传入语言时（例如用划词快捷键朗读），插件按文字粗略判断，不能可靠区分共享同一书写系统的语言。可在「未指定语言时使用」中选定语言；这不会覆盖 Manggo 已传入的语言。
- 语速、音量可调 ±50%，音调可调 ±50 Hz。MP3 默认音质为 24 kHz / 48 kbps。

## 打包与发布

```sh
./package.sh
```

生成的插件包位于 `dist/manggo-plugin-microsoft-tts.mplugin`。要发布新版：

1. 保持插件 `id` 不变，递增 `manggo.plugin.json` 中的 `version`。打包并计算这份 `.mplugin` 的 SHA-256（例如 `sha256sum dist/manggo-plugin-microsoft-tts.mplugin`）。
2. 在 [`updates.json`](updates.json) 的 `versions` 中新增条目，填写与包内清单一致的 `version`、`requires` 和该文件的 `sha256`。`url` 使用带版本标签的下载地址：`https://github.com/Pylogmon/manggo-plugin-microsoft-tts/releases/download/v<version>/manggo-plugin-microsoft-tts.mplugin`，不要用 `latest` 代替标签。可用 `notes` 填写发布说明。
3. 将 `.mplugin` 和 **`updates.json`** 一起上传到 `v<version>` 的 GitHub Release 草稿，再发布为最新正式版本。每次发布都要上传这两个附件；只提交 `updates.json` 到 `main` 不会更新 Release 的附件。
4. 确认 `releases/latest/download/updates.json` 可下载，再用已经包含新更新地址的旧版插件验证检查流程。如需让使用旧地址的用户自动迁移，也要更新 `main` 上的 `updates.json`，让旧客户端发现包含新地址的新版插件包。

### 开发验证

维护时可用 `edge-tts --list-voices` 核对发音人，再用 Node.js 22.7 或更新版本运行 `node --test`，验证语言映射、发音人选择和更新清单。插件在 Manggo 内运行不需要安装 Node.js。

## 参考

- [Manggo 原生插件开发指南](https://github.com/Pylogmon/manggo-plugin)
- [edge-tts 语音列表用法](https://github.com/rany2/edge-tts#usage)

- [Edge 大声朗读连接协议更新](https://github.com/rany2/edge-tts/pull/492)
- [Edge 大声朗读地址迁移记录](https://github.com/readest/readest/pull/6722)
