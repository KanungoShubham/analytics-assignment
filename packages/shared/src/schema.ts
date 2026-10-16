import { z } from 'zod';
import { EVENT_NAME_PATTERN, MAX_BATCH_EVENTS, MAX_PROPERTIES_BYTES } from './limits';

const byteLength = (s: string) => new TextEncoder().encode(s).length;
const optionalText = (max: number) => z.string().max(max).nullish();

export const eventSchema = z
  .object({
    event_id: z.string().uuid(),
    type: z.enum(['page_view', 'track', 'identify']),
    name: z.string().regex(EVENT_NAME_PATTERN, 'must be 1-100 chars of letters, digits, _ . : -'),
    anonymous_id: z.string().min(1).max(100).nullish(),
    user_id: z.string().min(1).max(200).nullish(),
    session_id: optionalText(100),
    timestamp: z.string().datetime({ offset: true }),
    url: optionalText(2048),
    title: optionalText(500),
    referrer: optionalText(2048),
    properties: z.record(z.unknown()).default({}),
  })
  .superRefine((e, ctx) => {
    if (!e.anonymous_id && !e.user_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['anonymous_id'], message: 'anonymous_id or user_id is required' });
    }
    if (byteLength(JSON.stringify(e.properties)) > MAX_PROPERTIES_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['properties'], message: `must be at most ${MAX_PROPERTIES_BYTES} bytes` });
    }
  });

export type ValidEvent = z.output<typeof eventSchema>;

export const batchSchema = z.object({
  publicKey: z.string().optional(),
  events: z.array(z.unknown()).min(1).max(MAX_BATCH_EVENTS),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
}
