# MotionMaster 运行环境与依赖安装

## 1. 文档范围

本文件是源码交付版的统一环境说明。源码 ZIP 不包含 `node_modules`、Python 虚拟环境、语音模型、项目视频、构建输出和缓存。使用者首次启动时在自己的电脑上生成这些内容。

依赖版本以 `package-lock.json` 和首次创建的 `runtime/asr-env` 为准，不依赖全局安装的前端包或 Python ASR 包。

## 2. 支持环境

| 项目 | 必需性 | 要求 |
|---|---|---|
| Windows | 必需 | Windows 10/11 x64；当前发布和验证目标 |
| Node.js | 必需 | 20 或更高版本；当前验证使用 24.14.1 |
| npm | 必需 | 随 Node.js 安装；当前验证使用 11.11.0 |
| Python | 本地 ASR 必需 | 3.10–3.13 x64；当前验证使用 3.12.0 |
| Google Chrome | 视频渲染必需 | 标准桌面版；供 Remotion 渲染使用 |
| FFmpeg / FFprobe | 必需 | 优先使用 npm 依赖中的 Remotion Windows compositor；不要求加入全局 PATH |
| NVIDIA CUDA | 可选 | 仅在设置里选择 `cuda` 时需要；版本必须与当前 `ctranslate2` 兼容 |
| Microsoft VC++ 运行库 | 建议 | Python 原生扩展或 CTranslate2 无法加载时安装最新 x64 运行库 |

默认转录使用 `CPU + int8`，没有 NVIDIA 显卡也能运行。GPU 只影响速度，不改变逐词时间戳数据格式。

## 3. 磁盘与网络

本机当前实测占用：

| 内容 | 约占空间 |
|---|---:|
| `node_modules` | 0.75 GiB |
| `runtime/asr-env` | 0.35 GiB |
| 默认 `large-v3-turbo` | 1.51 GiB |
| 源码、构建输出与临时文件 | 建议预留 1 GiB 以上 |

全新安装建议至少预留 5 GB。若还要安装 `medium` 和 `large-v3`，建议额外预留 5 GB。

首次安装需要访问：

- npm 软件包源，用于安装 Node.js 依赖；
- PyPI，用于安装 `faster-whisper` 和 Python 依赖；
- `huggingface.co`，用于下载 Whisper 模型。

企业代理环境使用标准的 `HTTP_PROXY`、`HTTPS_PROXY`、npm registry 和 pip index 配置。模型下载完成后，本地转录可以断网运行。

## 4. 源码包结构

```text
MotionMaster-开发源码-.../
├─ 先读我-首次启动与模型下载.md
└─ 01-源码包/
   └─ motion-master/
      ├─ apps/
      ├─ packages/
      ├─ card-packs/
      ├─ scripts/
      ├─ docs/
      ├─ package.json
      ├─ package-lock.json
      ├─ setup.ps1
      ├─ start.bat
      └─ stop.bat
```

`setup.ps1`、`start.bat` 和本文件都属于交付必需文件。发布脚本会检查模型和生成目录没有混入源码 ZIP。

## 5. 推荐安装方式

1. 安装 Node.js 20+、Python 3.10–3.13 和 Google Chrome。
2. 解压源码 ZIP，进入 `01-源码包\motion-master`。
3. 双击 `start.bat`。
4. 首次启动会依次运行 `npm install`、前端构建、Python ASR 环境准备和默认模型下载。
5. 浏览器自动打开 `http://127.0.0.1:4180`。

也可以在 PowerShell 中显式安装：

```powershell
.\setup.ps1
.\start.bat
```

`setup.ps1` 会安装依赖、构建前端、准备 ASR、运行环境检查并生成 MCP 配置。

## 6. 手工命令

```powershell
# 安装锁定的 Node.js 依赖
npm install

# 构建 Web 编辑台
npm run build

# 创建 ASR 环境并准备默认 large-v3-turbo
npm run bootstrap:asr

# 启动 API 与编辑台
npm start

# 开发模式
npm run dev

# 完整单元测试
npm test

# 环境诊断
npm run doctor
```

