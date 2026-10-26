import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiInstance } from "../../service";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export const useUsers = (enabled = true) => {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiInstance.get(`${API_BASE}/users`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) =>
      apiInstance
        .put(`${API_BASE}/users/${id}`, updates)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update user");
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiInstance.delete(`${API_BASE}/users/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
    },
  });
};
