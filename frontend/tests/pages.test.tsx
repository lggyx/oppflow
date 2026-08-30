import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RegisterPage from "@/pages/RegisterPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { MemoryRouter } from "react-router-dom";

/** 组件冒烟测试：关键页面能渲染出预期文案。 */
describe("页面冒烟", () => {
  it("注册页渲染标题与邀请码输入", () => {
    const { container, getByText } = render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    expect(getByText("加入 oppflow")).toBeTruthy();
    expect(container.querySelector("#invite")).toBeTruthy();
    expect(getByText("创建账号")).toBeTruthy();
  });

  it("404 页渲染", () => {
    expect(render(<MemoryRouter><NotFoundPage /></MemoryRouter>).getByText("404")).toBeTruthy();
  });
});
