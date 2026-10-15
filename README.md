# Pool Control Card

A custom Home Assistant pool dashboard card with a photo-led tablet layout, live equipment status, and pool controls.

**Status: private development prototype.** The visual configuration editor and public release packaging are planned. This is not a finished HACS release.

## Current prototype

- Water and air temperature, heater target and heating status.
- Pump status, speed controls, presets, flow and power.
- Pool light effects and landscape lighting.
- Salt readings, chlorination status and output controls.
- Confirmations for pump, heating and chlorinator changes, with connection/service-mode checks.
- Responsive landscape and portrait layouts.

Initial development targets Hayward OmniLogic Local / OmniPL entity conventions. Other controllers have not been validated. Some labels, unit fallbacks and equipment attributes still require generalization.

## Development installation

1. Copy `pool-control-card.js` into Home Assistant's `config/www/` directory.
2. Register `/local/pool-control-card.js` as a JavaScript module under dashboard resources.
3. Add a manual card with `type: custom:pool-control-card` and map `entities` to your own entities.
4. Optionally set `image` to your own `/local/` image path.

Entity mappings are empty by default. Missing entities render unavailable and their controls are disabled. The current layout still shows all equipment sections. Use a panel view for the existing full dashboard layout.

```yaml
type: custom:pool-control-card
image: /local/your-pool-image.jpg
entities:
  water: sensor.example_pool_water_temperature
  air: sensor.example_outdoor_temperature
  heater: water_heater.example_pool_heater
  pump: switch.example_pool_pump
  speed: number.example_pool_pump_speed
```

Supported mapping keys: `water`, `air`, `heater`, `heating`, `pump`, `speed`, `low`, `medium`, `high`, `power`, `flow`, `lights`, `landscape`, `salt`, `instantSalt`, `chlorinator`, `generating`, `output`, `fault`, `alert`, `serviceMode`, `restore`.

Only map controls to equipment with the expected Home Assistant domain and service behavior. The release roadmap includes clearer validation and UI entity pickers.

## Privacy and development boundaries

This repository contains the reusable source and project planning only. Personal pool photographs, dashboard exports, actual household entity mappings, network details and credentials are excluded. The prototype was extracted from a local installation; creating this repository does not update that installation.

See [ROADMAP.md](ROADMAP.md) for the editor and public release plan. No public release or open-source license has been selected yet.
