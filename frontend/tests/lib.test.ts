import { describe, expect, it } from "vitest";

import { STATUS_LABELS, TYPE_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

describe("lib 工具", () => {
  it("timeAgo 分级正确", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 30_000).toISOString())).toBe("刚刚");
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString())).toBe("5 分钟前");
    expect(timeAgo(new Date(now - 3 * 3600_000).toISOString())).toBe("3 小时前");
    expect(timeAgo(new Date(now - 2 * 86400_000).toISOString())).toBe("2 天前");
  });

  it("类型与状态标签映射完整", () => {
    expect(TYPE_LABELS.team).toBe("组队");
    expect(TYPE_LABELS.job).toBe("招聘试用");
    expect(STATUS_LABELS.open).toBe("报名中");
    expect(STATUS_LABELS.in_review).toBe("审核中");
  });
});
