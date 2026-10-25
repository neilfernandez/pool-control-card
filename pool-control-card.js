/* Pool Control Card | MIT License | https://github.com/neilfernandez/pool-control-card */
const POOL_DEFAULTS = Object.freeze({
  water: '',
  air: '',
  heater: '',
  heating: '',
  pump: '',
  speed: '',
  low: '',
  medium: '',
  high: '',
  power: '',
  flow: '',
  lights: '',
  landscape: '',
  salt: '',
  instantSalt: '',
  chlorinator: '',
  generating: '',
  output: '',
  fault: '',
  alert: '',
  serviceMode: '',
  restore: '',
});

const POOL_VERSION = '0.2.0';
const POOL_FIELDS = [
  ['water', 'Water temperature', 'sensor', 'temperature'],
  ['air', 'Air temperature', 'sensor', 'temperature'],
  ['heater', 'Pool heater', 'water_heater', 'temperature'],
  ['heating', 'Actively heating', 'binary_sensor', 'temperature'],
  ['pump', 'Filter pump', 'switch', 'circulation'],
  ['speed', 'Pump speed (%)', 'number', 'circulation'],
  ['low', 'Low speed preset', 'button', 'circulation'],
  ['medium', 'Medium speed preset', 'button', 'circulation'],
  ['high', 'High speed preset', 'button', 'circulation'],
  ['power', 'Pump power', 'sensor', 'circulation'],
  ['flow', 'Water flow', 'binary_sensor', 'circulation'],
  ['lights', 'Pool lights', 'light', 'lighting'],
  ['landscape', 'Landscape lights', 'switch', 'lighting'],
  ['salt', 'Average salt level', 'sensor', 'quality'],
  ['instantSalt', 'Instant salt level', 'sensor', 'quality'],
  ['chlorinator', 'Chlorinator', 'switch', 'quality'],
  ['generating', 'Generating chlorine', 'binary_sensor', 'quality'],
  ['output', 'Chlorinator output (%)', 'number', 'quality'],
  ['fault', 'Chlorinator fault', 'binary_sensor', 'quality'],
  ['alert', 'Chlorinator alert', 'binary_sensor', 'quality'],
  ['serviceMode', 'Controller service mode', 'binary_sensor', 'controller'],
  ['restore', 'Resume controller schedules', 'button', 'controller'],
];
const POOL_GROUPS = { temperature: 'Temperature & heating', circulation: 'Circulation', lighting: 'Lighting', quality: 'Salt & chlorination', controller: 'Controller safeguards' };
const POOL_ACCENTS = { aqua: '#57c7dc', blue: '#85b8ff', green: '#83df96', amber: '#f3b451' };
const POOL_SECTIONS = ['temperature', 'circulation', 'lighting', 'quality'];
const poolObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const poolPath = value => typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\x00-\x20]/.test(value);

function poolConfig(config) {
  if (!poolObject(config)) throw new Error('Card configuration must be an object.');
  for (const key of ['title', 'area', 'controller', 'image', 'image_caption']) {
    if (config[key] !== undefined && typeof config[key] !== 'string') throw new Error(`${key} must be text.`);
  }
  if (config.image && (!poolPath(config.image) || !config.image.startsWith('/local/'))) throw new Error('Pool image must be a local Home Assistant /local/ asset.');
  if (config.layout !== undefined && !['card', 'panel'].includes(config.layout)) throw new Error('Layout must be card or panel.');
  if (config.accent !== undefined && !Object.hasOwn(POOL_ACCENTS, config.accent)) throw new Error('Choose aqua, blue, green or amber.');
  if (config.entities !== undefined && !poolObject(config.entities)) throw new Error('Entities must be an object.');
  const entities = { ...config.entities };
  for (const [key, label, domain] of POOL_FIELDS) {
    const id = entities[key];
    if (id === '' || id == null) { delete entities[key]; continue; }
    if (typeof id !== 'string' || !new RegExp(`^${domain}\\.[a-z0-9_]+$`).test(id)) throw new Error(`${label} must use a ${domain} entity.`);
  }
  if (config.sections !== undefined && !poolObject(config.sections)) throw new Error('Sections must be an object.');
  for (const key of POOL_SECTIONS) {
    const mode = config.sections?.[key];
    if (mode !== undefined && !['auto', 'show', 'hide'].includes(mode)) throw new Error(`${key} visibility must be auto, show or hide.`);
  }
  if (config.navigation !== undefined && (!Array.isArray(config.navigation) || config.navigation.length > 8)) throw new Error('Navigation supports up to eight links.');
  for (const link of config.navigation || []) {
    if (!poolObject(link) || typeof link.label !== 'string' || !link.label.trim() || !poolPath(link.path)) throw new Error('Each navigation link needs a label and an internal path beginning with /.');
    if (link.icon !== undefined && (typeof link.icon !== 'string' || !/^mdi:[a-z0-9-]+$/.test(link.icon))) throw new Error('Navigation icons must use mdi:icon-name.');
  }
  return { title: 'Pool', area: 'BACKYARD', controller: 'Pool controller', image: '', image_caption: '', layout: 'card', accent: 'aqua', ...config, entities, sections: { ...config.sections }, navigation: (config.navigation || []).map(link => ({ ...link })) };
}

class PoolControlCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this._forms = []; }
  setConfig(config) { this._config = { ...config, entities: { ...config.entities }, sections: { ...config.sections }, navigation: (config.navigation || []).map(link => ({ ...link })) }; if (!this._built) this._build(); this._sync(); }
  set hass(value) { this._hass = value; this._sync(); }
  get hass() { return this._hass; }
  _form(parent, schema, scope, keys) {
    const form = document.createElement('ha-form');
    form.schema = schema;
    form.computeLabel = field => field.label || field.name;
    form.computeHelper = field => field.helper;
    form.addEventListener('value-changed', event => {
      event.stopPropagation();
      this._changed(scope, keys, event.detail.value);
    });
    parent.append(form);
    this._forms.push({ form, scope, keys });
  }
  _build() {
    this._built = true;
    this.shadowRoot.innerHTML = `<style>:host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif)}.intro{padding:4px 0 16px}.intro strong{font-size:18px}.intro span{float:right;color:var(--secondary-text-color);font-size:12px}.intro p{margin:8px 0 0;color:var(--secondary-text-color);font-size:13px;line-height:1.6}details{border:1px solid var(--divider-color);border-radius:12px;margin:0 0 12px;overflow:hidden}summary{cursor:pointer;padding:16px;font-weight:500;min-height:48px}summary:focus-visible,button:focus-visible{outline:2px solid var(--primary-color);outline-offset:-3px}.body{padding:0 16px 16px}ha-form{display:block}.nav-item{border-top:1px solid var(--divider-color);padding:12px 0}.nav-actions{display:flex;justify-content:flex-end}button{font:inherit;min-height:44px;padding:8px 14px;color:var(--primary-color);border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);cursor:pointer}button:disabled{opacity:.4}.error{color:var(--error-color);font-size:13px;line-height:1.5}.note{color:var(--secondary-text-color);font-size:12px;line-height:1.5;margin:0 0 12px}</style><div class="intro"><strong>Pool Control Card</strong><span>v${POOL_VERSION}</span><p>Choose your pool equipment and make the card your own. Unassigned equipment stays hidden. Editing settings never operates equipment.</p></div><div class="groups"></div><p class="error" role="alert"></p>`;
    const container = this.shadowRoot.querySelector('.groups');
    const group = (name, title, open = false) => {
      const details = document.createElement('details'); details.open = open; details.dataset.group = name;
      const summary = document.createElement('summary'); summary.textContent = title;
      const body = document.createElement('div'); body.className = 'body';
      details.append(summary, body); container.append(details); return body;
    };
    const text = (name, label, helper) => ({ name, label, helper, selector: { text: {} } });
    const select = (name, label, options) => ({ name, label, selector: { select: { mode: 'dropdown', options } } });
    const appearance = [text('title', 'Title'), text('area', 'Area label'), text('controller', 'Controller label'), text('image', 'Pool image', 'Optional Home Assistant /local/ image path. No image is bundled.'), text('image_caption', 'Photo caption'), select('layout', 'Layout', [{ value: 'card', label: 'Card — alongside other cards' }, { value: 'panel', label: 'Panel — full tablet dashboard' }]), select('accent', 'Accent color', Object.keys(POOL_ACCENTS).map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })))];
    this._form(group('appearance', 'Appearance', true), appearance, 'root', appearance.map(field => field.name));
    for (const [key, title] of Object.entries(POOL_GROUPS)) {
      const body = group(key, title);
      const fields = POOL_FIELDS.filter(field => field[3] === key).map(([name, label, domain]) => ({ name, label, selector: { entity: { domain } } }));
      if (key === 'controller') { const note = document.createElement('p'); note.className = 'note'; note.textContent = 'Assign service mode to pause controls during maintenance. Schedule restoration uses your integration’s button entity.'; body.append(note); }
      this._form(body, fields, 'entities', fields.map(field => field.name));
    }
    this._form(group('sections', 'Visible sections'), POOL_SECTIONS.map(name => select(name, POOL_GROUPS[name], [{ value: 'auto', label: 'Automatic — show when assigned' }, { value: 'show', label: 'Always show' }, { value: 'hide', label: 'Hide' }])), 'sections', POOL_SECTIONS);
    this._navBody = group('navigation', 'Navigation');
    const note = document.createElement('p'); note.className = 'note'; note.textContent = 'Optional links to your other dashboards. Use internal paths beginning with /. Leave empty for a standalone card.'; this._navBody.append(note);
    this._navRows = document.createElement('div'); this._navBody.append(this._navRows);
    this._addLink = document.createElement('button'); this._addLink.textContent = 'Add navigation link'; this._addLink.addEventListener('click', () => {
      if (this._config.navigation.length >= 8) return;
      this._emit({ ...this._config, navigation: [...this._config.navigation, { label: 'Dashboard', path: '/lovelace', icon: 'mdi:view-dashboard' }] });
    }); this._navBody.append(this._addLink);
  }
  _changed(scope, keys, values) {
    const next = { ...this._config };
    const data = scope === 'root' ? next : scope.startsWith('nav:') ? { ...next.navigation[Number(scope.split(':')[1])] } : { ...next[scope] };
    for (const key of keys) { if (values[key] === undefined || values[key] === '' || values[key] === null) delete data[key]; else data[key] = values[key]; }
    if (scope.startsWith('nav:')) { next.navigation = next.navigation.map((link, i) => i === Number(scope.split(':')[1]) ? data : link); }
    else if (scope !== 'root') next[scope] = data;
    this._emit(next);
  }
  _emit(config) {
    try { poolConfig(config); this.shadowRoot.querySelector('.error').textContent = ''; }
    catch (error) { this.shadowRoot.querySelector('.error').textContent = error.message; return; }
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', { bubbles: true, composed: true, detail: { config } }));
    this._sync();
  }
  _sync() {
    if (!this._built || !this._config) return;
    if (this._navCount !== this._config.navigation.length) {
      this._navCount = this._config.navigation.length;
      this._forms = this._forms.filter(entry => !entry.scope.startsWith('nav:'));
      this._navRows.replaceChildren();
      this._config.navigation.forEach((link, index) => {
        const row = document.createElement('div'); row.className = 'nav-item';
        this._form(row, [{ name: 'label', label: 'Link label', selector: { text: {} } }, { name: 'path', label: 'Dashboard path', selector: { text: {} } }, { name: 'icon', label: 'Icon', selector: { icon: {} } }], `nav:${index}`, ['label', 'path', 'icon']);
        const actions = document.createElement('div'); actions.className = 'nav-actions';
        const remove = document.createElement('button'); remove.textContent = 'Remove link'; remove.setAttribute('aria-label', `Remove navigation link ${index + 1}`);
        remove.addEventListener('click', () => this._emit({ ...this._config, navigation: this._config.navigation.filter((_, i) => i !== index) }));
        actions.append(remove); row.append(actions); this._navRows.append(row);
      });
    }
    const normalized = poolConfig(this._config);
    for (const entry of this._forms) {
      entry.form.hass = this._hass;
      const data = entry.scope === 'root' ? normalized : entry.scope.startsWith('nav:') ? normalized.navigation[Number(entry.scope.split(':')[1])] : normalized[entry.scope];
      const selected = Object.fromEntries(entry.keys.map(key => [key, data[key] ?? (entry.scope === 'sections' ? 'auto' : '')]));
      if (JSON.stringify(entry.form.data) !== JSON.stringify(selected)) entry.form.data = selected;
    }
    this._addLink.disabled = this._config.navigation.length >= 8;
  }
}

