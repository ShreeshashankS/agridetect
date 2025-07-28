'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/diagnose-disease.ts';
import '@/ai/flows/suggest-remedies.ts';
import '@/ai/flows/identify-plant.ts';
import '@/ai/flows/remedy-assistant.ts';
