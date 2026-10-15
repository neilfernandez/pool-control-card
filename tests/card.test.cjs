const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const registry = new Map();
class Element extends EventTarget {
  attachShadow() { this.shadowRoot = { querySelector: () => ({ textContent: '' }) }; }
}
vm.runInNewContext(fs.readFileSync('pool-control-card.js', 'utf8'), {
  HTMLElement: Element, Event, CustomEvent, console,
  customElements: { get: key => registry.get(key), define: (key, value) => registry.set(key, value) },
  document: { createElement: name => new (registry.get(name))() }, window: {},
});
const Card = registry.get('pool-control-card');
const Editor = registry.get('pool-control-card-editor');
function makeCard(config = {}, states = {}) {
  const card = new Card();
  card._build = () => {};
  card._update = () => {};
  card._message = (message, error) => { card.message = { message, error }; };
  card.setConfig(config);
  card.calls = [];
  card.hass = { connected: true, config: { unit_system: { temperature: '°F' } }, states, callService: async (...args) => card.calls.push(args) };
  return card;
}
const state = (value, attributes = {}) => ({ state: value, attributes });

test('starter configuration never auto-selects equipment', () => {
  const card = makeCard(Card.getStubConfig());
  assert.equal(Object.values(card._entities).filter(Boolean).length, 0);
  assert.equal(card._config.image, '');
  assert.equal(card._config.navigation.length, 0);
  assert.equal(card._config.layout, 'card');
});
test('validates entity domains before controls can be bound', () => {
  assert.throws(() => makeCard({ entities: { pump: 'light.pool' } }), /switch entity/);
  assert.throws(() => makeCard({ entities: { heater: 'sensor.temperature' } }), /water_heater entity/);
  assert.doesNotThrow(() => makeCard({ entities: { pump: 'switch.pool', heater: 'water_heater.pool' } }));
});
test('validates configuration shapes and section visibility', () => {
  for (const config of [{ entities: [] }, { sections: [] }, { sections: { temperature: false } }, { layout: 'other' }, { accent: 'constructor' }, { title: {} }]) assert.throws(() => makeCard(config));
});
test('images and navigation cannot introduce external requests or executable links', () => {
  for (const image of ['https://example.com/pool.jpg', '//example.com/a', '/local/\\evil', '/local/\nfoo']) assert.throws(() => makeCard({ image }));
  for (const path of ['javascript:alert(1)', '//example.com', '/\\example.com', '/\nfoo']) assert.throws(() => makeCard({ navigation: [{ label: 'Pool', path }] }));
  assert.doesNotThrow(() => makeCard({ image: '/local/pool.jpg', navigation: [{ label: 'Pool', path: '/dashboard-pool/home?kiosk', icon: 'mdi:pool' }] }));
});
test('empty entity fields normalize without mutating caller configuration', () => {
  const input = { entities: { pump: '', water: 'sensor.water' }, sections: { quality: 'hide' } };
  const card = makeCard(input);
  assert.equal(card._entities.pump, '');
  assert.equal(card._config.entities.pump, undefined);
  assert.equal(input.entities.pump, '');
});
test('editor changes preserve other groups, navigation and advanced configuration', () => {
  const editor = new Editor(); editor._build = () => {}; editor._sync = () => {};
  editor.setConfig({ type: 'custom:pool-control-card', entities: { water: 'sensor.water', pump: 'switch.pump', custom: 'keep' }, navigation: [{ label: 'Home', path: '/lovelace' }], advanced_future: { keep: true } });
  let emitted;
  editor.addEventListener('config-changed', event => { emitted = event; });
  editor._changed('entities', ['water', 'heater'], { water: 'sensor.new_water' });
  assert.equal(emitted.bubbles, true); assert.equal(emitted.composed, true);
  assert.equal(emitted.detail.config.entities.pump, 'switch.pump');
  assert.equal(emitted.detail.config.entities.water, 'sensor.new_water');
  assert.equal(emitted.detail.config.entities.custom, 'keep');
  assert.equal(emitted.detail.config.navigation[0].path, '/lovelace');
  assert.equal(emitted.detail.config.advanced_future.keep, true);
});
test('editor removal of an entity persists and section choices round trip', () => {
  const editor = new Editor(); editor._build = () => {}; editor._sync = () => {};
  editor.setConfig({ entities: { water: 'sensor.water', pump: 'switch.pump' }, sections: { quality: 'hide' } });
  editor._changed('entities', ['water'], { water: '' });
  assert.equal(editor._config.entities.water, undefined);
  assert.equal(editor._config.entities.pump, 'switch.pump');
  editor._changed('sections', ['temperature'], { temperature: 'show' });
  assert.equal(editor._config.sections.quality, 'hide');
  assert.equal(editor._config.sections.temperature, 'show');
});
test('invalid editor input does not dispatch a configuration event', () => {
  const editor = new Editor(); editor._build = () => {}; editor._sync = () => {};
  editor.setConfig({ entities: {} }); let count = 0;
  editor.addEventListener('config-changed', () => { count++; });
  editor._changed('entities', ['pump'], { pump: 'light.unrelated' });
  assert.equal(count, 0); assert.equal(editor._config.entities.pump, undefined);
});
test('routes pump and light commands only to their mapped entities', async () => {
  const card = makeCard({ entities: { pump: 'switch.pump', lights: 'light.pool' } }, { 'switch.pump': state('off'), 'light.pool': state('on') });
  await card._run(card._command('switch', 'turn_on', 'pump'));
  await card._run(card._command('light', 'turn_on', 'lights', { effect: 'Deep Blue Sea' }));
  assert.deepEqual(card.calls.map(call => JSON.parse(JSON.stringify(call))), [['switch', 'turn_on', { entity_id: 'switch.pump' }], ['light', 'turn_on', { entity_id: 'light.pool', effect: 'Deep Blue Sea' }]]);
});
test('rechecks service mode and disconnect at dispatch time', async () => {
  const card = makeCard({ entities: { pump: 'switch.pump', serviceMode: 'binary_sensor.service' } }, { 'switch.pump': state('on'), 'binary_sensor.service': state('off') });
  const command = card._command('switch', 'turn_off', 'pump');
  card.hass.states['binary_sensor.service'].state = 'on'; await card._run(command);
  card.hass.states['binary_sensor.service'].state = 'off'; card.hass.connected = false; await card._run(command);
  assert.equal(card.calls.length, 0);
});
test('rejects unavailable equipment and speed commands if the pump stops', async () => {
  const card = makeCard({ entities: { pump: 'switch.pump', speed: 'number.speed', high: 'button.high' } }, { 'switch.pump': state('off'), 'number.speed': state('80'), 'button.high': state('unknown') });
  await card._run(card._command('number', 'set_value', 'speed', { value: 100 }));
  await card._run(card._command('button', 'press', 'high'));
  card.hass.states['switch.pump'].state = 'unavailable'; await card._run(card._command('switch', 'turn_on', 'pump'));
  assert.equal(card.calls.length, 0);
});
test('button entities with unknown state can still be pressed', async () => {
  const card = makeCard({ entities: { pump: 'switch.pump', high: 'button.high' } }, { 'switch.pump': state('on'), 'button.high': state('unknown') });
  await card._run(card._command('button', 'press', 'high')); assert.equal(card.calls.length, 1);
});
test('failed calls report failure, clear busy state and are not retried', async () => {
  const card = makeCard({ entities: { pump: 'switch.pump' } }, { 'switch.pump': state('on') });
  let count = 0; card.hass.callService = async () => { count++; throw new Error('Offline'); };
  await card._run(card._command('switch', 'turn_off', 'pump'));
  assert.equal(count, 1); assert.equal(card._busy, false); assert.equal(card.message.error, true); assert.match(card.message.message, /Offline/);
});
test('Celsius target adjustments use controller limits and step', () => {
  const card = makeCard({ entities: { heater: 'water_heater.pool' } }, { 'water_heater.pool': state('on', { temperature: 29.5, max_temp: 30, min_temp: 10, target_temp_step: 0.5 }) });
  card.hass.config.unit_system.temperature = '°C'; let pending;
  card._confirm = (title, text, command) => { pending = command; };
  card._click({ target: { closest: () => ({ dataset: { action: 'target-up' } }) } });
  assert.equal(pending.data.temperature, 30);
  assert.equal(pending.data.entity_id, 'water_heater.pool');
  card.hass.states['water_heater.pool'].attributes.temperature = 30; pending = undefined;
  card._click({ target: { closest: () => ({ dataset: { action: 'target-up' } }) } }); assert.equal(pending, undefined);
});
test('canceling a pending action clears it without sending any command', () => {
  const card = makeCard(); card._pending = { domain: 'switch' }; card._staged = true;
  card._el = () => ({ close() {} }); card._cancel();
  assert.equal(card._pending, null); assert.equal(card._staged, false); assert.equal(card.calls.length, 0);
});
