# Pool Control Card 0.2.0-beta.1

First public beta of a configurable Home Assistant pool dashboard card.

## Included

- Photo-led layout in card and full tablet panel modes.
- Visual editor with native Home Assistant entity selectors.
- Temperature/heating, circulation, lighting and chlorination sections.
- Optional equipment sections, accent colors and dashboard navigation.
- Confirmation dialogs, unavailable states, service-mode checks and failed-command feedback.

## Compatibility

Tested with Home Assistant 2026.10.1 and Hayward OmniPL through OmniLogic Local 2.0.2. Requires Home Assistant 2026.10 or later.

Other integrations may work if they expose compatible entities. This beta supports configurable entity mappings; arbitrary service/action mappings and `climate` heaters are not implemented. Heater operation expects `water_heater` with on/off modes, pump speed and chlorinator output expect percentage number entities, and preset labels use a speed attribute when present.

## Install

Download the attached `pool-control-card.js`, place it in `config/www/`, and add `/local/pool-control-card.js?v=0.2.0-beta.1` as a JavaScript module in dashboard resources. Reload Home Assistant, add Pool Control Card, and select your equipment using the visual editor.

HACS custom-repository instructions are in the README. The card is not in the HACS default store, and end-to-end HACS installation verification is still pending. No personal pool photograph is bundled.

## Validation

Fifteen automated tests cover configuration, editor preservation, command routing, unavailable/disconnected states, service mode, Celsius targets, errors and cancellation. The visual editor's live preview, save/reopen behavior, native selectors and section visibility have been checked in Home Assistant. Tablet landscape/portrait and an embedded card layout have been checked. Service tests use simulated equipment.
