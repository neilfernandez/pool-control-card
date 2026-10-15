# Contributing

Pool Control Card is an early public beta. The first supported controller target is Hayward OmniLogic Local / OmniPL. Additional integrations need explicit testing before being listed as supported.

## Work locally

Use Node.js 22 or later. The card has no runtime or development package dependencies and no build step.

```sh
npm run check
npm test
```

Register the root `pool-control-card.js` file as a JavaScript module in a development Home Assistant instance. Change its resource query string after deploying changes and reload the browser.

## Verify changes

- Use the visual editor and YAML editor, including save/reopen and entity removal.
- Check card and panel layouts at tablet landscape, tablet portrait and narrow widths.
- Keep equipment commands behind the existing confirmation and availability checks.
- Test service dispatch using a simulated Home Assistant client before any authorized hardware test.
- Do not commit personal photographs, real household mappings, credentials or dashboard exports.

`examples/demo.html` is a standalone simulated card preview. Run `npm run demo` and open the localhost address it prints; it never connects to Home Assistant. Demo button presses only update the simulated client.

## Releases

Keep `POOL_VERSION`, `package.json` and `CHANGELOG.md` aligned. A `v` tag matching the package version triggers checks and publishes a GitHub release containing the JavaScript module after checks pass. Prerelease version tags are marked as prereleases. Review the source, release notes and tests before pushing a tag. There is no automated repository visibility change or HACS listing submission.

Public release also requires a description and relevant GitHub topics, a full history review for household data, and confirmation that documentation matches actual supported behavior. See [ROADMAP.md](ROADMAP.md).
