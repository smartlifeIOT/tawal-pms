import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiInstance } from "../../service";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (...registerData) =>
      apiInstance
        .post(`${API_BASE}/auth/register`, ...registerData)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User registered successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to register user");
    },
  });
};

// hook to get  for roles ok
export const useRole = () => {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () =>
      apiInstance.get(`${API_BASE}/auth/roles`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
};
export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }) =>
      apiInstance
        .put(`${API_BASE}/auth/update-role/${id}`, { role })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update role");
    },
  });
};
