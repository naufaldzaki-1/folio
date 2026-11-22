import { failureResponse } from "@/lib/api";

// Shared with the Career Roadmap and CV Builder routes so every private endpoint
// answers unauthenticated requests the same way.
export { authenticated } from "@/lib/api";
export const failure = (error: unknown) => failureResponse(error);