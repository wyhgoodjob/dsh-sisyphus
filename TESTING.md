# Testing dsh-sisyphus locally

A manual end-to-end pass over the Sisyphus preset. You need a built DeepSeek Harness and a DeepSeek API key; every step below was run during development, and scenario S2 is the exact acceptance check the preset carries.

## Prerequisites

- Node `^22.19 || >=24`, pnpm `11.x`
- A deepseek-harness checkout with dependencies installed and built once:
  ```sh
  cd ~/deepseek-harness
  pnpm install
  pnpm run build      # generates lib/ artifacts the launch needs (typert etc.)
  ```
- `DEEPSEEK_API_KEY=sk-...` in `~/deepseek-harness/.env` (that file is gitignored; never paste the key anywhere else)

## Install

From the repo root:

```sh
git clone https://github.com/wyhgoodjob/dsh-sisyphus.git
cd dsh-sisyphus
./install.sh                      # Windows: .\install.ps1
```

This copies the preset flat into `~/.dsh/.agent-presets/sisyphus/`. Verify the layout is exactly one level:

```sh
ls ~/.dsh/.agent-presets/sisyphus   # agent.cordis.yml  preset.yml
```

If you instead see `~/.dsh/.agent-presets/sisyphus/sisyphus/...` or `.../presets/...`, the copy was nested one level too deep and dsh will not discover the preset.

## Start

```sh
cd ~/deepseek-harness
pnpm dsh web
```

The process prints the URL to open, for example `dsh web: http://127.0.0.1:3099/?token=...`. Open **that exact URL** in a browser — the address, port, and any query come from what your dsh installation configured at startup, and a hand-built address may not match.

## Select the preset

Create a **new session** and pick **Sisyphus** in the preset picker. (A session can only switch presets while it has produced nothing.) Optionally set the default in the user settings document:

```yaml
agent-presets:
  default: sisyphus
```

## Scenarios

### S1 — identity (no tools expected)

```
In one short sentence: who are you and how do you usually get work done?
```

Expected: an answer describing an **orchestration agent** (classify, delegate to specialists, verify) — not a plain coding agent that edits files itself. A plain "coding agent that reads and edits" answer means the `standard` preset is running, not `sisyphus`.

### S2 — parallel specialist delegation (the acceptance check)

```
Call the explore tool twice, once per question, with run_in_background set to
false. (1) Which package directory declares the plan/mode session event?
(2) Which file is the home of the sessions.fork API?
Report in one line: 1=<answer1> 2=<answer2>
```

Expected evidence:

- The transcript shows **two `explore` tool calls** (subagent runs, visible in the delegation/subagent UI) and **no tool errors**.
- Final answer is `1=packages/plan/plan-mode 2=packages/core/session/src/index.ts` (correct for the current harness; answers may shift if the harness moves code — judge the mechanism, not the exact strings).

If the model instead greps directly and the transcript shows no `explore` calls, the preset is not driving delegation — check the picker shows Sisyphus (S1) and re-install from the repo HEAD (the `maxDepth` fix).

### S3 — background delegation and session continuity (optional, advanced)

```
Start an explore child in the background (run_in_background left default/true)
asking where the goal round driver lives. While it runs, use the implementer
child to add a small comment to a scratch file. When the explore result
arrives, ask the same explore child through send_message to also list the
files in that package.
```

Expected: the background child settles with a notice; `send_message` continues the **same** child id instead of spawning a new one; `list_agents` shows the children.

## Uninstall

1. Remove the preset directory:
   ```sh
   rm -rf ~/.dsh/.agent-presets/sisyphus
   ```
2. If you set a default, remove the `agent-presets.default` entry from the settings document.
3. If you installed via the git-dependency path, also remove it from the profile:
   ```sh
   dsh plugin --profile web remove dsh-sisyphus
   ```
4. Restart dsh. Sessions already running keep their composition; anything preset-related applies to new sessions only.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Preset absent from the picker | nested copy (see Install); dsh scans only one level under `.agent-presets/` |
| Preset listed with a broken reason | the picker shows the failing rows — paste the reason when filing an issue |
| Subagent calls fail with a depth error | your copy predates the `maxDepth` fix; re-run `install.sh` from repo HEAD |
| Every delegation fails with `prompt section "tool:report" is already registered in this scope` | your copy still contains the `tool-subagent-report` row removed in the host-collision fix; re-run `install.sh` from repo HEAD |
| Web page answers 401 | open the exact URL the process printed at startup, not a hand-built localhost address |
| Model calls fail with AUTH | key missing or malformed in `~/deepseek-harness/.env` |
| Windows | use `.\install.ps1`; shell runs through pwsh (bash is disabled on win32) |

## About the automated checks

The preset repo ships no CI-driven harness boot (it is pure data). `tests/tool-report-collision.spec.ts` is a runnable regression spec for the one known collision class (preset vs host-plane `tool-subagent-report`); it imports harness packages, so it runs inside a built deepseek-harness checkout as described in its header. The development validation (real mount + real-model run on `deepseek-official`) is described in the design document `dsh-main-loop-sisyphus-spec.md` (section 9) of the harness checkout this repo was authored against.

## License

MIT