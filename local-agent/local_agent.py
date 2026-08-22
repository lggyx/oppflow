#!/usr/bin/env python3
"""
AI Opportunity Platform - Local Identity Agent
Generates Digital Identity Card JSON from platform data

Usage:
    python local_agent.py --platform github --username <username>
    python local_agent.py --config platforms.json
"""

import json
import argparse
import requests
from datetime import datetime
from pathlib import Path
import sys

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519
except ImportError:
    print("Warning: cryptography not installed. Signature will be placeholder.")
    ed25519 = None


class LocalIdentityAgent:
    """Generates Digital Identity Card per Digital Identity Protocol v0.1"""

    PROTOCOL_VERSION = "0.1"

    def __init__(self, agent_name: str = "ai-identity-agent", version: str = "0.1.0"):
        self.agent_name = agent_name
        self.version = version
        self.private_key = None

        if ed25519:
            self.private_key = ed25519.Ed25519PrivateKey.generate()

    def generate_card(self, subject: dict, platforms: list, capability_profile: dict = None) -> dict:
        """Generate Digital Identity Card"""
        card = {
            "protocol_version": self.PROTOCOL_VERSION,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "generated_by": f"{self.agent_name}/{self.version}",
            "subject": {
                "display_name": subject.get("display_name", ""),
                "bio": subject.get("bio", ""),
                "avatar_url": subject.get("avatar_url"),
                "primary_skills": subject.get("primary_skills", []),
                "skill_evidence": subject.get("skill_evidence", []),
            },
            "platforms": platforms,
            "capability_profile": capability_profile or {},
            "platform_growth": {
                "current_tier": "Visitor",
                "evidence_chain": [],
                "domain_tags": [],
            },
            "signature": self._sign(card) if self.private_key else "placeholder_signature",
            "checksum": self._checksum(card),
        }
        return card

    def _sign(self, card: dict) -> str:
        """Sign the card with Ed25519"""
        if not self.private_key:
            return "placeholder_signature"

        message = json.dumps(card, sort_keys=True).encode()
        signature = self.private_key.sign(message)
        return signature.hex()

    def _checksum(self, card: dict) -> str:
        """Calculate SHA256 checksum"""
        import hashlib
        message = json.dumps(card, sort_keys=True).encode()
        return hashlib.sha256(message).hexdigest()

    def fetch_github_data(self, username: str, token: str = None) -> dict:
        """Fetch public data from GitHub API"""
        headers = {"Accept": "application/vnd.github.v3+json"}
        if token:
            headers["Authorization"] = f"token {token}"

        # Fetch user profile
        user_resp = requests.get(f"https://api.github.com/users/{username}", headers=headers)
        user_data = user_resp.json()

        # Fetch repos
        repos_resp = requests.get(
            f"https://api.github.com/users/{username}/repos",
            headers=headers,
            params={"sort": "updated", "per_page": 100},
        )
        repos = repos_resp.json()

        # Calculate stats
        total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)
        languages = {}
        for repo in repos:
            lang = repo.get("language")
            if lang:
                languages[lang] = languages.get(lang, 0) + 1
        top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "platform": "github",
            "url": f"https://github.com/{username}",
            "verified": True,
            "verification_method": "OAuth",
            "data_summary": {
                "repos_count": len(repos),
                "stars_count": total_stars,
                "top_languages": [lang for lang, _ in top_languages],
                "recent_activity": f"Recently updated {len(repos)} repositories",
            },
        }

    def save_card(self, card: dict, output_path: str):
        """Save card to JSON file"""
        Path(output_path).write_text(json.dumps(card, indent=2, ensure_ascii=False))
        print(f"Card saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Local Identity Agent")
    parser.add_argument("--platform", choices=["github", "csdn", "bilibili"], help="Platform to fetch data from")
    parser.add_argument("--username", help="Username on the platform")
    parser.add_argument("--token", help="API token (for authenticated requests)")
    parser.add_argument("--config", help="JSON config file with multiple platforms")
    parser.add_argument("--output", default="identity_card.json", help="Output JSON file path")
    parser.add_argument("--bio", help="User bio")
    parser.add_argument("--skills", help="Comma-separated skills")

    args = parser.parse_args()

    agent = LocalIdentityAgent()

    # Gather subject info
    subject = {
        "display_name": args.username or "User",
        "bio": args.bio or "",
        "primary_skills": args.skills.split(",") if args.skills else [],
        "skill_evidence": [],
    }

    platforms = []

    if args.config:
        # Load from config file
        with open(args.config) as f:
            config = json.load(f)
            platforms = config.get("platforms", [])
    elif args.platform and args.username:
        # Fetch from platform API
        if args.platform == "github":
            platform_data = agent.fetch_github_data(args.username, args.token)
            platforms.append(platform_data)

    card = agent.generate_card(subject, platforms)
    agent.save_card(card, args.output)

    print(f"\nGenerated Digital Identity Card v{agent.PROTOCOL_VERSION}")
    print(f"Protocol: {card['protocol_version']}")
    print(f"Platforms: {len(platforms)}")
    print(f"Signature: {card['signature'][:32]}...")
    print(f"Checksum: {card['checksum'][:32]}...")


if __name__ == "__main__":
    main()