const POOL_STYLE = `
:host{display:block;--ink:#0b1c28;--page:#081923;--text:#f5f3ed;--muted:#b2c1ca;--line:#263b48;--aqua:#57c7dc;--amber:#f3b451;--green:#83df96;--red:#ffaba0;color:var(--text);font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-variant-numeric:tabular-nums}
*{box-sizing:border-box}button,input,select,a{font:inherit}button,a,input,select{touch-action:manipulation}button,select{color:inherit}button{cursor:pointer}button:disabled,select:disabled,input:disabled{opacity:.4;cursor:not-allowed}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--aqua);outline-offset:4px}ha-icon{--mdc-icon-size:26px;flex-shrink:0}button ha-icon{pointer-events:none}button{border:1px solid var(--line);background:#142734;border-radius:12px;min-height:48px}button:hover:not(:disabled){background:#203846}button:active:not(:disabled){transform:translateY(1px)}
.app{background:var(--page);min-height:100dvh;padding:24px;display:flex;flex-direction:column;gap:16px;max-width:1700px;margin:auto}.top{display:flex;justify-content:space-between;align-items:center;min-height:64px}.eyebrow{font-size:11px;letter-spacing:4px;font-weight:500;margin:0 0 7px}h1{font-size:46px;line-height:1;margin:0;letter-spacing:-1px;font-weight:650}.brand{font-size:14px;color:var(--muted)}
.primary{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);gap:14px;flex:1;min-height:412px}.panel{border:1px solid var(--line);border-radius:15px;background:var(--ink);overflow:hidden}.water{position:relative;min-height:412px;display:flex}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}.photo-caption{position:absolute;left:20px;bottom:18px;background:#081923cc;padding:7px 10px;border-radius:7px;font-size:12px;color:#e4eef2}.water-controls{position:relative;width:42%;margin-left:auto;padding:26px 23px 22px 12px;display:flex;flex-direction:column;justify-content:space-between;gap:13px}.label{font-size:10px;font-weight:500;letter-spacing:2px;color:#e4ebee;text-transform:uppercase;margin:0 0 12px}.temperature{font-size:84px;line-height:1;font-weight:500;letter-spacing:-4px;margin:0}.temperature .unit{font-size:.52em;letter-spacing:-2px;vertical-align:top;line-height:1.35}.air{font-size:16px;color:#d9e5eb;margin:12px 0 0}.target{border-top:1px solid #455761;padding-top:19px}.stepper{display:grid;grid-template-columns:48px minmax(0,1fr) 48px;gap:8px}.stepper button{font-size:27px;min-height:58px}.target-value{display:flex;align-items:center;justify-content:center;font-size:27px;font-weight:500;border:1px solid var(--line);border-radius:12px;background:#152a37}.heat-status{display:flex;align-items:center;gap:10px;min-height:45px}.heat-status ha-icon{color:var(--amber);--mdc-icon-size:29px}.heat-status strong{font-size:17px;font-weight:600;display:block}.heat-status small{display:block;color:var(--muted);font-size:11px;line-height:1.5;margin-top:3px}.heat-status.active strong{color:var(--amber)}.segmented{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:13px;overflow:hidden;min-height:56px}.segmented button{border:0;border-radius:0;background:#122631;font-size:14px;padding:7px;display:flex;justify-content:center;align-items:center;gap:6px}.segmented button.active{background:#594324;color:#ffe0a6}.segmented ha-icon{--mdc-icon-size:19px}.water-controls .unavailable{font-size:13px;color:var(--muted);line-height:1.5}
.circulation{padding:24px;display:flex;flex-direction:column;gap:20px}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.title{display:flex;align-items:center;gap:12px}h2{font-size:23px;font-weight:650;margin:0;letter-spacing:-.3px}.title ha-icon{--mdc-icon-size:30px}.pump-toggle{border:0;background:transparent;min-height:44px;padding:0;font-size:12px;display:flex;gap:8px;align-items:center;white-space:nowrap}.pump-toggle:hover:not(:disabled){background:transparent;color:var(--aqua)}.dot{width:10px;height:10px;display:inline-block;border-radius:50%;background:#72818a;flex-shrink:0}.dot.on{background:var(--green)}.speed{border-top:1px solid var(--line);padding-top:19px;flex:1}.speed-label{font-size:16px;color:var(--muted);margin:0 0 10px}.speed-value{font-size:70px;line-height:1;font-weight:500;letter-spacing:-2px;margin:0 0 18px}.speed-value span{font-size:.66em;letter-spacing:-1px}.range{width:100%;accent-color:var(--aqua);height:38px;margin:0;cursor:pointer}.presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}.presets button{min-height:68px;background:#112632;font-size:13px;line-height:1.7}.presets small{display:block;font-size:13px;color:var(--muted)}.presets button.active{border-color:var(--aqua);color:var(--aqua);background:#143644}.presets button.active small{color:var(--aqua)}.flow-power{border-top:1px solid var(--line);padding-top:18px;display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:14px}.flow-power div{display:flex;gap:8px;align-items:center}.flow-power ha-icon{color:var(--aqua);--mdc-icon-size:26px}.idle-note{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.4}
.secondary{display:grid;grid-template-columns:1.07fr 1fr;gap:14px}.lighting,.quality{padding:19px 22px;min-height:164px}.secondary h2{font-size:21px}.secondary .title ha-icon{--mdc-icon-size:27px}.lighting-body,.quality-body{border-top:1px solid var(--line);margin-top:16px;padding-top:16px;display:flex;align-items:center;gap:19px}.effect{flex:1;min-width:0}.effect label{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}.effect select{width:100%;min-height:45px;background:#132936;border:1px solid var(--line);border-radius:10px;padding:0 12px;font-size:14px;color:var(--text);text-overflow:ellipsis}.landscape{border-left:1px solid var(--line);padding-left:18px;min-width:138px}.landscape label{display:block;font-size:13px;margin-bottom:9px}.switch{padding:0;width:48px;min-height:28px;height:28px;border-radius:20px;border:0;background:#34434e;display:inline-block;vertical-align:middle}.switch::before{content:'';display:block;width:22px;height:22px;background:#cad3d8;border-radius:50%;margin:3px;transition:transform .15s}.switch[aria-checked=true]{background:#347486}.switch[aria-checked=true]::before{transform:translateX(20px);background:#a4eef4}.toggle-label{font-size:12px;color:var(--muted);margin-left:7px}.quality .title ha-icon{color:var(--aqua)}.quality-body>div{flex:1;min-width:0}.quality-body>div+div{border-left:1px solid var(--line);padding-left:16px}.metric-label{color:var(--muted);font-size:13px;margin:0 0 7px}.salt-reading{font-size:26px;line-height:1.2;margin:0;font-weight:550}.salt-reading small{font-size:12px;font-weight:400}.chlorination{font-size:16px;display:flex;align-items:center;gap:8px;line-height:1.5}.output{font-size:24px;line-height:1.2;margin:0}progress{display:block;width:100%;height:8px;appearance:none;margin-top:11px;border:0;border-radius:7px;overflow:hidden;background:#263b48}progress::-webkit-progress-bar{background:#263b48}progress::-webkit-progress-value{background:var(--aqua)}progress::-moz-progress-bar{background:var(--aqua)}
.meta{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:var(--muted);min-height:21px}.settings-button{min-height:29px;padding:3px 8px;border:0;background:transparent;color:var(--muted);font-size:11px}.message:empty{display:none}.message{font-size:12px;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:#183440}.message.error{color:var(--red);background:#392b2c}.notice{padding:12px 15px;background:#352c24;border:1px solid #6e5742;border-radius:10px;font-size:13px;line-height:1.5;color:#ffe0ac}.notice[hidden]{display:none}
.nav{display:flex;justify-content:center;gap:38px;margin:0;min-height:62px;align-items:end}.nav a{display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none;color:var(--muted);font-size:13px;min-width:65px;min-height:57px;padding:6px 3px;border-bottom:2px solid transparent}.nav a:hover{color:var(--text)}.nav a.active{color:var(--aqua);border-bottom-color:var(--aqua)}.nav ha-icon{--mdc-icon-size:27px}
dialog{color:var(--text);background:#0d2431;border:1px solid #456170;border-radius:18px;padding:25px;max-width:440px;width:calc(100vw - 36px)}dialog::backdrop{background:#020b13b3}dialog h2{font-size:23px;margin:0 0 13px}dialog p{color:#c4d4dd;font-size:15px;line-height:1.6}.dialog-actions{display:flex;justify-content:end;gap:10px;margin-top:22px}.dialog-actions button{min-width:100px;padding:10px 16px}.dialog-actions .confirm{background:#244d5c;border-color:var(--aqua);color:#c7f5fa}.settings-grid{display:grid;gap:18px;margin-top:18px}.settings-grid label{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:14px}.settings-grid input{width:86px;background:#102e3e;color:white;border:1px solid #496170;border-radius:8px;padding:10px;font-size:17px}.settings-grid .full{width:100%;padding:9px 12px}.settings-info{font-size:13px;color:var(--muted);line-height:1.5}
@media(min-width:1500px){.app{padding:28px 34px}.primary{min-height:490px}.water{min-height:490px}.water-controls{padding:33px 30px 28px 12px}.temperature{font-size:100px}.circulation{padding:30px}.speed-value{font-size:86px}.lighting,.quality{min-height:182px;padding:22px 26px}.meta{margin-top:4px}}
@media(max-width:1020px){.app{padding:20px;gap:13px}.primary{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);min-height:395px}.water{min-height:395px}.water-controls{width:48%;padding:24px 18px 19px 8px}.temperature{font-size:70px}.stepper{grid-template-columns:42px minmax(0,1fr) 42px;gap:5px}.target-value{font-size:23px}.stepper button{min-height:52px}.circulation{padding:20px;gap:17px}h2{font-size:20px}.pump-toggle{font-size:11px}.speed-value{font-size:59px}.flow-power{font-size:12px}.secondary{grid-template-columns:1fr 1fr}.lighting,.quality{padding:17px 18px}.secondary h2{font-size:19px}.lighting-body{gap:12px}.landscape{min-width:114px;padding-left:12px}.landscape label{font-size:12px}.quality-body{gap:9px}.quality-body>div+div{padding-left:10px}.salt-reading{font-size:22px}.chlorination{font-size:14px}.output{font-size:22px}}
@media(max-width:860px) and (orientation:portrait){.app{padding:22px;gap:16px}.primary{grid-template-columns:1fr}.water{min-height:405px}.water-controls{width:41%;padding:29px 24px 25px 12px}.temperature{font-size:83px}.circulation{display:grid;grid-template-columns:1fr 1.35fr;gap:18px;min-height:226px;padding:24px}.circulation .panel-head{align-items:start;flex-direction:column}.circulation .title{margin-bottom:20px}.speed{border:0;padding-top:0;grid-row:span 2}.speed-label{font-size:13px}.speed-value{font-size:51px;margin-bottom:9px}.presets{margin-top:4px}.presets button{min-height:57px}.flow-power{border:0;padding:0;flex-direction:column;align-items:start;gap:12px}.secondary{grid-template-columns:1fr 1fr}.lighting-body{align-items:stretch;flex-direction:column;gap:10px}.landscape{border:0;border-top:1px solid var(--line);padding:10px 0 0;display:flex;align-items:center;gap:7px}.landscape label{margin:0;flex:1}.quality-body{flex-wrap:wrap}.quality-body>div:first-child{flex-basis:100%;margin-bottom:10px}.quality-body>div:nth-child(2){padding:0;border:0}.lighting,.quality{min-height:217px}.nav{gap:38px}}
@media(max-width:620px){.app{padding:15px;gap:13px}.top{min-height:62px}h1{font-size:37px}.brand{font-size:11px}.eyebrow{font-size:9px}.water{min-height:430px}.water-controls{width:52%;padding:24px 16px 20px 8px}.photo-caption{left:12px;bottom:12px;font-size:10px}.temperature{font-size:65px}.label{font-size:9px;letter-spacing:1.3px}.air{font-size:13px}.target{padding-top:16px}.target-value{font-size:23px}.heat-status strong{font-size:15px}.heat-status small{font-size:10px}.segmented button{font-size:12px}.segmented ha-icon{display:none}.circulation{display:flex;min-height:350px;padding:21px;gap:19px}.circulation .panel-head{flex-direction:row;align-items:center}.circulation .title{margin:0}.speed{border-top:1px solid var(--line);padding-top:16px}.speed-value{font-size:62px}.presets button{min-height:60px}.flow-power{flex-direction:row;border-top:1px solid var(--line);padding-top:17px;gap:10px}.secondary{grid-template-columns:1fr}.lighting,.quality{min-height:155px}.lighting-body{flex-direction:row;align-items:center}.landscape{border-top:0;border-left:1px solid var(--line);padding:0 0 0 13px;display:block}.landscape label{margin-bottom:8px}.quality-body{flex-wrap:nowrap}.quality-body>div:first-child{flex-basis:0;margin:0}.quality-body>div:nth-child(2){padding-left:10px;border-left:1px solid var(--line)}.nav{gap:4px;justify-content:space-between;position:sticky;bottom:0;background:var(--page);padding-top:10px;z-index:2}.nav a{min-width:52px;font-size:11px}.nav ha-icon{--mdc-icon-size:24px}.meta{font-size:10px}}
.speed-value span:first-child{font-size:1em;letter-spacing:-2px}
.water-controls .unavailable{margin:5px 0 0;font-size:11px;line-height:1.4}
.water-controls .unavailable:empty{display:none}
@media(min-width:1021px) and (max-height:900px){
 .app{padding:16px;gap:10px}.top{min-height:58px}h1{font-size:40px}.eyebrow{font-size:10px;line-height:12px;margin-bottom:6px}.primary,.water{min-height:370px}.water-controls{padding:17px 20px 17px 10px;gap:9px}.label{margin-bottom:8px;line-height:12px}.temperature{font-size:70px}.air{font-size:14px;line-height:18px;margin-top:7px}.target{padding-top:13px}.stepper button{min-height:49px}.target-value{font-size:25px}.heat-status{min-height:38px}.heat-status strong{font-size:16px}.heat-status small{font-size:10px}.segmented{min-height:48px}.segmented button{min-height:46px}.circulation{padding:20px 23px;gap:12px}.speed{padding-top:13px}.speed-label{font-size:14px;margin-bottom:8px}.speed-value{font-size:64px;margin-bottom:9px}.presets{margin-top:7px}.presets button{min-height:57px}.flow-power{padding-top:13px}.lighting,.quality{min-height:144px;padding:15px 20px}.secondary h2{font-size:20px}.lighting-body,.quality-body{margin-top:11px;padding-top:11px}.effect select{min-height:42px}.meta{min-height:24px}.settings-button{min-height:24px}.nav{min-height:54px;gap:38px}.nav a{font-size:12px;line-height:15px;gap:4px;min-height:54px;padding:4px 3px}.nav ha-icon{--mdc-icon-size:24px}
}
@media(min-width:621px) and (max-width:860px) and (orientation:portrait) and (max-height:1300px){
 .app{padding:18px;gap:12px}.top{min-height:60px}h1{font-size:42px}.eyebrow{font-size:10px;line-height:12px;margin-bottom:6px}.primary{gap:15px}.water{min-height:385px}.water-controls{width:42%;padding:20px 22px 18px 10px;gap:9px}.label{line-height:12px;margin-bottom:8px}.temperature{font-size:70px}.air{font-size:14px;line-height:18px;margin-top:7px}.target{padding-top:13px}.stepper button{min-height:49px}.target-value{font-size:25px}.heat-status{min-height:38px}.heat-status strong{font-size:16px}.heat-status small{font-size:10px}.segmented{min-height:48px}.segmented button{min-height:46px}.circulation{min-height:215px;padding:18px 22px;gap:14px}.circulation .title{margin-bottom:14px}.speed-value{font-size:45px;margin-bottom:7px}.speed-label{font-size:12px;margin-bottom:7px}.range{height:30px}.presets button{min-height:49px;font-size:12px}.presets small{font-size:12px}.idle-note{font-size:11px;margin-top:5px}.flow-power{font-size:12px;gap:8px}.lighting,.quality{min-height:201px;padding:15px 18px}.secondary h2{font-size:18px}.lighting-body,.quality-body{margin-top:12px;padding-top:12px}.effect select{min-height:40px;font-size:13px}.quality-body>div:first-child{margin-bottom:4px}.metric-label{font-size:12px;margin-bottom:6px}.salt-reading{font-size:23px}.meta{min-height:24px}.settings-button{min-height:24px}.nav{min-height:54px}.nav a{font-size:12px;line-height:15px;gap:4px;min-height:54px;padding:4px 3px}.nav ha-icon{--mdc-icon-size:24px}
}
.switch{position:relative;height:44px;min-height:44px;background:transparent!important;vertical-align:middle}
.switch::before{position:absolute;left:0;top:8px;width:48px;height:28px;margin:0;border-radius:20px;background:#34434e;transform:none!important}
.switch::after{content:'';position:absolute;left:3px;top:11px;width:22px;height:22px;border-radius:50%;background:#cad3d8;transition:transform .15s}
.switch[aria-checked=true]::before{background:#347486}
.switch[aria-checked=true]::after{transform:translateX(20px);background:#a4eef4}
.effect select,.settings-grid input{min-height:44px}
.settings-button{min-height:44px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
:host{container-type:inline-size}[hidden]{display:none!important}.app.mode-card{min-height:0;padding:16px;border:1px solid var(--line);border-radius:16px}.primary.single,.secondary.single{grid-template-columns:1fr}.primary:has(.water[hidden]),.primary:has(.circulation[hidden]){flex:initial}.water.no-image{background:radial-gradient(ellipse at 10% 80%,#174957,transparent 65%),var(--ink)}.water.no-image .water-controls{width:100%;padding:24px}.water.no-image .temperature{font-size:72px}.setup{padding:36px 24px;text-align:center;border:1px dashed var(--line);border-radius:15px}.setup ha-icon{--mdc-icon-size:56px;color:var(--aqua);margin-bottom:16px}.setup p{color:var(--muted);font-size:14px;line-height:1.6}.temperature .unit{font-size:.4em;letter-spacing:-1px}.nav{gap:clamp(4px,3vw,38px);flex-wrap:wrap}.nav a{min-width:54px}.presets{grid-template-columns:repeat(auto-fit,minmax(65px,1fr))}
@container(max-width:900px){.app{padding:16px;gap:12px}.primary{grid-template-columns:1fr}.water{min-height:385px}.water-controls{width:44%;padding:20px 18px 18px 10px}.temperature{font-size:68px}.circulation{min-height:240px}.secondary{grid-template-columns:1fr 1fr}.nav{gap:12px}}
@container(max-width:620px){.app,.app.mode-card{padding:14px;gap:12px}.top{min-height:58px}h1{font-size:34px}.brand{max-width:38%;font-size:11px;text-align:right}.eyebrow{font-size:9px;letter-spacing:2px}.primary,.secondary{grid-template-columns:1fr}.water{min-height:400px}.water-controls{width:54%;padding:18px 12px 18px 6px}.water.no-image .water-controls{width:100%;padding:20px}.temperature,.water.no-image .temperature{font-size:58px}.label{font-size:9px;letter-spacing:1px}.air{font-size:13px}.stepper{grid-template-columns:40px minmax(0,1fr) 40px;gap:5px}.stepper button{min-height:48px}.target-value{font-size:20px}.heat-status strong{font-size:14px}.heat-status small{font-size:11px}.segmented{min-height:48px}.segmented button{font-size:12px;min-height:46px}.segmented ha-icon{display:none}.circulation{display:flex;min-height:300px;padding:20px;gap:16px}.circulation .panel-head{flex-direction:row;align-items:center}.circulation .title{margin:0}.speed{border-top:1px solid var(--line);padding-top:15px}.speed-value{font-size:54px}.flow-power{flex-direction:row;border-top:1px solid var(--line);padding-top:14px}.lighting,.quality{padding:18px;min-height:155px}.lighting-body{flex-direction:row;align-items:center}.landscape{display:block;border-top:0;border-left:1px solid var(--line);padding:0 0 0 12px;min-width:112px}.landscape label{margin-bottom:8px}.quality-body{flex-wrap:nowrap}.quality-body>div:first-child{flex-basis:0;margin:0}.quality-body>div:nth-child(2){padding-left:10px;border-left:1px solid var(--line)}.nav{position:static;justify-content:center;gap:6px}.nav a{font-size:11px;min-width:48px}.meta{font-size:10px}.photo-caption{font-size:10px;left:12px;bottom:12px}}

`;

class PoolControlCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._busy = false;
    this._staged = false;
    this._pending = null;
  }

  static getConfigElement() { return document.createElement('pool-control-card-editor'); }
  static getStubConfig() { return { title: 'Pool', layout: 'card', entities: {} }; }

  setConfig(config) {
    this._config = poolConfig(config);
    this._entities = { ...POOL_DEFAULTS, ...this._config.entities };
    this._pending = null;
    this._staged = false;
    this._build();
    this._update();
  }

  set hass(value) {
    this._hass = value;
    this._update();
  }
  get hass() { return this._hass; }
  getCardSize() { return this._config?.layout === 'panel' ? 16 : 8; }
  getGridOptions() { return { columns: 'full' }; }

  _unit() { return this._state('water')?.attributes.unit_of_measurement || this._hass?.config?.unit_system?.temperature || '°F'; }
  _heaterUnit() { return this._state('heater')?.attributes.temperature_unit || this._hass?.config?.unit_system?.temperature || this._unit(); }
  _el(selector) { return this.shadowRoot.querySelector(selector); }
  _state(key) { return this._hass?.states[this._entities[key]]; }
  _ready(key) {
    const state = this._state(key);
    return Boolean(state && !['unavailable', 'unknown'].includes(state.state));
  }
  _on(key) { return this._state(key)?.state === 'on'; }
  _number(key) {
    if (!this._ready(key)) return null;
    const value = Number(this._state(key).state);
    return Number.isFinite(value) ? value : null;
  }
  _format(value, digits = 0) {
    return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: digits });
  }
  _text(key, text) {
    const element = this._el(`[data-bind="${key}"]`);
    if (element && element.textContent !== String(text)) element.textContent = text;
  }
  _disabled(action, disabled) {
    this.shadowRoot.querySelectorAll(`[data-action="${action}"]`).forEach(el => { el.disabled = this._busy || disabled; });
  }

  _build() {
    this._effectsKey = undefined;
    this.shadowRoot.innerHTML = `<style>${POOL_STYLE}</style>
      <main class="app">
        <header class="top"><div><p class="eyebrow">BACKYARD</p><h1>Pool</h1></div><span class="brand">Hayward OmniPL</span></header>
        <div class="notice" data-bind="notice" role="alert" hidden></div><div class="setup" hidden><ha-icon icon="mdi:pool"></ha-icon><h2>Make room for your pool</h2><p>Open the card editor and choose your temperature sensors and pool equipment.</p></div>
        <section class="primary" aria-label="Pool temperature and circulation">
          <article class="panel water" aria-label="Water and heating">
            <img class="photo" alt="Pool photo" />
            <span class="photo-caption"></span>
            <div class="water-controls">
              <div><p class="label">Water temperature</p><p class="temperature"><span data-bind="water">—</span><span class="unit" data-bind="unit">°</span></p><p class="air">Air <span data-bind="air">—</span></p><p class="unavailable" data-bind="water-note"></p></div>
              <div class="target"><p class="label">Target temperature</p><div class="stepper"><button data-action="target-down" aria-label="Decrease heater target"><ha-icon icon="mdi:minus"></ha-icon></button><output class="target-value" data-bind="target" aria-label="Heater target">—</output><button data-action="target-up" aria-label="Increase heater target"><ha-icon icon="mdi:plus"></ha-icon></button></div></div>
              <div class="heat-status"><ha-icon icon="mdi:heat-wave"></ha-icon><div><strong data-bind="heating">Connecting</strong><small data-bind="heating-note">Waiting for controller</small></div></div>
              <div class="segmented" aria-label="Heater controls"><button data-action="heat-on"><ha-icon icon="mdi:power"></ha-icon>Heat on</button><button data-action="heat-off">Heat off</button></div>
            </div>
          </article>
          <article class="panel circulation">
            <div class="panel-head"><div class="title"><ha-icon icon="mdi:pump"></ha-icon><h2>Circulation</h2></div><button class="pump-toggle" data-action="pump" aria-label="Toggle pool pump"><span class="dot" data-indicator="pump"></span><span data-bind="pump-label">Connecting</span></button></div>
            <div class="speed"><p class="speed-label">Pump speed</p><p class="speed-value"><span data-bind="speed">—</span><span>%</span></p><input class="range" data-input="speed" type="range" min="69" max="100" step="1" aria-label="Pump speed percentage" /><div class="presets"><button data-action="low">Low<small data-bind="low-pct">69%</small></button><button data-action="medium">Medium<small data-bind="medium-pct">80%</small></button><button data-action="high">High<small data-bind="high-pct">100%</small></button></div><p class="idle-note" data-bind="pump-note"></p></div>
            <div class="flow-power"><div><ha-icon icon="mdi:water-outline"></ha-icon><span data-bind="flow">—</span></div><div><ha-icon icon="mdi:lightning-bolt"></ha-icon><span data-bind="power">— W</span></div></div>
          </article>
        </section>
        <section class="secondary" aria-label="Lighting and water quality">
          <article class="panel lighting"><div class="panel-head"><div class="title"><ha-icon icon="mdi:lightbulb-outline"></ha-icon><h2>Pool lighting</h2></div><div><button class="switch" role="switch" data-action="lights" aria-label="Pool lights" aria-checked="false"></button><span class="toggle-label" data-bind="lights-label">Off</span></div></div><div class="lighting-body"><div class="effect"><label for="pool-effect">Color or light show</label><select id="pool-effect" data-input="effect" aria-label="Pool light effect"><option value="">Choose an effect</option></select></div><div class="landscape"><label>Landscape lights</label><button class="switch" role="switch" data-action="landscape" aria-label="Landscape lights" aria-checked="false"></button><span class="toggle-label" data-bind="landscape-label">Off</span></div></div></article>
          <article class="panel quality"><div class="title"><ha-icon icon="mdi:waves"></ha-icon><h2>Salt &amp; chlorination</h2></div><div class="quality-body"><div><p class="metric-label">Salt</p><p class="salt-reading"><span data-bind="salt">—</span> <small data-bind="salt-unit">ppm</small></p></div><div><p class="metric-label">Chlorination</p><div class="chlorination"><span class="dot" data-indicator="generating"></span><span data-bind="generating">—</span></div></div><div><p class="metric-label">Output</p><p class="output"><span data-bind="output">—</span>%</p><progress max="100" value="0" aria-label="Chlorinator output"></progress></div></div></article>
        </section>
        <div class="message" role="status" aria-live="polite"></div>
        <div class="meta"><span data-bind="controller-status">Connecting to pool controller</span><button class="settings-button" data-action="settings">Pool settings <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:15px"></ha-icon></button></div>
        <nav class="nav" aria-label="Dashboard navigation" hidden></nav>
      </main>
      <dialog class="confirmation" aria-labelledby="pool-confirm-title"><h2 id="pool-confirm-title"></h2><p class="confirm-message"></p><div class="dialog-actions"><button data-action="cancel">Cancel</button><button class="confirm" data-action="confirm">Confirm</button></div></dialog>
      <dialog class="settings" aria-labelledby="pool-settings-title"><h2 id="pool-settings-title">Pool settings</h2><div class="settings-grid"><div class="settings-info" data-bind="salt-detail"></div><label>Chlorinator<button class="switch" role="switch" data-action="chlorinator" aria-label="Chlorinator" aria-checked="false"></button></label><label>Chlorinator output (%)<input type="number" data-input="output" min="0" max="100" step="1" aria-label="Chlorinator output percentage" /></label><button class="full" data-action="output-apply">Apply output</button><button class="full" data-action="restore">Resume controller schedules</button><div class="settings-info">Manual changes can override your controller’s schedules. Use Resume controller schedules to return to scheduled operation.</div></div><div class="dialog-actions"><button data-action="settings-close">Close</button></div></dialog>`;
    this._present();
    if (this._config.image) this._el('.photo').src = this._config.image;
    else { this._el('.photo').hidden = true; this._el('.photo-caption').hidden = true; }
    this._el('.photo').addEventListener('error', () => {
      this._el('.photo').hidden = true;
      this._el('.photo-caption').textContent = 'Pool photo unavailable';
    });
    this.shadowRoot.addEventListener('click', this._clickHandler ??= event => this._click(event));
    this.shadowRoot.addEventListener('change', this._changeHandler ??= event => this._change(event));
    this.shadowRoot.addEventListener('input', this._inputHandler ??= event => {
      if (event.target.dataset.input === 'speed') {
        this._staged = true;
        this._text('speed', event.target.value);
      }
    });
    this._el('.confirmation').addEventListener('cancel', () => { this._pending = null; this._staged = false; this._update(); });
  }

  _present() {
    const config = this._config;
    const show = (selector, visible) => { this.shadowRoot.querySelectorAll(selector).forEach(el => { el.hidden = !visible; }); };
    this._el('.app').classList.add(`mode-${config.layout}`);
    this.style.setProperty('--aqua', POOL_ACCENTS[config.accent]);
    this._el('h1').textContent = config.title;
    this._el('.eyebrow').textContent = config.area;
    this._el('.brand').textContent = config.controller;
    this._el('.photo-caption').textContent = config.image_caption;
    show('.photo-caption', Boolean(config.image && config.image_caption));
    this._el('.water').classList.toggle('no-image', !config.image);
    const visible = {};
    for (const section of POOL_SECTIONS) {
      const assigned = POOL_FIELDS.some(([key, , , group]) => group === section && this._entities[key]);
      visible[section] = config.sections[section] === 'show' || (config.sections[section] !== 'hide' && assigned);
    }
    show('.water', visible.temperature); show('.circulation', visible.circulation);
    show('.lighting', visible.lighting); show('.quality', visible.quality);
    show('.primary', visible.temperature || visible.circulation); show('.secondary', visible.lighting || visible.quality);
    this._el('.primary').classList.toggle('single', visible.temperature !== visible.circulation);
    this._el('.secondary').classList.toggle('single', visible.lighting !== visible.quality);
    show('.setup', !Object.values(visible).some(Boolean));
    show('.target,.segmented', Boolean(this._entities.heater));
    show('.heat-status', Boolean(this._entities.heater || this._entities.heating));
    show('.water-controls>div:first-child>.label,.temperature,.water-controls>div:first-child>.unavailable', Boolean(this._entities.water));
    show('.pump-toggle', Boolean(this._entities.pump));
    show('.air', Boolean(this._entities.air));
    show('.speed', Boolean(this._entities.speed || this._entities.low || this._entities.medium || this._entities.high));
    for (const key of ['low', 'medium', 'high']) show(`[data-action="${key}"]`, Boolean(this._entities[key]));
    show('.range,.speed-label,.speed-value', Boolean(this._entities.speed));
    show('.presets', Boolean(this._entities.low || this._entities.medium || this._entities.high));
    show('.flow-power', Boolean(this._entities.flow || this._entities.power));
    show('.flow-power>div:first-child', Boolean(this._entities.flow)); show('.flow-power>div:last-child', Boolean(this._entities.power));
    show('.effect', Boolean(this._entities.lights)); show('.landscape', Boolean(this._entities.landscape));
    show('.lighting .panel-head>div:last-child', Boolean(this._entities.lights));
    show('.quality-body>div:nth-child(1)', Boolean(this._entities.salt));
    show('.quality-body>div:nth-child(2)', Boolean(this._entities.generating || this._entities.chlorinator));
    show('.quality-body>div:nth-child(3)', Boolean(this._entities.output));
    show('[data-action="settings"]', Boolean(this._entities.chlorinator || this._entities.output || this._entities.restore || this._entities.instantSalt));
    show('.settings-grid>label:first-of-type', Boolean(this._entities.chlorinator));
    show('.settings-grid>label:nth-of-type(2),[data-action="output-apply"]', Boolean(this._entities.output));
    show('[data-action="restore"],.settings-grid>.settings-info:last-child', Boolean(this._entities.restore));
    const nav = this._el('.nav');
    nav.hidden = !config.navigation.length;
    for (const link of config.navigation) {
      const a = document.createElement('a'); a.href = link.path;
      const icon = document.createElement('ha-icon'); icon.setAttribute('icon', link.icon || 'mdi:view-dashboard');
      const label = document.createElement('span'); label.textContent = link.label; a.append(icon, label);
      if (typeof location !== 'undefined' && link.path.split('?')[0] === location.pathname) { a.className = 'active'; a.setAttribute('aria-current', 'page'); }
      nav.append(a);
    }
  }

  _update() {
    if (!this._config || !this._hass) return;
    const heater = this._state('heater');
    const temp = this._number('water');
    const air = this._number('air');
    const unit = this._unit();
    const heaterUnit = this._heaterUnit();
    const airUnit = this._state('air')?.attributes.unit_of_measurement || unit;
    this._text('water', this._format(temp));
    this._text('unit', temp == null ? '' : unit);
    this._text('air', `${this._format(air, 1)} ${airUnit}`);
    this._text('water-note', temp == null ? (this._on('pump') ? 'Water reading unavailable' : 'Water reading unavailable · pump off') : '');
    const target = heater?.attributes.temperature == null ? NaN : Number(heater.attributes.temperature);
    this._text('target', Number.isFinite(target) ? `${this._format(target)} ${heaterUnit}` : '—');
    const heating = this._on('heating') || String(heater?.attributes['omni_heater_equip_Heat Pump__state']).toLowerCase() === 'on';
    const heatEnabled = this._ready('heater') && (heater.state === 'on' || heater.attributes.operation_mode === 'on');
    this._text('heating', !this._entities.heater && this._entities.heating ? (!this._ready('heating') ? 'Heating status unavailable' : this._on('heating') ? 'Heating' : 'Not heating') : !this._ready('heater') ? 'Heater unavailable' : heating ? 'Heating' : heatEnabled ? 'Heat enabled' : 'Heat off');
    this._text('heating-note', !this._entities.heater ? 'Reported by the controller' : !this._ready('heater') ? 'Waiting for controller' : heating ? 'Heat pump running' : heatEnabled ? 'Heat pump idle' : 'Heater disabled');
    this._el('.heat-status').classList.toggle('active', heating);
    this._el('[data-action="heat-on"]').classList.toggle('active', heatEnabled);
    this._el('[data-action="heat-off"]').classList.toggle('active', this._ready('heater') && !heatEnabled);
    const serviceMode = this._on('serviceMode');
    const disconnected = this._hass.connected === false;
    const locked = this._busy || serviceMode || disconnected;
    this._disabled('heat-off', locked || !this._ready('heater'));
    ['heat-on','target-up','target-down'].forEach(a => this._disabled(a, locked || !this._ready('heater') || !Number.isFinite(target)));
    const pumpOn = this._on('pump');
    this._text('pump-label', !this._ready('pump') ? 'Unavailable' : pumpOn ? 'Pump on' : 'Pump off');
    this._el('[data-indicator="pump"]').classList.toggle('on', pumpOn);
    this._disabled('pump', locked || !this._ready('pump'));
    this._text('pump-note', !this._ready('pump') ? 'Waiting for the controller.' : pumpOn ? '' : 'Turn on the pump to adjust speed.');
    const speed = this._number('speed');
    if (!this._staged) this._text('speed', this._format(speed));
    const range = this._el('[data-input="speed"]');
    range.min = this._state('speed')?.attributes.min ?? 0;
    range.max = this._state('speed')?.attributes.max ?? 100;
    range.step = this._state('speed')?.attributes.step ?? 1;
    range.disabled = locked || !pumpOn || speed == null;
    range.setAttribute('aria-valuetext', !pumpOn ? 'Pump off' : speed == null ? 'Unavailable' : `${speed}%`);
    if (!this._staged) range.value = speed ?? range.min;
    for (const preset of ['low','medium','high']) {
      const pct = Number(this._state(preset)?.attributes.speed);
      this._text(`${preset}-pct`, Number.isFinite(pct) ? `${pct}%` : '—');
      this._el(`[data-action="${preset}"]`).classList.toggle('active', pumpOn && speed != null && speed === pct);
      this._disabled(preset, locked || !pumpOn || !this._state(preset) || this._state(preset).state === 'unavailable');
    }
    this._text('flow', !this._ready('flow') ? 'Flow unavailable' : this._on('flow') ? 'Flow detected' : 'No flow');
    this._text('power', `${this._format(this._number('power'), 1)} ${this._state('power')?.attributes.unit_of_measurement || 'W'}`);
    for (const key of ['lights','landscape','chlorinator']) {
      const toggle = this._el(`[data-action="${key}"]`);
      toggle.setAttribute('aria-checked', String(this._on(key)));
      this._disabled(key, locked || !this._ready(key));
      this._text(`${key}-label`, !this._ready(key) ? 'Unavailable' : this._on(key) ? 'On' : 'Off');
    }
    const effects = this._state('lights')?.attributes.effect_list || [];
    const select = this._el('[data-input="effect"]');
    if (JSON.stringify(effects) !== this._effectsKey) {
      select.replaceChildren(new Option('Choose an effect', ''), ...effects.map(effect => new Option(String(effect).replace(/([a-z])([A-Z])/g, '$1 $2'), effect)));
      this._effectsKey = JSON.stringify(effects);
    }
    if (this.shadowRoot.activeElement !== select) select.value = this._state('lights')?.attributes.effect || '';
    select.disabled = locked || !this._ready('lights') || !effects.length;
    this._text('salt-unit', this._state('salt')?.attributes.unit_of_measurement || 'ppm');
    this._text('salt', this._format(this._number('salt')));
    this._text('generating', !this._entities.generating ? (!this._ready('chlorinator') ? 'Unavailable' : this._on('chlorinator') ? 'Enabled' : 'Off') : !this._ready('generating') ? 'Unavailable' : this._on('generating') ? 'Active' : this._on('chlorinator') ? 'Idle' : 'Off');
    this._el('[data-indicator="generating"]').classList.toggle('on', this._on('generating'));
    const output = this._number('output');
    this._text('output', this._format(output));
    this._el('progress').value = output ?? 0;
    this._el('progress').setAttribute('aria-valuetext', output == null ? 'Unavailable' : `${output}%`);
    const outputInput = this._el('[data-input="output"]');
    if (this.shadowRoot.activeElement !== outputInput) outputInput.value = output ?? '';
    outputInput.disabled = locked || output == null;
    outputInput.min = this._state('output')?.attributes.min ?? 0;
    outputInput.max = this._state('output')?.attributes.max ?? 100;
    outputInput.step = this._state('output')?.attributes.step ?? 1;
    this._disabled('output-apply', locked || output == null);
    this._disabled('restore', locked || !this._state('restore') || this._state('restore').state === 'unavailable');
    this._text('salt-detail', `Average salt ${this._format(this._number('salt'))} ppm · Instant salt ${this._format(this._number('instantSalt'))} ppm`);
    const messages = [];
    if (disconnected) messages.push('Home Assistant connection lost. Dashboard controls are paused.');
    if (serviceMode) messages.push('Controller is in service mode. Dashboard controls are paused.');
    for (const [key, attribute, fallback] of [['fault','error_messages','Chlorinator fault'],['alert','alert_messages','Chlorinator alert']]) {
      if (this._on(key)) {
        const details = this._state(key)?.attributes[attribute];
        messages.push(Array.isArray(details) && details.length ? `${fallback}: ${details.join(', ')}` : fallback);
      }
    }
    const notice = this._el('.notice');
    notice.hidden = messages.length === 0;
    notice.textContent = messages.join(' ');
    const configured = POOL_FIELDS.filter(([key]) => this._entities[key]);
    const unavailable = configured.filter(([key, , domain]) => !this._ready(key) && !(domain === 'button' && this._state(key)?.state === 'unknown'));
    const entities = ['water','heater','pump','speed'].map(k => this._state(k)).filter(Boolean);
    const latest = Math.max(...entities.map(e => new Date(e.last_updated || e.last_changed || 0).getTime()).filter(Number.isFinite), 0);
    const age = latest ? Math.max(0, Math.floor((Date.now()-latest)/60000)) : null;
    this._text('controller-status', !configured.length ? 'Choose equipment in the card editor' : unavailable.length ? `${unavailable.length} reading${unavailable.length === 1 ? '' : 's'} unavailable` : messages.length ? 'Controller needs attention' : `Live controller readings${age == null ? '' : age < 1 ? ' · updated just now' : ` · updated ${age}m ago`}`);
  }

  _command(domain, service, key, data = {}) {
    return { domain, service, key, data: { entity_id: this._entities[key], ...data } };
  }
  _confirm(title, text, command) {
    if (this._busy) return;
    this._el('.settings').close();
    this._pending = command;
    this._el('#pool-confirm-title').textContent = title;
    this._el('.confirm-message').textContent = text;
    this._el('.confirmation').showModal();
  }
  _cancel() {
    this._pending = null;
    this._staged = false;
    this._el('.confirmation').close();
    this._update();
  }
  _message(text, error = false) {
    this._el('.message').textContent = text;
    this._el('.message').classList.toggle('error', error);
  }
  async _run(command) {
    if (!command || this._busy) return;
    if (this._on('serviceMode') || this._hass?.connected === false) {
      this._staged = false;
      this._message('The controller cannot accept commands right now. Check the connection and service mode.', true);
      return this._update();
    }
    if (['speed','low','medium','high'].includes(command.key) && !this._on('pump')) {
      this._staged = false;
      this._message('The pump is now off. Turn it on before changing its speed.', true);
      return this._update();
    }
    const obj = this._state(command.key);
    const actionableButton = command.domain === 'button';
    if (!obj || obj.state === 'unavailable' || (!actionableButton && obj.state === 'unknown')) {
      this._message('This control is unavailable. Wait for the controller to reconnect.', true);
      return;
    }
    this._busy = true;
    this._message('Sending command…');
    this._update();
    try {
      await this._hass.callService(command.domain, command.service, command.data);
      this._message('Command sent. Waiting for the controller’s live reading.');
    } catch (error) {
      this._message(`Command failed: ${error.message || 'The controller did not respond.'}`, true);
    } finally {
      this._busy = false;
      this._staged = false;
      this._update();
    }
  }

  _click(event) {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'cancel') return this._cancel();
    if (action === 'settings-close') return this._el('.settings').close();
    if (action === 'settings') { this._update(); return this._el('.settings').showModal(); }
    if (action === 'confirm') {
      const command = this._pending;
      this._pending = null;
      this._el('.confirmation').close();
      return this._run(command);
    }
    if (this._busy || this._on('serviceMode')) return;
    if (action === 'pump') {
      const on = !this._on('pump');
      return this._confirm(`Turn ${on ? 'on' : 'off'} the pump?`, on ? 'Start the pool filter pump at the controller’s configured speed.' : 'Stop pool circulation. Heating and chlorination may pause without water flow.', this._command('switch', on ? 'turn_on' : 'turn_off', 'pump'));
    }
    if (action === 'heat-on' || action === 'heat-off') {
      const on = action === 'heat-on';
      return this._confirm(on ? 'Enable pool heating?' : 'Disable pool heating?', on ? `Enable the heater at ${this._el('[data-bind="target"]').textContent}. The controller will manage actual heating.` : 'Disable the pool heater.', this._command('water_heater', 'set_operation_mode', 'heater', { operation_mode: on ? 'on' : 'off' }));
    }
    if (action === 'target-up' || action === 'target-down') {
      const attrs = this._state('heater')?.attributes || {};
      const current = Number(attrs.temperature);
      const celsius = this._heaterUnit() === '°C';
      const step = Number(attrs.target_temp_step) || 1;
      const value = Math.round(Math.min(attrs.max_temp ?? (celsius ? 40 : 104), Math.max(attrs.min_temp ?? (celsius ? 10 : 50), current + (action === 'target-up' ? step : -step))) * 100) / 100;
      if (!Number.isFinite(value) || value === current) return;
      return this._confirm(`Set heater target to ${value}°?`, 'Change the pool heater target temperature. This does not enable a disabled heater.', this._command('water_heater', 'set_temperature', 'heater', { temperature: value }));
    }
    if (['low','medium','high'].includes(action)) {
      if (!this._on('pump')) return;
      return this._confirm(`Use ${action} pump speed?`, `Set the running pump to the controller’s ${this._state(action)?.attributes.speed ?? action}% preset.`, this._command('button', 'press', action));
    }
    if (['lights','landscape','chlorinator'].includes(action)) {
      const domain = action === 'lights' ? 'light' : 'switch';
      const on = !this._on(action);
      const command = this._command(domain, on ? 'turn_on' : 'turn_off', action);
      if (action === 'chlorinator') return this._confirm(`${on ? 'Enable' : 'Disable'} chlorination?`, 'Change the chlorinator’s enabled state. Generation still depends on the controller and water flow.', command);
      return this._run(command);
    }
    if (action === 'output-apply') {
      const input = this._el('[data-input="output"]');
      const value = Number(input.value);
      if (!input.value || !input.checkValidity() || !Number.isFinite(value)) return input.reportValidity();
      return this._confirm(`Set chlorinator output to ${value}%?`, 'Change the controller’s chlorinator output setting.', this._command('number', 'set_value', 'output', { value }));
    }
    if (action === 'restore') return this._confirm('Resume controller schedules?', 'Return the pool controller to its scheduled operation. Equipment may change state according to those schedules.', this._command('button', 'press', 'restore'));
  }

  _change(event) {
    if (event.target.dataset.input === 'speed') {
      const value = Number(event.target.value);
      if (!this._on('pump') || !event.target.checkValidity() || !Number.isFinite(value)) { this._staged = false; return this._update(); }
      return this._confirm(`Set pump speed to ${value}%?`, 'Change the running pool filter pump’s speed.', this._command('number', 'set_value', 'speed', { value }));
    }
    if (event.target.dataset.input === 'effect' && event.target.value) {
      const effect = event.target.value;
      if (!(this._state('lights')?.attributes.effect_list || []).includes(effect)) return;
      return this._confirm('Apply pool light effect?', `Turn on the pool lights using ${event.target.selectedOptions[0].textContent}.`, this._command('light', 'turn_on', 'lights', { effect }));
    }
  }
}

if (!customElements.get('pool-control-card-editor')) customElements.define('pool-control-card-editor', PoolControlCardEditor);
if (!customElements.get('pool-control-card')) customElements.define('pool-control-card', PoolControlCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'pool-control-card')) window.customCards.push({
  type: 'pool-control-card', name: 'Pool Control Card', preview: false,
  description: 'Photo-led pool controls with a visual editor and live equipment status.',
  documentationURL: 'https://github.com/neilfernandez/pool-control-card',
});

