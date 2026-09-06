import { demoApi } from "./demo-api";

// Preserve the UI's API contract while routing every operation to
// browser-local synthetic data. This static Pages build has no backend.
export async function api<T>(url: string, body?: object): Promise<T> {
  try {
    return await demoApi<T>(url, body);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("ไม่สามารถทำรายการเดโมได้ กรุณาลองอีกครั้ง");
  }
}
