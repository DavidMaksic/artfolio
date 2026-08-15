import { TRPCClientError } from "@trpc/client";

export function extractTrpcError(err: unknown): string {
  if (err instanceof TRPCClientError) {
    try {
      const issues = JSON.parse(err.message);
      if (Array.isArray(issues) && issues[0]?.message) {
        return issues[0].message;
      }
    } catch {
      return err.message;
    }
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
