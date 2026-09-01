# dsh-sisyphus

Sisyphus orchestration **agent preset** for [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/) (`dsh`).

An agent running this preset orchestrates instead of editing directly: it classifies every request first (intent gate), decomposes work into atomic units, delegates each unit to a specialist subagent, runs independent delegations in parallel, and verifies results before calling them done.

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

All specialists run in **continuable background mode**: the model starts independent delegations together and keeps working while they run; each returns a durable child id the model can continue via `send_message`, with `list_agents` for status.

The persona also encodes the Sisyphus working discipline: intent gate, decompose-and-delegate, parallel execution, session continuity, an evidence loop ("no evidence = not done"), and a six-part delegation prompt (`TASK` / `EXPECTED OUTCOME` / `REQUIRED TOOLS` / `MUST DO` / `MUST NOT DO` / `CONTEXT`).

## Install

The preset is a directory — `presets/sisyphus/` — composed of one `agent.cordis.yml` and a `preset.yml`. Three ways to install it:

### 1. Copy into your preset root (stood up, no config)

```sh
mkdir -p "$DSH_HOME/.agent-presets"
cp -r presets/sisyphus "$DSH_HOME/.agent-presets/sisyphus"
```

(`DSH_HOME` defaults to `~/.dsh`; `~` is fine on POSIX shells.)

### 2. Point the roster at this package

```sh
dsh plugin --profile <name> add dsh-sisyphus
```

then configure the agent-presets row's `roots` to the installed package's `presets/` directory:

```yaml
- name: '@deepseek-ai/dsh-agent-presets'
  config:
    default: sisyphus
    roots:
      - path: <path-to-node_modules>/dsh-sisyphus/presets
        trust: user
```

### 3. Make it the default per user

```yaml
agent-presets:
  default: sisyphus
```

Only a new session (or a blank one via the UI) picks up the change; running sessions keep their composition.

## Requirements

- DeepSeek Harness with the `spawn` and `fork` subagent backends in its host composition (both ship with the standard app).
- The subagent providers must advertise `persona` and `toolFilter` capability — the in-process `spawn`/`fork` backends do.

## Model experience

The preset adds no schema of its own; token and KV-cache effects come from the plugins it composes. Every continuable specialist instance adds one `tool:<toolName>` prompt section (parallel-delegation guidance) and one schema, paid per parent request. The persona text replaces the deployment persona.

## Known limitations and deferred work

- **Specialists are soft-constrained by persona, not hard tool filters.** The leaf specialists (`explore`, `librarian`, `oracle`, `plan_reviewer`) are instructed not to edit, but they still carry the shell and filesystem tools; a `toolFilter` allow-list per specialist is planned and omitted only to avoid failing preset load on a host whose tool names differ.
- **Continuable fork invalidates some inherited KV-cache reuse** (upstream `issue #2124`); the `subagent_fork` instance accepts that cost.
- **Model selection is not enabled** on the `subagent`/`implementer` instances (`modelSelectionSettings: false`), so children inherit the parent route.

## License

MIT