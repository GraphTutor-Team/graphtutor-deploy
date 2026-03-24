/**
 * GraphTutor V3.0 - 学习相关路由配置
 * 
 * 作用：定义学习功能相关的路由
 */

import { Route } from "react-router-dom";
import { Suspense } from "react";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import SuspenseFallback from "../../components/common/SuspenseFallback.jsx";
import Quiz from "../../pages/Quiz.jsx";
import QuizSession from "../../pages/QuizSession.jsx";
import Review from "../../pages/Review.jsx";
import Exam from "../../pages/Exam.jsx";
import Result from "../../pages/Result.jsx";
import Statistics from "../../pages/Statistics.jsx";
import {
  LazyReviewPlans,
  LazyFavorites,
  LazyNotes,
  LazyPublicNotes,
  LazyNoteShare,
  LazyStudyPlans,
  LazyCheckIn,
  LazyLearningPath,
  LazySkillTree,
  LazyAnalytics,
  LazyLearningGoals,
  LazyAchievements,
  LazyRecommendations,
} from "../../utils/lazyLoad.js";

export const learningRoutes = [
  <Route
    key="statistics"
    path="/statistics"
    element={
      <ProtectedRoute>
        <Statistics />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz"
    path="/quiz"
    element={
      <ProtectedRoute>
        <Quiz />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz2"
    path="/quiz2"
    element={
      <ProtectedRoute>
        <QuizSession />
      </ProtectedRoute>
    }
  />,
  <Route
    key="review"
    path="/review"
    element={
      <ProtectedRoute>
        <Review />
      </ProtectedRoute>
    }
  />,
  <Route
    key="review-plans"
    path="/review-plans"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载复习计划..." />}>
          <LazyReviewPlans />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="favorites"
    path="/favorites"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载收藏..." />}>
          <LazyFavorites />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="notes"
    path="/notes"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载笔记..." />}>
          <LazyNotes />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="notes-public"
    path="/notes/public"
    element={
      <Suspense fallback={<SuspenseFallback text="加载公开笔记..." />}>
        <LazyPublicNotes />
      </Suspense>
    }
  />,
  <Route
    key="notes-share"
    path="/notes/share/:token"
    element={
      <Suspense fallback={<SuspenseFallback text="加载分享笔记..." />}>
        <LazyNoteShare />
      </Suspense>
    }
  />,
  <Route
    key="study-plans"
    path="/study-plans"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学习计划..." />}>
          <LazyStudyPlans />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="check-in"
    path="/check-in"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载打卡页面..." />}>
          <LazyCheckIn />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="learning-path"
    path="/learning-path"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学习路径..." />}>
          <LazyLearningPath />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="skill-tree"
    path="/skill-tree"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载技能树..." />}>
          <LazySkillTree />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="analytics"
    path="/analytics"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学习分析..." />}>
          <LazyAnalytics />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="goals"
    path="/goals"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学习目标..." />}>
          <LazyLearningGoals />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="achievements"
    path="/achievements"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学习成就..." />}>
          <LazyAchievements />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="recommendations"
    path="/recommendations"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载智能推荐..." />}>
          <LazyRecommendations />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="exam"
    path="/exam"
    element={
      <ProtectedRoute>
        <Exam />
      </ProtectedRoute>
    }
  />,
  <Route
    key="result"
    path="/result"
    element={
      <ProtectedRoute>
        <Result />
      </ProtectedRoute>
    }
  />,
];

