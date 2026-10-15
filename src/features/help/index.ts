// Public API of the help feature: guided tours, the help menu and centre, and the workspace's help settings.
export { TourProvider, useTours } from "./components/TourProvider";
export { HelpMenu } from "./components/HelpMenu";
export { HelpSettingsEditor, DEFAULT_HELP } from "./components/HelpSettingsEditor";
export type { HelpSettingsEditorProps } from "./components/HelpSettingsEditor";
export { TOURS, availableTours, tourForPath } from "./tours";
export type { TourMeta, TourStep } from "./tours";
