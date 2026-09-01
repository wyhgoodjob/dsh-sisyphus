# 本地测试 dsh-sisyphus

[English](TESTING.md) | 中文

对 Sisyphus preset 做一轮手工端到端验证。前提是已构建的 DeepSeek Harness 与一个 DeepSeek API key;下面每一步都在开发期间跑通过,其中场景 S2 正是该 preset 携带的验收检查。

## 前置条件

- Node `^22.19 || >=24`、pnpm `11.x`
- 一个 deepseek-harness 检出目录,依赖已安装并构建过一次:
  ```sh
  cd ~/deepseek-harness
  pnpm install
  pnpm run build      # 生成启动所需的 lib/ 产物(typert 等)
  ```
- `~/deepseek-harness/.env` 中有 `DEEPSEEK_API_KEY=sk-...`(该文件已被 gitignore;除此之外不要把 key 贴到任何地方)

## 安装

在仓库根目录:

```sh
git clone https://github.com/wyhgoodjob/dsh-sisyphus.git
cd dsh-sisyphus
./install.sh                      # Windows: .\install.ps1
```

这会把 preset **平铺**复制到 `~/.dsh/.agent-presets/sisyphus/`。确认目录结构恰好只有一层:

```sh
ls ~/.dsh/.agent-presets/sisyphus   # agent.cordis.yml  preset.yml
```

如果看到的是 `~/.dsh/.agent-presets/sisyphus/sisyphus/...` 或 `.../presets/...`,说明多套了一层,dsh 将无法发现该 preset。

## 启动

```sh
cd ~/deepseek-harness
pnpm dsh web
```

进程会打印一次性 URL,类似 `dsh web: http://127.0.0.1:3099/?token=...`。在浏览器打开**这条完整 URL**;直接访问 `http://127.0.0.1:3080` 会被信任栅栏拒绝。

## 选择 preset

**新建一个会话**,在 preset 选择器里选 **Sisyphus**。(会话只有在还没产生任何内容时才能切换 preset。)可选的:在用户设置文档中把它设为默认:

```yaml
agent-presets:
  default: sisyphus
```

## 测试场景

### S1 — 身份(预期不调用工具)

```
一句话:你是谁、平时怎么干活?
```

预期:回答描述的是一个**编排 Agent**(分类 → 委托专家 → 验证),而不是自己动手改文件的普通编码 agent。若回答是"读取并编辑文件的 coding agent",说明跑的还是 `standard` preset 而非 `sisyphus`。

### S2 — 并行专家委托(验收检查)

```
用 explore 工具调用两次,一个问题一次,run_in_background 设为 false。
(1) 哪个包目录声明了 plan/mode 会话事件?
(2) sessions.fork API 的家在哪个文件?
用一行报告:1=<答案1> 2=<答案2>
```

预期证据:

- transcript 中出现**两次 `explore` 工具调用**(子代理运行,在委托/子代理 UI 可见),且**没有工具错误**。
- 最终回答为 `1=packages/plan/plan-mode 2=packages/core/session/src/index.ts`(对应当前 harness;若 harness 代码挪动,答案可能变化——请评判机制而非具体字符串)。

如果模型直接 grep 而没有出现 `explore` 调用,说明 preset 没在驱动委派——先确认选择器里是 Sisyphus(S1),再从仓库 HEAD 重装(`maxDepth` 修复)。

### S3 — 后台委托与会话连续性(可选,进阶)

```
先后台启动一个 explore 子代理(run_in_background 保持默认 true),
查 goal round driver 住在哪;等它跑的同时,用 implementer 子代理给一个
临时文件加一行注释。等 explore 结果到达后,用 send_message 让同一个
explore 子代理继续列出那个包里的文件。
```

预期:后台子代理结束有结算通知;`send_message` 继续的是**同一个**子代理 id 而不是新开一个;`list_agents` 能看到这些子代理。

## 卸载

1. 删除 preset 目录:
   ```sh
   rm -rf ~/.dsh/.agent-presets/sisyphus
   ```
2. 若设置过默认,从设置文档中移除 `agent-presets.default` 条目。
3. 若走的是 git 依赖安装路径,还应从 profile 中移除:
   ```sh
   dsh plugin --profile web remove dsh-sisyphus
   ```
4. 重启 dsh。已运行的会话保留其组合;与 preset 相关的一切只对新会话生效。

## 故障排查

| 症状 | 原因 / 处理 |
|---|---|
| 选择器里没有这个 preset | 复制多套了一层(见安装);dsh 只扫描 `.agent-presets/` 下的一级目录 |
| preset 以 broken 原因列出 | 选择器会显示具体失败行——提交 issue 时请附上该原因 |
| 子代理调用报 depth 错误 | 你的副本早于 `maxDepth` 修复;从仓库 HEAD 重跑 `install.sh` |
| 网页 401 | 打开启动时打印的 `?token=...` URL,而不是裸 localhost 地址 |
| 模型调用报 AUTH | `~/deepseek-harness/.env` 里 key 缺失或格式错误 |
| Windows | 用 `.\install.ps1`;shell 走 pwsh(win32 上 bash 被禁用) |

## 关于自动化检查

本 preset 仓库不含 CI 驱动的 harness 启动(pure data);开发期验证用的是 harness 自带的挂载与重放机制(在 harness 检出目录里的一次性 spec)+ `deepseek-official` 上的真实模型运行——两者都记载于本仓库编写时对应的 harness 检出目录中的设计文档 `dsh-main-loop-sisyphus-spec.md` 第 9 节。

## 许可证

MIT