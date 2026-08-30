"""站内通知助手：各业务模块统一走这里创建通知。"""

from sqlalchemy.orm import Session

from app.models import Notification


def notify(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    body: str = "",
    data: dict | None = None,
) -> Notification:
    n = Notification(user_id=user_id, type=type, title=title, body=body, data=data or {})
    db.add(n)
    return n