## 7. 首次启动生成内容

```text
node_modules/                              Node.js 依赖
apps/studio-web/dist/                     编辑台构建输出
runtime/asr-env/                          Python 虚拟环境
runtime/models/faster-whisper-large-v3-turbo/
runtime/semantic-cut-asr.py
runtime/prepare-semantic-asr.py
projects/                                 默认项目数据目录
```

这些内容不得回填到源码交付 ZIP。模型的下载、识别、手工放置与切换规则见 `docs/LOCAL-ASR-MODEL-GUIDE.md`。

## 8. 环境变量

| 变量 | 用途 |
|---|---|
| `MOTION_MASTER_PORT` | 编辑台端口，默认 `4180` |
| `MOTION_MASTER_DATA_DIR` | 项目数据目录 |
| `MOTION_MASTER_RUNTIME_ROOT` | ASR 和运行时目录 |
| `MOTION_MASTER_FFMPEG` | 自定义 FFmpeg 路径 |
| `MOTION_MASTER_FFPROBE` | 自定义 FFprobe 路径 |
| `MOTION_ASR_BOOTSTRAP_PYTHON` | 创建 ASR 虚拟环境所用的 Python |
| `MOTION_ASR_PYTHON` | 转录时使用的 Python 可执行文件 |
| `MOTION_ASR_MODEL` | 临时覆盖设置页选择的本地模型 |
| `HF_TOKEN` | 可选；提高 Hugging Face 下载限额 |
| `HTTP_PROXY` / `HTTPS_PROXY` | 网络代理 |

不要把 API Key、令牌或代理密码写入源码。百炼 API Key 保存在项目数据目录的 `.motion-master-settings.json`，读取接口不会回传明文。

## 9. 依赖边界

- Node.js 依赖由根目录 `package-lock.json` 锁定并安装到本项目的 `node_modules`。
- Python 依赖安装到 `runtime/asr-env`，不污染系统 Python 或 Conda base。
- Whisper 模型安装到 `runtime/models`，不复制到单个项目。
- FFmpeg 优先从 Remotion npm 依赖解析，不要求修改 Windows 全局 PATH。
- 项目素材、字幕、粗剪记录和输出保存在 `projects`，与程序依赖分离。

## 10. 验证安装

```powershell
node --version
npm --version
runtime\asr-env\Scripts\python.exe --version
npm run doctor
npm run build
npm test
```

启动后访问以下接口：

```text
GET http://127.0.0.1:4180/api/system
GET http://127.0.0.1:4180/api/settings/asr/models
```

`/api/system` 应返回当前版本，模型接口应列出 `medium`、`large-v3-turbo` 和 `large-v3`，并显示各自安装状态。

## 11. 常见问题

### PowerShell 禁止运行脚本

使用 `start.bat`；它会以 `-ExecutionPolicy Bypass` 运行本项目启动脚本，不修改系统策略。

### 端口被占用

先运行 `stop.bat`，或设置其他端口：

```powershell
$env:MOTION_MASTER_PORT='4280'
npm start
```

### Python 找不到

确认 `py -3` 或 `python --version` 成功。也可以设置 `MOTION_ASR_BOOTSTRAP_PYTHON` 为 Python 的绝对路径。

### Chrome 找不到

安装标准版 Chrome，或设置 Remotion 使用的浏览器路径。预览和项目管理仍可启动，但正式渲染检查不会通过。

### FFmpeg 不在 PATH

这是正常情况。程序优先使用项目 npm 依赖里的 FFmpeg/FFprobe。只有使用自定义版本时才设置对应环境变量。

## 12. 发布前检查

1. `npm run build` 与 `npm test` 通过。
2. 运行 `npm run package:source`。
3. 确认 ZIP 包含 `setup.ps1`、`start.bat`、环境文档和 ASR 文档。
4. 确认 ZIP 不包含 `node_modules`、`dist`、`runtime/asr-env`、`runtime/models`、`model.bin`、项目视频和缓存。
5. 在没有 MotionMaster 缓存的新目录中完成一次首次启动验收。
