# dsh-sisyphus

[English](README.md) | 中文

面向 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/)（`dsh`）的 Sisyphus 编排 **agent preset**。

运行此 preset 的 agent 负责编排而非直接改文件:先对每条请求做意图门控(分类),把任务拆解为原子单元,每个单元委托给专家子代理,独立委托并行执行,并在宣布完成前验证结果。

## 灵感来源

Sisyphus 工作风格——意图门控路由、任务分解与专家委托、并行执行、验证闭环——源自 OhMyOpenCode(ohmy openagent)用于 opencode 之上的 Sisyphus agent。本 preset 将这一编排风格迁移到 DeepSeek Harness,复用 dsh 自带的子代理能力缝(subagent seam),而不改动其主循环。

## 提供的能力

| 专家子代理 | 擅长领域 | 递归 |
|---|---|---|
| `explore` | 代码库搜索——X 在哪、Y 如何工作 | 叶子(`maxDepth: 1`) |
| `librarian` | 外部文档、库最佳实践、开源示例 | 叶子 |
| `oracle` | 难题推理、架构决策、调试 | 叶子 |
| `plan_reviewer` | 审查工作计划中的缺口与歧义 | 叶子 |
| `implementer` | 遵循现有模式的落码实现 | 可再委托(`3`) |
| `subagent` | 通用委托任务 | `3` |
| `subagent_fork` | 继承父会话已完成历史的委托任务 | — |

所有专家都运行在 **continuable 后台模式**:模型在同一消息中并行启动多个独立委托、边等待边继续执行有用工作;每个委托返回一个持久子代理 id,可通过 `send_message` 继续推进,用 `list_agents` 查看状态。叶子专家各自只接受一次调用,且自身不能再委托。

persona 还固化了 Sisyphus 的工作纪律:意图门控、分解与委托、并行执行、会话连续性、验证闭环(「无证据不算完成」)、六段式委托提示词(`TASK` / `EXPECTED OUTCOME` / `REQUIRED TOOLS` / `MUST DO` / `MUST NOT DO` / `CONTEXT`)。

## 安装

本仓库本身就是 preset。安装即把 preset 目录复制进 dsh 的 agent-presets 根目录。

### 一键安装

```sh
git clone https://github.com/wyhgoodjob/dsh-sisyphus.git
cd dsh-sisyphus
./install.sh
```

```powershell
git clone https://github.com/wyhgoodjob/dsh-sisyphus.git
cd dsh-sisyphus
.\install.ps1
```

### 手动安装

`$DSH_HOME` 默认为 `~/.dsh`(Windows 为 `$env:USERPROFILE\.dsh`)。复制的是 preset 目录本身,必须**平铺**——dsh 只扫描一级子目录,目标必须是 `.agent-presets/sisyphus`,不能是 `.agent-presets/presets/sisyphus`:

```sh
cp -r presets/sisyphus "$DSH_HOME/.agent-presets/sisyphus"
```

然后重启 dsh。新会话可在 UI 中选择 Sisyphus,或在用户设置文档中将其设为默认:

```yaml
agent-presets:
  default: sisyphus
```

### 以 git 依赖方式安装(备选)

```sh
dsh plugin --profile web add github:wyhgoodjob/dsh-sisyphus
```

再将 roster 指向已安装的包:

```yaml
- name: '@deepseek-ai/dsh-agent-presets'
  config:
    default: sisyphus
    roots:
      - path: <profile-node_modules>/dsh-sisyphus/presets
        trust: user
```

## 环境要求

- DeepSeek Harness,其 host 组合中包含 `spawn` 与 `fork` 子代理后端(标准应用自带)。
- 子代理 provider 需具备 `depthLimit`、`persona`、`toolFilter`、`prepareContinuable` 能力——进程内 `spawn`/`fork` 后端均满足。

## 模型体验

本 preset 不新增任何自有 schema;token 与 KV-cache 影响来自其组合的插件。每个 continuable 专家实例会新增一个 `tool:<toolName>` 提示词段(并行委托指引)与一个 schema,每次父请求都要支付。persona 文本会替换部署默认的 persona。

## 已知限制与待办

- **专家仅靠 persona 软约束,没有硬性工具过滤器。** 叶子专家(`explore`、`librarian`、`oracle`、`plan_reviewer`)被指示不得改文件,但仍携带 shell 与文件系统工具;计划为每个专家配置 `toolFilter` allow-list,暂缓只是为了兼容工具名不同的宿主组合而不至于加载失败。
- **continuable fork 会使部分继承 KV-cache 失效**(上游 dsh issue #2124);`subagent_fork` 实例接受这一代价。
- **未开启模型选择** (`subagent`/`implementer` 实例的 `modelSelectionSettings: false`),子代理沿用父级路由。

## 许可证

MIT