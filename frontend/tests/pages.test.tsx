import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { MemoryRouter } from "react-router-dom";

/** 页面冒烟测试：关键页面能渲染出预期内容。 */
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

  it("登录页渲染表单", () => {
    const { getByText } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(getByText("登录 oppflow")).toBeTruthy();
    expect(getByText("登录")).toBeTruthy();
  });

  it("404 页渲染", () => {
    expect(render(<MemoryRouter><NotFoundPage /></MemoryRouter>).getByText("404")).toBeTruthy();
  });
});
