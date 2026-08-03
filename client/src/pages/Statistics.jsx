/**
 * GraphTutor V3.0 - 学习统计页面
 *
 * 作用：展示详细的学习统计数据，包括图表、分析等
 * 复用 Analytics 页面的功能
 */

import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import LoginPrompt from "../components/common/LoginPrompt";
import Analytics from "./Analytics";

export default function Statistics() {
  const { user } = useAuth() || {};

  if (!user) {
    return (
      <div className="page-shell space-y-4">
        <PageHeader
          title="学习统计"
          subtitle="查看详细的学习数据和分析报告。"
        />
        <LoginPrompt
          title="登录后查看学习统计"
          description="登录后可查看掌握度、趋势与报告。也可先看使用教程，或去做几道题。"
          className=""
        />
      </div>
    );
  }

  return <Analytics />;
}
