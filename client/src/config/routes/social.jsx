/**
 * GraphTutor V3.0 - 社交相关路由配置
 * 
 * 作用：定义社交学习功能相关的路由
 */

import { Route } from "react-router-dom";
import { Suspense } from "react";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import SuspenseFallback from "../../components/common/SuspenseFallback.jsx";
import {
  LazyFriends,
  LazyFriendsDiscover,
  LazyFriendDetail,
  LazyUserProfile,
  LazyFriendChallenges,
  LazyLearningPosts,
  LazyCommunity,
  LazyDiscussionDetail,
  LazyLeaderboard,
  LazyMentor,
  LazyGroups,
  LazyMessages,
} from "../../utils/lazyLoad.js";

export const socialRoutes = [
  <Route
    key="friends"
    path="/friends"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载好友管理..." />}>
          <LazyFriends />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="friends-discover"
    path="/friends/discover"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载好友发现..." />}>
          <LazyFriendsDiscover />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="friend-detail"
    path="/friends/:id"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载好友详情..." />}>
          <LazyFriendDetail />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="user-profile"
    path="/users/:id"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载用户资料..." />}>
          <LazyUserProfile />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="friend-challenges"
    path="/friend-challenges"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载好友挑战..." />}>
          <LazyFriendChallenges />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="learning-posts"
    path="/learning-posts"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学习动态..." />}>
          <LazyLearningPosts />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="community"
    path="/community"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载学习社区..." />}>
          <LazyCommunity />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="discussion-detail"
    path="/community/:id"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载讨论详情..." />}>
          <LazyDiscussionDetail />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="leaderboard"
    path="/leaderboard"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载排行榜..." />}>
          <LazyLeaderboard />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="mentor"
    path="/mentor"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载师徒..." />}>
          <LazyMentor />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="groups"
    path="/groups"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载群组管理..." />}>
          <LazyGroups />
        </Suspense>
      </ProtectedRoute>
    }
  />,
  <Route
    key="messages"
    path="/messages"
    element={
      <ProtectedRoute>
        <Suspense fallback={<SuspenseFallback text="加载消息..." />}>
          <LazyMessages />
        </Suspense>
      </ProtectedRoute>
    }
  />,
];

