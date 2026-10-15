# Roadmap

## Implemented in 0.2.0-beta.1

- Visual editor using native Home Assistant selectors and a live card preview.
- Grouped equipment mappings, editable labels and local pool photo.
- Automatic / always show / hide section visibility.
- Card and panel layouts, accent colors and optional navigation.
- Domain and configuration validation; no automatic equipment selection.
- Explicit temperature units and heater limit/step handling.
- MIT license, HACS manifest, examples, contribution and issue templates.
- Automated configuration, editor preservation and command-routing checks.
- Tagged release workflow with a single JavaScript module.
- Real Home Assistant editor save/reopen, native selector and section-visibility verification.
- Tablet landscape/portrait and embedded-card layout checks.

## Public beta and HACS follow-up

- Repository files and both initial commits reviewed for household configuration, private photographs and credential markers.
- Add repository description and searchable topics on GitHub.
- Confirm supported OmniLogic integration version and minimum Home Assistant version.
- Publish the beta JavaScript asset after automated checks pass.
- Test installation through a HACS custom repository once the repository is public.
- Consider HACS default listing after custom-repository installation works.

## Later

- Configurable action/domain adapters, including `climate` heaters, followed by tests on additional controllers.
- Optional entity suggestions constrained to the selected pool device.
- Localization and additional appearance presets.

## References

- https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- https://www.hacs.xyz/docs/publish/start/
- https://www.hacs.xyz/docs/publish/plugin/
