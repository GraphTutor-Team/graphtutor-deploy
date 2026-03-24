/**
 * GraphTutor V3.0 - 模型统一导出
 * 
 * 功能：统一导出所有MongoDB模型，确保模型被正确注册
 */

// 用户相关
export { default as User } from './User.js';
export { default as RoleApplication } from './RoleApplication.js';

// 题目相关
export { default as Question } from './Question.js';
export { default as QuestionBank } from './QuestionBank.js';
export { default as QuestionVersion } from './QuestionVersion.js';
export { default as Record } from './Record.js';

// 知识图谱相关
export { default as KnowledgeNode } from './KnowledgeNode.js';
export { default as GraphNode } from './GraphNode.js';
export { default as GraphLink } from './GraphLink.js';
export { default as Subject } from './Subject.js';

// 学习相关
export { default as LearningGoal } from './LearningGoal.js';
export { default as Achievement } from './Achievement.js';
export { default as WrongQuestion } from './WrongQuestion.js';
export { default as ReviewPlan } from './ReviewPlan.js';
export { default as Favorite } from './Favorite.js';
export { default as FavoriteFolder } from './FavoriteFolder.js';
export { default as Note } from './Note.js';
export { default as NoteLike } from './NoteLike.js';
export { default as StudyPlan } from './StudyPlan.js';
export { default as StudyTask } from './StudyTask.js';
export { default as StudyCheckIn } from './StudyCheckIn.js';

// 群组相关
export { default as Group } from './Group.js';

// 社交相关
export { default as Friendship } from './Friendship.js';
export { default as FriendRequest } from './FriendRequest.js';
export { default as FriendChallenge } from './FriendChallenge.js';
export { default as Message } from './Message.js';
export { default as LearningPost } from './LearningPost.js';
export { default as LearningPostComment } from './LearningPostComment.js';

// 测验相关
export { default as Quiz } from './Quiz.js';
export { default as QuizSession } from './QuizSession.js';

// 模板相关
export { default as Template } from './Template.js';

// AI相关
export { default as AIRunLog } from './AIRunLog.js';

