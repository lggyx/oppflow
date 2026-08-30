/** 名片快照 / 身份展示卡片（公开信息）。 */
import { BadgeCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar } from "@/components/ui";
import type { CardSnapshot } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/utils";

export default function IdentityCardView({
  card,
  compact = false,
}: {
  card: CardSnapshot;
  compact?: boolean;
}) {
  const { user, identity, links } = card;
  return (
    <div className={compact ? "" : "card p-5"}>
      <div className="flex items-start gap-3.5">
        <Avatar emoji={user.avatar_emoji} size={compact ? "md" : "lg"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{identity.name || user.display_name}</span>
            {user.github_login && (
              <span className="chip-accent" title="GitHub 已验证">
                <BadgeCheck size={12} /> GitHub 已验证
              </span>
            )}
            <span className="chip">Lv.{user.level}</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-mist">{identity.headline || "oppflow 社区成员"}</div>
          <Link to={`/u/${user.handle}`} className="mt-1 inline-block text-[11px] text-fog hover:text-accent">
            @{user.handle} · 数字名片 →
          </Link>
        </div>
      </div>

      {identity.ai_profile && !compact && (
        <div className="mt-4 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-mist">
          <span className="text-[11px] text-fog">AI 画像</span>
          <p>{identity.ai_profile}</p>
        </div>
      )}

      {identity.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {identity.skills.slice(0, 8).map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.platform + l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                l.verified ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-card-2 text-mist hover:text-white"
              }`}
            >
              {PLATFORM_LABELS[l.platform] ?? l.platform}
              {l.verified && <BadgeCheck size={12} />}
              <ExternalLink size={11} className="opacity-50" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
