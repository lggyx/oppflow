"""AI 提示词模板：画像 / 机会摘要 / 议程 / 纪要摘要 / 论坛摘要。"""

SYSTEM_PROMPT = (
    "你是 oppflow 社区的 AI 助手，服务对象是国内的 AI 开发者、学生与独立开发者。"
    "输出使用简体中文，克制、具体、不堆砌形容词。"
)


def build_profile_messages(
    name: str, headline: str, bio: str, skills: list[str], link_facts: list[str]
) -> list[dict]:
    facts = "\n".join(f"- {f}" for f in link_facts) or "-（暂无已验证链接）"
    user = (
        f"请根据以下数字名片信息生成一段能力画像（120 字以内），"
        f"并在下一行给出 3-6 个能力标签，格式：\n画像：<内容>\n标签：<标签1、标签2、...>\n\n"
        f"昵称：{name or '未填写'}\n头衔：{headline or '未填写'}\n自我描述：{bio or '无'}\n"
        f"技能：{'、'.join(skills) or '无'}\n已验证的平台信息：\n{facts}\n"
        f"要求：画像基于事实（尤其是已验证链接），不要编造经历。"
    )
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]


def build_opp_summary_messages(
    title: str, opp_type: str, description: str, tags: list[str]
) -> list[dict]:
    type_names = {"team": "组队", "gig": "接单", "event": "活动", "job": "招聘试用"}
    user = (
        f"请为以下机会生成一段 500 字以内的中文摘要，帮助候选人快速判断是否适合参与。"
        f"结构：一句话定位 → 做什么 → 适合谁 → 需要什么 → 参与方式。不要编造原文没有的信息。\n\n"
        f"标题：{title}\n类型：{type_names.get(opp_type, opp_type)}\n标签：{'、'.join(tags) or '无'}\n详情：\n{description or '（无）'}"
    )
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]


def build_agenda_messages(
    requester_name: str,
    requester_profile: str,
    invitee_name: str,
    invitee_profile: str,
    message: str,
) -> list[dict]:
    user = (
        f"两位社区成员约定进行一次 Coffee Chat（约 30 分钟）。"
        f"请根据双方画像和发起留言，生成一份 5 条以内的交谈议程建议（每条一行，以 - 开头），"
        f"帮助双方高效认识彼此。\n\n"
        f"发起人：{requester_name}\n画像：{requester_profile or '无'}\n"
        f"受邀人：{invitee_name}\n画像：{invitee_profile or '无'}\n"
        f"发起留言：{message or '无'}"
    )
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]


def build_notes_summary_messages(notes: str) -> list[dict]:
    user = (
        "以下是一次 Coffee Chat 的会谈纪要。请生成结构化中文摘要，格式：\n"
        "要点：\n- …\n- …\n下一步：\n- …\n（300 字以内，保留具体信息，不要评价。）\n\n纪要：\n"
        f"{notes or '（空）'}"
    )
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]


def build_thread_summary_messages(title: str, posts: list[tuple[str, str]]) -> list[dict]:
    lines = [f"- {author}: {content[:500]}" for author, content in posts]
    user = (
        f"以下是论坛帖子「{title}」的讨论串。请生成 200 字以内的中文摘要，"
        f"概括主要观点与结论，中立转述。\n\n" + "\n".join(lines or ["-（暂无回复）"])
    )
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}]
