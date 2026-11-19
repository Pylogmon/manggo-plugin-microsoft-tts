# Microsoft TTS

Microsoft TTS 是 Manggo 的语音插件，通过 Microsoft Edge「大声朗读」在线合成语音。添加服务后即可使用默认设置，无需 API Key。

由 Pylogmon 维护。[插件主页](https://github.com/Pylogmon/manggo-plugin-microsoft-tts)

## 安装

需要 Manggo 1.3.5 及以上版本。

1. 在 Manggo 的「插件管理」中安装 `manggo-plugin-microsoft-tts.mplugin`。
2. 到「语音服务」添加 **Microsoft TTS**。保留默认设置即可试听。
3. 要让 Manggo 默认用它朗读，把 **Microsoft TTS** 拖到语音服务列表最前面。

## 设置

- 发音人可按语言分别选择，支持简体中文、繁体中文、英语（美国）、日语和韩语。
- 语速、音量可调 ±50%，音调可调 ±50 Hz。MP3 默认音质为 24 kHz / 48 kbps。

## 打包

```sh
./package.sh
```

生成的插件包位于 `dist/manggo-plugin-microsoft-tts.mplugin`。

## 参考

- [Edge 大声朗读连接协议更新](https://github.com/rany2/edge-tts/pull/492)
- [Edge 大声朗读地址迁移记录](https://github.com/readest/readest/pull/6722)
