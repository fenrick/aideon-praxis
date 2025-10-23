import Settings from './Settings.svelte';

const container = document.querySelector('#root');
if (!container) throw new Error('Root container #root not found');
const settingsApp = new Settings({ target: container as HTMLElement });
export default settingsApp;
