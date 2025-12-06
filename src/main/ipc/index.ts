import { registerCertificateHandlers } from './certificateHandlers';
import { registerTemplateHandlers } from './templateHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerConfluenceHandlers } from './confluenceHandlers';

export function registerAllHandlers(): void {
  registerCertificateHandlers();
  registerTemplateHandlers();
  registerSettingsHandlers();
  registerConfluenceHandlers();
}
