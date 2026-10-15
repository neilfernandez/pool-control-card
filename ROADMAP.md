# Roadmap

## 1. Visual card editor

- Use Home Assistant's supported custom-card editor APIs and native selectors.
- Group entity pickers by temperature/heating, circulation, lighting and chlorination.
- Configure title, photo, visible sections and appearance with a live preview.
- Offer safe starter configuration without selecting unrelated equipment.
- Preserve advanced YAML configuration.

## 2. Reusable card

- Remove remaining controller-specific assumptions from presentation and configuration.
- Hide equipment sections and controls that are not configured.
- Use entity units and equipment limits, including Fahrenheit and Celsius.
- Add embedded-card and full-dashboard layouts; configurable optional navigation.
- Validate action entity domains and supported controls.
- Migrate the existing local installation using explicit private configuration.
- Test unavailable/unknown states, service mode, disconnections, failed commands and canceled confirmations using mocks, then verify tablet layouts.

## 3. Public release preparation

- Select license and document supported controllers and minimum Home Assistant version.
- Add generic demo assets, screenshots and example configurations.
- Produce versioned JavaScript releases, HACS metadata and validation checks.
- Document installation, configuration, upgrades and troubleshooting.
- Review the complete repository history for household data before any visibility change.
- Release initially via a HACS custom repository; consider default listing later.
- Obtain explicit approval before changing repository visibility to public.

## References

- https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- https://www.hacs.xyz/docs/publish/plugin/
- https://github.com/ngocjohn/vehicle-status-card
