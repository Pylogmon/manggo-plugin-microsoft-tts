# Microsoft TTS

Microsoft TTS 是 Manggo 的语音插件，通过 Microsoft Edge「大声朗读」在线合成语音。添加服务后即可使用默认设置，无需 API Key。

## 安装

需要 Manggo 1.3.10 及以上版本。使用插件需要 Manggo Pro。

1. 从 [GitHub Releases](https://github.com/Pylogmon/manggo-plugin-microsoft-tts/releases) 下载 `manggo-plugin-microsoft-tts.mplugin`，在 Manggo 的「插件管理」中安装。
2. 到「语音服务」添加 **Microsoft TTS**。保留默认设置即可试听。
3. 要让 Manggo 默认用它朗读，把 **Microsoft TTS** 拖到语音服务列表最前面。

## 语言和发音人

- 插件支持 Manggo 客户端语言选择器中的全部 **14 个选项**：简体中文、繁体中文、英语（美国）、日语、韩语、德语、法语、西班牙语、意大利语、巴西葡萄牙语、欧洲葡萄牙语、俄语、乌克兰语、越南语。Edge 另有其他语言和口音，本插件不列出。
- 可按语言选择发音人，巴西和欧洲葡萄牙语各有独立设置。升级后会保留已有的发音人选择。
- Manggo 没有传入语言时（例如用划词快捷键朗读），插件按文字粗略判断，不能可靠区分共享同一书写系统的语言。可在「未指定语言时使用」中选定语言；这不会覆盖 Manggo 已传入的语言。
- 语速、音量可调 ±50%，音调可调 ±50 Hz。MP3 默认音质为 24 kHz / 48 kbps。

## 参考

- [Manggo 原生插件开发指南](https://github.com/Pylogmon/manggo-plugin)
- [edge-tts 语音列表用法](https://github.com/rany2/edge-tts#usage)

- [Edge 大声朗读连接协议更新](https://github.com/rany2/edge-tts/pull/492)
- [Edge 大声朗读地址迁移记录](https://github.com/readest/readest/pull/6722)
