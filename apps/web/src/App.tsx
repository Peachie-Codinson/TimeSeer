import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api/client";

function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await apiClient.health.live.$get();
      if (!res.ok) throw new Error("Health check failed");
      return res.json();
    },
  });
}

export function App() {
  const { data, isLoading, isError } = useHealth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Private Academic Planner</h1>
        <p className="mt-2 text-sm text-slate-400">
          {isLoading && "Checking server status..."}
          {isError && "Server is unreachable."}
          {data && `Server status: ${data.status}`}
        </p>
      </div>
    </div>
  );
}
