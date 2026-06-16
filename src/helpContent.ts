// src/helpContent.ts

import overview from '../help/index.md?raw';
import journal from '../help/journal.md?raw';
import setupWizard from '../help/setup-wizard.md?raw';
import emergency from '../help/emergency.md?raw';
import profiles from '../help/profiles.md?raw';
import backup from '../help/backup.md?raw';
import packingChecklists from '../help/packing-checklists.md?raw';
import countryChecklists from '../help/country-checklists.md?raw';
import metadataScrubber from '../help/metadata-scrubber.md?raw';
import phrasebook from '../help/phrasebook.md?raw';
import expenses from '../help/expenses.md?raw';

export interface HelpTopic {
  id: string;
  title: string;
  content: string;
}

export const helpTopics: HelpTopic[] = [
  { id: 'overview', title: 'Overview', content: overview },
  { id: 'journal', title: 'Encrypted Journal', content: journal },
  { id: 'setup-wizard', title: 'Secure Setup Wizard', content: setupWizard },
  { id: 'emergency', title: 'Emergency Toolkit', content: emergency },
  { id: 'profiles', title: 'Settings & Profiles', content: profiles },
  { id: 'backup', title: 'Export & Backup', content: backup },
  { id: 'packing-checklists', title: 'Packing Checklists', content: packingChecklists },
  { id: 'country-checklists', title: 'Country Security Checklists', content: countryChecklists },
  { id: 'metadata-scrubber', title: 'Metadata Scrubber', content: metadataScrubber },
  { id: 'phrasebook', title: 'Offline Phrasebook', content: phrasebook },
  { id: 'expenses', title: 'Expense Tracker', content: expenses },
];