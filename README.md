# dsh-sisyphus

English | [中文](README.zh.md)

Sisyphus orchestration **agent preset** for [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/) (`dsh`).

An agent running this preset orchestrates instead of editing directly: it classifies every request first (intent gate), decomposes work into atomic units, delegates each unit to a specialist subagent, runs independent delegations in parallel, and verifies results before calling them done.

## Inspiration

The Sisyphus working style — intent-gated routing, decompose-and-delegate to specialists, parallel execution, and the evidence loop — comes from OhMyOpenCode's (ohmy openagent) Sisyphus agent as used on top of opencode. This preset migrates that orchestration style to DeepSeek Harness, reusing dsh's own subagent capability seam instead of changing its main loop.

## What it gives you

| Specialist subagent | Domain | Recursion |
|---|---|---|
| `explore` | codebase search — where is X, how does Y work | leaf (`maxDepth: 1`) |
| `librarian` | external docs, library best practices, OSS examples | leaf |
| `oracle` | hard reasoning, architecture decisions, debugging | leaf |
| `plan_reviewer` | critiques work plans for gaps and ambiguity | leaf |
| `implementer` | concrete edits following existing patterns | may delegate (`3`) |
| `subagent` | general delegated work | `3` |
| `subagent_fork` | delegated work with the parent's completed history | — |

All specialists run in **continuable background mode**: the model starts independent delegations together and keeps working while they run; each returns a durable child id the model can continue via `send_message`, with `list_agents` for status. The leaf specialists accept exactly one call each and cannot delegate further.

The persona also encodes the Sisyphus working discipline: intent gate, decompose-and-delegate, parallel execution, session continuity, an evidence loop ("no evidence = not done"), and a six-part delegation prompt (`TASK` / `EXPECTED OUTCOME` / `REQUIRED TOOLS` / `MUST DO` / `MUST NOT DO` / `CONTEXT`).

## Install

This repo is the preset itself. Installing copies the preset directory into the dsh agent-presets root.

### One command

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

### Manual

`$DSH_HOME` defaults to `~/.dsh` (Windows: `$env:USERPROFILE\.dsh`). Copy the preset directory itself, flat — dsh scans only one level, so the target must be `.agent-presets/sisyphus`, never `.agent-presets/presets/sisyphus`:

```sh
cp -r presets/sisyphus "$DSH_HOME/.agent-presets/sisyphus"
```

Then restart dsh. A new session can pick Sisyphus in the UI, or set it as the default in the user settings document:

```yaml
agent-presets:
  default: sisyphus
```

### From a git dependency (alternative)

```sh
dsh plugin --profile web add github:wyhgoodjob/dsh-sisyphus
```

and point the roster at the installed package:

```yaml
- name: '@deepseek-ai/dsh-agent-presets'
  config:
    default: sisyphus
    roots:
      - path: <profile-node_modules>/dsh-sisyphus/presets
        trust: user
```

## Requirements

- DeepSeek Harness with the `spawn` and `fork` subagent backends in its host composition (both ship with the standard app).
- The subagent providers must advertise `depthLimit`, `persona`, `toolFilter`, and `prepareContinuable` capability — the in-process `spawn`/`fork` backends do.

## Model experience

The preset adds no schema of its own; token and KV-cache effects come from the plugins it composes. Every continuable specialist instance adds one `tool:<toolName>` prompt section (parallel-delegation guidance) and one schema, paid per parent request. The persona text replaces the deployment persona.

## Known limitations and deferred work

- **Specialists are soft-constrained by persona, not hard tool filters.** The leaf specialists (`explore`, `librarian`, `oracle`, `plan_reviewer`) are instructed not to edit, but they still carry the shell and filesystem tools; a `toolFilter` allow-list per specialist is planned and omitted only to avoid failing preset load on a host whose tool names differ.
- **Continuable fork invalidates some inherited KV-cache reuse** (upstream `dsh` issue #2124); the `subagent_fork` instance accepts that cost.
- **Model selection is not enabled** on the `subagent`/`implementer` instances (`modelSelectionSettings: false`), so children inherit the parent route.

## License

MIT