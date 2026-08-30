import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-28 text-center">
      <div className="serif-it text-7xl text-accent">404</div>
      <p className="mt-4 text-sm text-mist">这个链接流走了</p>
      <Link to="/" className="btn-ghost mt-6">
        回首页
      </Link>
    </div>
  );
}
