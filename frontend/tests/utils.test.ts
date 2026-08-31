import { describe, expect, it } from "vitest";

import { timeAgo, formatDate } from "@/lib/utils";
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/types";

describe("lib 工具函数", () => {
  it("timeAgo 分级正确", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 30_000).toISOString())).toBe("刚刚");
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString())).toBe("5 分钟前");
    expect(timeAgo(new Date(now - 3 * 3600_000).toISOString())).toBe("3 小时前");
    expect(timeAgo(new Date(now - 2 * 86400_000).toISOString())).toBe("2 天前");
    // 30 天以上返回 toLocaleDateString 本地化格式
    const far = timeAgo(new Date(now - 30 * 86400_000).toISOString());
    expect(far).toContain("2026");
  });

  it("type/status 标签映射完整", () => {
    expect(TYPE_LABELS.team).toBe("组队");
    expect(TYPE_LABELS.gig).toBe("接单");
    expect(TYPE_LABELS.event).toBe("活动");
    expect(TYPE_LABELS.job).toBe("招聘试用");
    expect(STATUS_LABELS.open).toBe("报名中");
    expect(STATUS_LABELS.in_review).toBe("审核中");
    expect(STATUS_LABELS.published).toBe("已发布");
    expect(STATUS_LABELS.active).toBe("进行中");
    expect(STATUS_LABELS.closed).toBe("已关闭");
    expect(STATUS_LABELS.archived).toBe("已归档");
  });

  it("formatDate 格式化日期", () => {
    const result = formatDate("2026-08-31T12:00:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("8");  // zh-CN locale: 8月 not 08月
    expect(result).toContain("31");
  });

  it("formatDate 处理空值", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
});
