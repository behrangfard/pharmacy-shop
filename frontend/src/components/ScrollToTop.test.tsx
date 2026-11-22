import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import ScrollToTop from "./ScrollToTop";

/**
 * مدیریت اسکرول در ناوبری سمت کلاینت:
 *
 * - رفتن به صفحهٔ تازه از بالای همان صفحه شروع می‌شود.
 * - برگشت با Back مرورگر کاربر را به همان موقعیتی برمی‌گرداند که رهایش کرده
 *   بود (نه بالای صفحه).
 *
 * موقعیت اسکرول در jsdom واقعی نیست؛ پس `window.scrollY` شبیه‌سازی و
 * `window.scrollTo` جای‌گزین می‌شود تا مقدار هدف ثبت شود.
 */
let scrollY = 0;

beforeEach(() => {
  scrollY = 0;

  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => scrollY,
  });

  vi.spyOn(window, "scrollTo").mockImplementation(
    (options?: ScrollToOptions | number, y?: number) => {
      scrollY = typeof options === "number" ? (y ?? 0) : (options?.top ?? 0);
    },
  );
});

function TestApp() {
  const navigate = useNavigate();

  return (
    <>
      <ScrollToTop />
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      <Routes>
        <Route
          path="/products"
          element={<Link to="/product/serum">serum</Link>}
        />
        <Route path="/product/:slug" element={<p>detail</p>} />
      </Routes>
    </>
  );
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/products"]}>
      <TestApp />
    </MemoryRouter>,
  );
}

/** اسکرول کاربر: موقعیت سند عوض می‌شود و رویداد scroll می‌آید. */
async function userScrollsTo(top: number) {
  scrollY = top;
  fireEvent.scroll(window);

  // ذخیرهٔ موقعیت با requestAnimationFrame انجام می‌شود.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
}

describe("ScrollToTop", () => {
  it("starts a new page at the top", async () => {
    renderApp();

    await userScrollsTo(700);
    expect(window.scrollY).toBe(700);

    fireEvent.click(screen.getByRole("link", { name: "serum" }));

    await waitFor(() => expect(window.scrollY).toBe(0));
  });

  it("restores the previous position when the browser goes back", async () => {
    renderApp();

    await userScrollsTo(640);
    fireEvent.click(screen.getByRole("link", { name: "serum" }));

    // صفحهٔ تازه از بالا شروع می‌شود.
    await waitFor(() => expect(window.scrollY).toBe(0));

    fireEvent.click(screen.getByRole("button", { name: "back" }));

    await waitFor(() => expect(window.scrollY).toBe(640));
  });

  it("keeps the page at the top on back when nothing was scrolled", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("link", { name: "serum" }));
    await waitFor(() => expect(window.scrollY).toBe(0));

    fireEvent.click(screen.getByRole("button", { name: "back" }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "serum" })).toBeInTheDocument(),
    );
    expect(window.scrollY).toBe(0);
  });
});
