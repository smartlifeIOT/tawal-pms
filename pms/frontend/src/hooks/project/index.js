// src/hooks/useProjects.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiInstance } from "../../service";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

// get project by category
export const useProjectsByCategory = (categoryName, options = {}) => {
  const { page, limit } = options;
  const queryParams = new URLSearchParams();
  if (page) queryParams.append("page", page);
  if (limit) queryParams.append("limit", limit);
  const queryString = queryParams.toString();

  return useQuery({
    queryKey: ["projects", categoryName, page, limit],
    queryFn: () =>
      apiInstance
        .get(
          `${API_BASE}/projects/category/${categoryName}${queryString ? `?${queryString}` : ""}`,
        )
        .then((res) => res.data),
    enabled: !!categoryName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000,
    ...options,
  });
};
export const useStats = () => {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () =>
      apiInstance.get(`${API_BASE}/projects/stats`).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000,
  });
};

// Fetch all projects
export const useProjectsHook = (filters = {}) => {
  const { search, category, program, status, priority, region, city, page, limit } =
    filters;
  const queryParams = new URLSearchParams();
  if (search) queryParams.append("search", search);
  if (category) queryParams.append("category", category);
  if (program) queryParams.append("program", program);
  if (status) queryParams.append("status", status);
  if (priority) queryParams.append("priority", priority);
  if (region) queryParams.append("region", region);
  if (city) queryParams.append("city", city);
  if (page) queryParams.append("page", page);
  if (limit) queryParams.append("limit", limit);

  const queryString = queryParams.toString();
  const url = `${API_BASE}/projects${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: ["projects", filters],
    queryFn: () => apiInstance.get(url).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000,
  });
};

// Create a new project
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newProject) =>
      apiInstance
        .post(`${API_BASE}/projects`, newProject)
        .then((res) => res.data),
    onSuccess: () => {
      // Invalidate projects list so it refetches with the new entry
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
    },
    onError: (error) => {
      toast.error(error.response.data.message || "Failed to create project");
    },
  });
};

// Update an existing project
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) =>
      apiInstance
        .put(`${API_BASE}/projects/${id}`, updates)
        .then((res) => res.data),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables?.id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Project updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update project");
    },
  });
};

// Delete a project
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiInstance.delete(`${API_BASE}/projects/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Project deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete project");
    },
  });
};

// Bulk delete projects
export const useBulkDeleteProjects = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) =>
      apiInstance
        .post(`${API_BASE}/projects/bulk-delete`, { ids })
        .then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["projectFilters"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(data?.message || "Projects deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete projects");
    },
  });
};

// Bulk update projects (program, category, projectScope)
export const useBulkUpdateProjects = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, program, category, projectScope }) =>
      apiInstance
        .post(`${API_BASE}/projects/bulk-update`, {
          ids,
          program,
          category,
          projectScope,
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["projectFilters"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(data?.message || "Projects updated successfully");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to bulk update projects",
      );
    },
  });
};

// Fetch distinct regions & cities for filter dropdowns
export const useProjectFilters = () => {
  return useQuery({
    queryKey: ["projectFilters"],
    queryFn: () =>
      apiInstance.get(`${API_BASE}/projects/filters`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
};

// get single project by id
export const useProjectById = (id) => {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () =>
      apiInstance.get(`${API_BASE}/projects/${id}`).then((res) => res.data),
    enabled: !!id, // Only run the query if id is truthy
  });
};
export const useCategories = (searchQuery = "", program = "") => {
  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.append("search", searchQuery);
  if (program && program !== "All Programs")
    queryParams.append("program", program);
  const queryString = queryParams.toString();

  return useQuery({
    queryKey: ["categories", searchQuery, program],
    queryFn: () =>
      apiInstance
        .get(`${API_BASE}/categories${queryString ? `?${queryString}` : ""}`)
        .then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCategory) =>
      apiInstance
        .post(`${API_BASE}/categories`, newCategory)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create category");
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiInstance
        .delete(`${API_BASE}/categories/${id}`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete category");
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, budget, program }) =>
      apiInstance
        .put(`${API_BASE}/categories/${id}`, { name, budget, program })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Category updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update category");
    },
  });
};

export const useUploadProjectsBulk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projects }) =>
      apiInstance
        .post(`${API_BASE}/projects/bulk`, { projects })
        .then((res) => res.data),
    onSuccess: () => {
      toast.success("Projects uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (error) => {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to upload projects");
    },
  });
};

// Import Issued WO sheet → bulk set WO Issuance (Approved + WO Number + date)
export const useImportIssuedWo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows }) =>
      apiInstance
        .post(`${API_BASE}/projects/bulk/wo-issuance`, { rows })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
};

// Add a scope to a category
export const useAddCategoryScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scope }) =>
      apiInstance
        .post(`${API_BASE}/categories/${id}/scopes`, { scope })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Scope added");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to add scope");
    },
  });
};

// Remove a scope from a category
export const useDeleteCategoryScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scopeName }) =>
      apiInstance
        .delete(
          `${API_BASE}/categories/${id}/scopes/${encodeURIComponent(scopeName)}`,
        )
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Scope removed");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to remove scope");
    },
  });
};

// Programs hooks
export const usePrograms = (searchQuery = "") => {
  return useQuery({
    queryKey: ["programs", searchQuery],
    queryFn: () =>
      apiInstance
        .get(
          `${API_BASE}/programs${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ""}`,
        )
        .then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newProgram) =>
      apiInstance
        .post(`${API_BASE}/programs`, newProgram)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program created successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create program");
    },
  });
};

export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, budget, description }) =>
      apiInstance
        .put(`${API_BASE}/programs/${id}`, { name, budget, description })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Program updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update program");
    },
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiInstance
        .delete(`${API_BASE}/programs/${id}`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Program deleted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete program");
    },
  });
};

export const useProjectsByProgram = (programName, options = {}) => {
  const { page, limit, category, status, priority, search } = options;
  const queryParams = new URLSearchParams();
  if (page) queryParams.append("page", page);
  if (limit) queryParams.append("limit", limit);
  if (category && category !== "All Categories")
    queryParams.append("category", category);
  if (status && status !== "All Statuses") queryParams.append("status", status);
  if (priority && priority !== "All Priorities")
    queryParams.append("priority", priority);
  if (search) queryParams.append("search", search);
  const queryString = queryParams.toString();

  return useQuery({
    queryKey: [
      "projects",
      "program",
      programName,
      page,
      limit,
      category,
      status,
      priority,
      search,
    ],
    queryFn: () =>
      apiInstance
        .get(
          `${API_BASE}/projects/program/${encodeURIComponent(programName)}${queryString ? `?${queryString}` : ""}`,
        )
        .then((res) => res.data),
    enabled: !!programName,
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    ...options,
  });
};

export default {
  useProjectsHook,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useBulkDeleteProjects,
  useBulkUpdateProjects,
  useProjectFilters,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  useUploadProjectsBulk,
  useImportIssuedWo,
  useAddCategoryScope,
  useDeleteCategoryScope,
  usePrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  useProjectsByProgram,
};
