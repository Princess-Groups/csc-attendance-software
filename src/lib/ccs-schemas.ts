import { z } from "zod";

/**
 * Shared employee profile validation. Everything is manual-entry based:
 * only the name is required, all other fields accept any free text the
 * Super Admin types (sensible fallbacks are applied when left blank).
 */
export const profileFields = z.object({
  name: z.string().trim().min(2).max(60),
  branch: z.enum(["Colachel", "Vadasery", "Nagercoil"], {
    message: "Choose a branch: Colachel, Vadasery or Nagercoil",
  }),

  designation: z.string().trim().max(60).default(""),
  department: z.string().trim().max(60).default(""),
  workType: z.string().trim().max(60).default(""),
  mobile: z.string().trim().max(20).optional(),
  email: z.string().trim().max(120).optional(),
  shift: z.string().trim().max(30).default(""),
  officialStart: z.string().max(5).default("09:00"),
  officialEnd: z.string().max(5).default("18:00"),
  joiningDate: z.string().min(1),
});

