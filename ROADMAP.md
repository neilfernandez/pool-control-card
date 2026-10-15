# Roadmap

## Implemented in 0.2.0 development

- Visual editor using native Home Assistant selectors and a live card preview.
- Grouped equipment mappings, editable labels and local pool photo.
- Automatic / always show / hide section visibility.
- Card and panel layouts, accent colors and optional navigation.
- Domain and configuration validation; no automatic equipment selection.
- Explicit temperature units and heater limit/step handling.
- MIT license, HACS manifest, examples, contribution and issue templates.
- Automated configuration, editor preservation and command-routing checks.
- Draft release workflow with a single JavaScript module.
- Real Home Assistant editor save/reopen, native selector and section-visibility verification.
- Tablet landscape/portrait and embedded-card layout checks.

## Before a public release

- Review repository history and assets for private household data.
- Add repository description and searchable topics on GitHub.
- Confirm supported OmniLogic integration version and minimum Home Assistant version.
- Tag and review a draft release, then explicitly approve publishing and repository visibility.
- Test installation through a HACS custom repository once the repository is public.
- Consider HACS default listing after custom-repository installation works.

## Later

- Additional controller adapters after testing.
- Optional entity suggestions constrained to the selected pool device.
- Localization and additional appearance presets.

## References

- https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- https://www.hacs.xyz/docs/publish/start/
- https://www.hacs.xyz/docs/publish/plugin/
