import type { DataProvider } from "@refinedev/core";
import axios from "axios";
import { BACKEND_BASE_URL } from "@/constants";

const API_URL = BACKEND_BASE_URL.endsWith("/")
  ? BACKEND_BASE_URL.slice(0, -1)
  : BACKEND_BASE_URL;

const axiosInstance = axios.create({
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, pagination, filters }: any) => {
    const url = `${API_URL}/${resource}`;
    const params: any = {};

    if (pagination) {
      params.page = pagination.current ?? 1;
      params.limit = pagination.pageSize ?? 10;
    }

    filters?.forEach((filter: any) => {
      if ("field" in filter && filter.value !== undefined) {
        const { field, value } = filter;
        params[field] = value;
        if (field === "role") params.role = value;
        if (field === "search" || field === "name" || field === "email") params.search = value;
        if (resource === "subjects" && field === "department") params.department = value;
        if (resource === "classes" && field === "subject") params.subject = value;
        if (resource === "classes" && field === "teacher") params.teacher = value;
      }
    });

    const { data } = await axiosInstance.get(url, { params });
    return {
      data: data.data || [],
      total: data.pagination?.total || data.data?.length || 0,
    };
  },

  create: async ({ resource, variables }: any) => {
    const { data } = await axiosInstance.post(`${API_URL}/${resource}`, variables);
    return { data: data.data || data };
  },

  update: async ({ resource, id, variables, meta }: any) => {
    // Use PATCH by default (backend uses PATCH for partial updates).
    // Pass meta.method = "put" to force PUT if needed.
    const method = meta?.method === "put" ? "put" : "patch";
    const { data } = await axiosInstance[method](
      `${API_URL}/${id ? `${resource}/${id}` : resource}`,
      variables
    );
    return { data: data.data || data };
  },

  getOne: async ({ resource, id }: any) => {
    const { data } = await axiosInstance.get(`${API_URL}/${resource}/${id}`);
    return { data: data.data || data };
  },

  deleteOne: async ({ resource, id, variables }: any) => {
    const { data } = await axiosInstance.delete(`${API_URL}/${resource}/${id}`, {
      data: variables,
    });
    return { data: data.data || data };
  },

  custom: async ({ url, method, payload, query, headers }: any) => {
    const relativeUrl = url.startsWith("/") ? url.slice(1) : url;
    const requestUrl = url.startsWith("http") ? url : `${API_URL}/${relativeUrl}`;

    const { data } = await axiosInstance({
      method,
      url: requestUrl,
      data: payload,
      params: query,
      headers,
    });

    return { data: data.data || data };
  },
};