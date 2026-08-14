# @deepseek-ai/dsh-client-ui-background

[English](README.md) | 中文

独立的对话背景插件：允许用户为聊天列设置一张全局壁纸、调整叠加在它上面的可读性遮罩强度，并可一键清除；以上都持久化在用户设置文档中。它是一个纯 CSS/UI 增强——**绝不改动 stock 对话 shell 的源码**，而是通过匹配稳定的 data 属性来覆盖渲染出的 DOM，并通过文档根上的 CSS 变量绘制壁纸。

## 它做了什么

它的 node 半注册 `chat-background` 设置命名空间（字段 `imageDataUrl`、`opacity`）。它的浏览器半绑定该命名空间，把当前快照写入文档根（`document.documentElement`）上的 CSS 变量（`--dsh-bg-image`、`--dsh-bg-wash-opacity`），并安装一个插件旗下的 `<style>` 标签承载增强样式表。

样式表会：

- 通过 `[data-phase]::before` 在对话列内容之下铺满壁纸，并通过 `[data-phase]::after` 叠加可读性遮罩——两者都由那些变量驱动（因此明/暗两套配色通过遮罩强度各自保留底色）；
- 通过 `[data-phase][data-phase='active'] [data-composer-seat]` 把 docked 输入框变成悬浮孤岛：把 seat 收窄到卡片宽度、居中，并移除底部渐隐——从而左右两侧的壁纸保持可见。

因为规则匹配的是 stock 的 data 属性（`data-phase`、`data-conversation-scroll`、`data-composer-seat`），它们会优雅降级：如果未来的 shell 改了某个属性名，受影响的覆盖只是不再生效（列保持默认底色），而不会破坏 shell。

## 设置行

一个 General 设置区的行（`settings.general.item`）提供上传、可读性遮罩滑杆（0–100）和清除。文件选择由一个隐藏的 `input[type=file]` 承载，由行的按钮触发；选中的位图会先被下采样到最长边不超过 2560px，并重新编码（支持 WebP 时用 WebP，否则 JPEG），再写入设置文档，从而让设置文件与渲染列保持小巧。

本插件不暴露任何模型可见工具：它是一个纯粹的 UI/设置功能。

## 在 Harness 检出目录中安装

本仓库是源码形式的 package：其 `workspace:^` 依赖由 DeepSeek Harness 检出目录提供，因此不能通过 npm 独立安装。请先把本仓库直接 clone 到 Harness 的 package 目录，再运行 `pnpm install`：

```sh
git clone https://github.com/ropz12138/dsh-ui-background.git \
  packages/client/ui-background
```

运行安装脚本。它会将 package 注册到 web profile、暴露设置命名空间、安装依赖并构建 Client 产物：

```sh
node packages/client/ui-background/scripts/install-into-harness.mjs
pnpm dsh web
```

该脚本可重复运行。随后会在 General 设置区看到“对话背景 / Conversation background”行。

## Model Experience

无，因为背景是一个浏览器/设置界面；这里不触及任何模型请求。

#### KV Cache effect

无；本包既不组装也不发送任何 provider 请求。

## Known Limitations and Deferred Work

- **设置文档中内联 data URL**——较大图片会放大 `$DSH_HOME/settings.yaml`；2560px / 约 85% 质量的下采样是对此的约束而非消除。
- **仅全局**——背景是进程级的，不区分会话；按会话设置背景留待后续。
- **样式覆盖追踪 shell 的 data 属性**——因为插件不修改 shell 源码，它的增强依赖所匹配的 DOM 属性；shell 重构后可能需要升级本插件以重新对准目标。
