import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus } from "./api";

export const authStatusQueryKey = ["auth", "status"];

export function useAuthStatus() {
  return useQuery({
    queryKey: authStatusQueryKey,
    queryFn: fetchAuthStatus,
  });
}
