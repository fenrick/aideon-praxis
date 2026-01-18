export const HOST_EVENT_NAMES = {
  shellCommand: 'shell_command',
  mnemeChangeEvent: 'mneme_change_event',
} as const;

export const HOST_SHELL_COMMAND_IDS = {
  toggleNavigation: 'toggle_navigation',
  toggleInspector: 'toggle_inspector',
  openCommandPalette: 'open_command_palette',
  filePrint: 'file_print',
  fileOpen: 'file_open',
  fileSaveAs: 'file_save_as',
} as const;
