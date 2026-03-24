/**
 * GraphTutor V3.0 - 学习统计页面
 * 
 * 作用：展示详细的学习统计数据，包括图表、分析等
 * 复用 Analytics 页面的功能
 */

import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import Analytics from "./Analytics";

export default function Statistics() {
  const { user } = useAuth() || {};

  if (!user) {
    return (
      <div className="space-y-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto px-4 py-3">
        <PageHeader
          title="学习统计"
          subtitle="查看详细的学习数据和分析报告。"
        />
        <section className="card">
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              请先登录以查看学习统计
            </p>
            <Link
              to="/login"
              className="inline-block btn btn-primary"
            >
              去登录
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // 直接使用 Analytics 组件，它已经包含了所有统计功能
  return <Analytics />;
}
