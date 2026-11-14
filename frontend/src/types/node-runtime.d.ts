/**
 * تایپ‌های حداقلی برای ماژول‌های Node که فقط در `vite.config.ts` استفاده
 * می‌شوند.
 *
 * پروژه به `@types/node` وابسته نیست؛ این فایل فقط همان چند تابع لازم برای
 * پلاگین نسخه‌بندی سرویس‌ورکر را توصیف می‌کند تا typecheck بدون نصب بستهٔ
 * اضافی سبز بماند.
 */

declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string): {
      digest(encoding: "hex"): string;
    };
  };
}

declare module "node:fs/promises" {
  export function readdir(path: string): Promise<string[]>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function writeFile(
    path: string,
    data: string,
    encoding: "utf8",
  ): Promise<void>;
}

declare module "node:path" {
  const path: {
    resolve(...segments: string[]): string;
    join(...segments: string[]): string;
  };

  export default path;
}
