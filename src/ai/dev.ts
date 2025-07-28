import { config } from 'dotenv';
config();

import '@/ai/flows/diagnose-disease.ts';
import '@/ai/flows/suggest-remedies.ts';