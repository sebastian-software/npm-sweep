import * as fs from 'node:fs/promises';
import type { Plan } from '../types/plan.js';
import { validatePlanSchema } from './validator.js';

export async function savePlan(plan: Plan, filePath: string): Promise<void> {
  const content = JSON.stringify(plan, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function loadPlan(filePath: string): Promise<Plan> {
  const content = await fs.readFile(filePath, 'utf-8');
  const data: unknown = JSON.parse(content);

  const result = validatePlanSchema(data);
  if (!result.valid || !result.plan) {
    throw new Error(`Invalid plan file: ${result.error ?? 'unknown error'}`);
  }

  return result.plan;
}

export function planToJson(plan: Plan): string {
  return JSON.stringify(plan, null, 2);
}

export function planFromJson(json: string): Plan {
  const data: unknown = JSON.parse(json);

  const result = validatePlanSchema(data);
  if (!result.valid || !result.plan) {
    throw new Error(`Invalid plan: ${result.error ?? 'unknown error'}`);
  }

  return result.plan;
}
