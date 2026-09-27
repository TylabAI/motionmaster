# MotionMaster 本地 ASR 模型下载与使用规范

## 1. 交付约定

MotionMaster 的源码包不包含 Whisper 模型权重，也不提交 Python 虚拟环境。以下目录属于每台电脑首次运行后生成的本地文件：

```text
runtime/
├─ asr-env/                              faster-whisper 独立 Python 环境
├─ models/
│  └─ faster-whisper-large-v3-turbo/     默认模型权重
└─ semantic-cut-asr.py                   本地逐词转录入口
```

`.gitignore` 必须排除 `runtime/asr-env/` 和 `runtime/models/`。制作源码 ZIP 时也必须排除这两个目录。项目目录只保存转录结果，不复制模型权重。

## 2. 首次启动行为

用户双击 `start.bat`，或运行 `npm start` / `npm run dev` 时，程序按以下顺序准备本地 ASR：

1. 检查 `runtime/asr-env`；缺失时使用本机 Python 3 创建独立虚拟环境。
2. 检查 `faster-whisper 1.2.1`；缺失时通过 pip 安装。
3. 检查默认模型目录 `runtime/models/faster-whisper-large-v3-turbo`。
4. 模型缺失或不完整时，从 Hugging Face 下载 `large-v3-turbo`，约 1.62 GB。
5. 校验 `config.json`、`model.bin` 和 `tokenizer.json`，通过后再标记为可用。
6. 后续启动只执行快速完整性检查，不重复下载。

下载失败不会删除项目或改写时间轴。编辑台可以继续启动，并在下次启动时重试。也可以联网后手工运行：

```powershell
npm run bootstrap:asr
```

需要让准备失败直接返回错误码时使用：

```powershell
node scripts/bootstrap-asr.mjs --strict
```

## 3. 系统要求

- Node.js 20 或更高版本。
- Python 3.10–3.13；可通过 `py -3`、`python` 或 `python3` 调用。
- 首次安装 Python 依赖和模型时可访问 PyPI 与 Hugging Face。
- 系统盘和源码所在磁盘需保留足够空间；默认模型及运行环境建议预留至少 4 GB。

如果 Python 不在 PATH，可指定：

```powershell
$env:MOTION_ASR_BOOTSTRAP_PYTHON='D:\Python312\python.exe'
npm run bootstrap:asr
```

## 4. 默认配置

首次创建设置文件时采用：

```json
{
  "provider": "local-faster-whisper",
  "local": {
    "model": "runtime/models/faster-whisper-large-v3-turbo",
    "device": "cpu",
    "computeType": "int8",
    "language": "zh",
    "initialPrompt": ""
  }
}
```

设置保存在项目数据根目录的 `.motion-master-settings.json`，不进入源码包。已有安装如果已经保存过设置，会继续使用用户原来的模型选择；删除或修改该设置后才会采用新默认值。

## 5. 模型选择与下载

| 模型 | 约占磁盘 | 使用建议 |
|---|---:|---|
| `medium` | 1.53 GB | 资源较少时使用 |
| `large-v3-turbo` | 1.62 GB | 默认；准确率和速度平衡 |
| `large-v3` | 3.09 GB | 准确率优先，速度较慢 |

默认模型由首次启动脚本下载到固定目录。右上角“设置 → 语音识别与字幕”固定列出 `medium`、`large-v3-turbo` 和 `large-v3`，不要求用户填写名称。已安装模型可以直接选择；未安装模型会先显示体积并询问是否下载。

也可以使用准备脚本下载到明确目录：

```powershell
runtime\asr-env\Scripts\python.exe scripts\prepare-semantic-asr.py `
  --model large-v3 `
  --output-dir runtime\models\faster-whisper-large-v3
```

下载完成后在设置页点击“刷新模型”，`Large V3` 会显示“已安装”，然后直接选择。

## 6. 模型识别与刷新

点击“刷新模型”会重新扫描并校验：

- `runtime/models/faster-whisper-<模型名>`；
- `runtime/models/<模型名>`，便于用户手工放置；
- `runtime/models/models--<组织>--<仓库>/snapshots/<版本>`，兼容已有 Hugging Face 缓存。

程序在下载前先执行同一套扫描。如果已经发现完整的 `config.json`、`model.bin` 和 `tokenizer.json`，会直接复用并标记“已安装”，不会重复下载。存在目录但文件缺失或 `model.bin` 明显不完整时显示“文件不完整”，用户确认后才修复下载。

## 7. 离线电脑部署

联网电脑先运行 `npm run bootstrap:asr`。确认模型完整后，将以下两个目录复制到离线电脑相同位置：

```text
runtime/asr-env/
runtime/models/faster-whisper-large-v3-turbo/
```

Python 虚拟环境通常只能在相同 Windows 架构和相近安装路径下直接复用。更稳妥的做法是在离线电脑单独安装 Python 依赖，只复制模型目录。复制完成后运行：

```powershell
runtime\asr-env\Scripts\python.exe scripts\prepare-semantic-asr.py `
  --model large-v3-turbo `
  --output-dir runtime\models\faster-whisper-large-v3-turbo `
  --verify-only
```

## 8. 删除与重新下载

关闭 MotionMaster 后，可以删除某个模型目录释放空间。不要删除项目内的 `transcript` 或 `analysis`，它们是已经生成的转录与粗剪记录。

重新下载默认模型：

```powershell
Remove-Item -LiteralPath runtime\models\faster-whisper-large-v3-turbo -Recurse -Force
npm run bootstrap:asr
```

## 9. 时间戳契约

Whisper 模型生成的是字幕、章节导航和语义粗剪使用的逐词时间戳。主视频轨道的总时长来自 FFprobe，粗剪主轨道来自 `editPlan.keptRanges`，不会因为更换 ASR 模型而丢失。

MotionMaster 必须以 `word_timestamps=true` 运行 faster-whisper。只有文本或句级时间的结果不能进入自动粗剪；失败时保留原项目轨道并明确报错。

## 10. 故障排查

### 找不到 Python

安装 Python 3.10–3.13，并确认 `py -3` 或 `python --version` 可执行；也可以设置 `MOTION_ASR_BOOTSTRAP_PYTHON`。

### 下载中断

保留未完成目录，重新运行 `npm run bootstrap:asr`。下载器会复用已完成文件。若校验持续失败，关闭程序后删除目标模型目录再重试。

### Hugging Face 无法访问

先确认代理或网络能访问 `huggingface.co`。企业环境可以配置标准 `HTTPS_PROXY`，或在联网电脑下载后按“离线电脑部署”复制模型。

### CPU 转录太慢

默认 `cpu + int8` 兼容性最高。有 NVIDIA CUDA 环境时，可在设置页切换 `cuda`，并根据显卡运行库选择 `float16` 或 `int8_float16`。更改设备不会改变字幕时间轴的数据格式。

## 11. 发布验收

每次制作源码交付包必须确认：

1. ZIP 内不存在 `model.bin`、`runtime/models` 和 `runtime/asr-env`。
2. 新目录解压后运行 `start.bat` 会准备依赖并尝试下载 `large-v3-turbo`。
3. 第二次启动不会重复下载。
4. 断网加载已下载模型成功。
5. 本地转录输出真实逐词 `start/end`，字幕和粗剪没有伪造时间戳。
