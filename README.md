# dsh-locale-be

Belarusian (`be`) language pack for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web UI.

[Чытаць па-беларуску](README.be.md)

- **60 namespaces, 2713 UI strings** — chat, settings, models, plugins, skills, MCP, sessions, diagnostics, shortcuts.
- Registers the language through the public `ctx.locale` API. No host code, network calls, credentials, or telemetry.
- Tested with DSH `0.2.1-rc.2` on Windows 11 and Node.js 22.

## Install

Requirements: DSH `0.2.1-rc.2` or newer and `pnpm` (the `dsh plugin` command uses it).

```sh
dsh plugin --profile web add github:yurashet/dsh-locale-be
dsh web
```

The bundle inserts the language pack and selects Belarusian by default. If the UI is still in another language, open **Settings → General → Language** and choose **Беларуская**.

For a reproducible install, pin a commit:

```sh
dsh plugin --profile web add github:yurashet/dsh-locale-be#<40-character-commit-sha>
```

From a local checkout:

```sh
git clone https://github.com/yurashet/dsh-locale-be.git
dsh plugin --profile web add ./dsh-locale-be
```

## Update

```sh
dsh plugin --profile web add github:yurashet/dsh-locale-be
dsh web
```

Re-adding resolves the default branch again. Pin a commit if you want to control exactly which revision runs.

## Uninstall

```sh
dsh plugin --profile web remove dsh-client-locale-be
dsh web
```

## What is translated

| Area | Examples |
|---|---|
| Chat and conversations | messages, statuses, buttons, hints, queue handling |
| Settings | general, models, theme, language, permissions, installed plugins |
| Workspace | files, terminal, code/PDF/table/image viewers |
| Agents and teams | subagents, workflows, task queues, run states |
| Skills and MCP | skill catalog, MCP server setup and settings |
| History and diagnostics | sessions, request traces, token usage, errors |
| Shortcuts | slash menu, keyboard shortcuts, hints |

Technical tokens — URLs, protocol names, error codes, and dynamic model labels — intentionally stay in Latin script.

## Known limitations

- Some runtime-generated model labels may remain in English until DSH exposes them as locale keys.
- DSH `0.2.x` can rewrite `cordis.patch.yml` when you save **Settings → Models**. After saving, check that the `be-locale` insert and `locale.preference: be` are still present.
- The translation favours clear, everyday Belarusian over literal calques. Terminology suggestions are welcome.

## How it works

`lib/client.js` is a small client plugin:

```js
export const inject = ['locale']

export function apply(ctx) {
  ctx.effect(
    () => ctx.locale.addLanguage({ id: 'be', label: 'Беларуская', fallback: 'en' }),
    'be-locale: language',
  )
  // ctx.locale.register(namespace, 'be', dictionary) for every namespace
}
```

`cordis.patch.yml` inserts the plugin and sets the default preference. The full dictionary lives in `translations.be.json`; `lib/client.js` is generated from it.

## Development

No dependencies are required.

```sh
npm test          # validate the dictionary, manifest, patch, and generated bundle
npm run build     # regenerate lib/client.js from translations.be.json
npm run build:check
```

To contribute a translation fix:

1. Edit `translations.be.json`.
2. Keep placeholders such as `{name}`, `{count}`, and `{message}` unchanged.
3. Keep plural keys (`.one`, `.other`) paired.
4. Run `npm test`.
5. Open a pull request.

## Security

The plugin is client-only. It registers language definitions and dictionaries through the public locale service and does not read files, make network requests, or access credentials. As with any DSH plugin, install from a trusted source and pin a commit when reproducibility matters.

## License

MIT. See [LICENSE](LICENSE).

The UI strings originate from the MIT-licensed DeepSeek Harness project. This repository contains only the Belarusian translation and the small registration plugin.
