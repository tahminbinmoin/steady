import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const objectiveFields = z.object({
  title: z.string().trim().min(1, "Give your objective a title").max(120, "Keep the title under 120 characters"),
  description: optionalText(1000),
  category: optionalText(40),
  icon: optionalText(32),
});

export const objectiveCreate = objectiveFields.extend({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export type ObjectiveFields = z.input<typeof objectiveFields>;
export type ObjectiveCreate = z.input<typeof objectiveCreate>;

export const uuid = z.uuid();
export const themePreference = z.enum(["light", "dark", "system"]);
export const displayName = z.string().trim().min(1, "Enter a name").max(120);

export const CATEGORIES = ["Health", "Fitness", "Learning", "Career", "Creative", "Mindfulness", "Finance", "Social", "Home"] as const;
export const SUGGESTED_ICONS = ["🏃", "📚", "🧠", "💧", "🎬", "💻", "🌙", "🧘", "✍️", "🎯", "🥗", "🎸"] as const;
