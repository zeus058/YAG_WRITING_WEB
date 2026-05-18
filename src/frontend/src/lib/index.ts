/**
 * Thư viện tiện ích (Utils) và cấu hình API Client.
 *
 * Bao gồm:
 * - apiClient: Axios/Fetch instance cấu hình sẵn baseURL, JWT interceptor.
 * - constants: Các hằng số ứng dụng (API endpoints, màu sắc, etc.).
 * - helpers: Hàm tiện ích định dạng ngày, chuỗi, số liệu.
 * - validators: Hàm kiểm tra tính hợp lệ dữ liệu form.
 */

/**
 * Địa chỉ gốc của API Backend.
 * Đọc từ biến môi trường hoặc mặc định localhost khi phát triển.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Bảng màu Design Token — Đồng bộ với globals.css và DESIGN.md.
 * Sử dụng khi cần tham chiếu màu trong logic TypeScript (chart, canvas, etc.).
 */
export const DESIGN_TOKENS = {
  primary: "#C81C30",
  secondary: "#FEBDB2",
  background: "#FFECCE",
  text: "#41503D",
} as const;
