import { useEffect, useState } from "react";
import { api, ApiError } from "./apiClient";
import type { TestCatalogItem } from "./attemptTypes";

export function useTestCatalog() {
  const [tests, setTests] = useState<TestCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get<TestCatalogItem[]>("/tests")
      .then((data) => {
        if (active) setTests(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof ApiError ? err.message : "Failed to load the test catalog.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { tests, loading, error };
}
