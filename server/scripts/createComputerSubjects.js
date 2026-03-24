/**
 * GraphTutor V3.0 - 创建完整的计算机学科分类体系
 * 
 * 功能：批量创建计算机科学相关的学科分类
 * 运行方式：node server/scripts/createComputerSubjects.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Subject from '../src/models/Subject.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 计算机学科分类体系
const computerSubjects = [
  // 一级学科：计算机科学
  {
    code: 'CS',
    name: '计算机科学',
    level: 1,
    parentId: null,
    description: '计算机科学是研究计算机系统、算法、数据结构、编程语言等基础理论和应用的学科',
    icon: '💻',
    color: '#3B82F6',
    order: 1,
  },
  
  // 二级学科：计算机基础
  {
    code: 'CS-BASIC',
    name: '计算机基础',
    level: 2,
    parentCode: 'CS',
    description: '计算机基础知识，包括计算机组成原理、操作系统基础等',
    icon: '🖥️',
    color: '#10B981',
    order: 1,
  },
  
  // 三级学科（计算机基础下）
  {
    code: 'CS-BASIC-COMP',
    name: '计算机组成原理',
    level: 3,
    parentCode: 'CS-BASIC',
    description: '计算机硬件组成、CPU、内存、存储等',
    icon: '⚙️',
    color: '#10B981',
    order: 1,
  },
  {
    code: 'CS-BASIC-OS',
    name: '操作系统',
    level: 3,
    parentCode: 'CS-BASIC',
    description: '操作系统原理、进程管理、内存管理、文件系统等',
    icon: '🖥️',
    color: '#10B981',
    order: 2,
  },
  {
    code: 'CS-BASIC-NET',
    name: '计算机网络',
    level: 3,
    parentCode: 'CS-BASIC',
    description: '网络协议、TCP/IP、HTTP、网络安全等',
    icon: '🌐',
    color: '#10B981',
    order: 3,
  },
  {
    code: 'CS-BASIC-ARCH',
    name: '计算机体系结构',
    level: 3,
    parentCode: 'CS-BASIC',
    description: 'CPU架构、指令集、流水线、缓存等',
    icon: '🏗️',
    color: '#10B981',
    order: 4,
  },
  
  // 二级学科：数据结构与算法
  {
    code: 'CS-DSA',
    name: '数据结构与算法',
    level: 2,
    parentCode: 'CS',
    description: '数据结构、算法设计与分析、复杂度分析等',
    icon: '📊',
    color: '#8B5CF6',
    order: 2,
  },
  
  // 三级学科（数据结构与算法下）
  {
    code: 'CS-DSA-DS',
    name: '数据结构',
    level: 3,
    parentCode: 'CS-DSA',
    description: '数组、链表、栈、队列、树、图、哈希表等',
    icon: '📚',
    color: '#8B5CF6',
    order: 1,
  },
  {
    code: 'CS-DSA-ALG',
    name: '算法',
    level: 3,
    parentCode: 'CS-DSA',
    description: '排序、搜索、动态规划、贪心、回溯、分治等',
    icon: '🔍',
    color: '#8B5CF6',
    order: 2,
  },
  {
    code: 'CS-DSA-COMPLEX',
    name: '算法复杂度分析',
    level: 3,
    parentCode: 'CS-DSA',
    description: '时间复杂度、空间复杂度、渐进分析等',
    icon: '📈',
    color: '#8B5CF6',
    order: 3,
  },
  
  // 二级学科：编程语言
  {
    code: 'CS-PL',
    name: '编程语言',
    level: 2,
    parentCode: 'CS',
    description: '各种编程语言的语法、特性、应用等',
    icon: '💬',
    color: '#F59E0B',
    order: 3,
  },
  
  // 三级学科（编程语言下）
  {
    code: 'CS-PL-C',
    name: 'C/C++',
    level: 3,
    parentCode: 'CS-PL',
    description: 'C和C++语言编程',
    icon: '⚡',
    color: '#F59E0B',
    order: 1,
  },
  {
    code: 'CS-PL-JAVA',
    name: 'Java',
    level: 3,
    parentCode: 'CS-PL',
    description: 'Java语言编程、面向对象、JVM等',
    icon: '☕',
    color: '#F59E0B',
    order: 2,
  },
  {
    code: 'CS-PL-PYTHON',
    name: 'Python',
    level: 3,
    parentCode: 'CS-PL',
    description: 'Python语言编程、数据分析、机器学习等',
    icon: '🐍',
    color: '#F59E0B',
    order: 3,
  },
  {
    code: 'CS-PL-JS',
    name: 'JavaScript',
    level: 3,
    parentCode: 'CS-PL',
    description: 'JavaScript、TypeScript、前端开发等',
    icon: '🌐',
    color: '#F59E0B',
    order: 4,
  },
  {
    code: 'CS-PL-GO',
    name: 'Go',
    level: 3,
    parentCode: 'CS-PL',
    description: 'Go语言编程、并发编程等',
    icon: '🐹',
    color: '#F59E0B',
    order: 5,
  },
  
  // 二级学科：软件工程
  {
    code: 'CS-SE',
    name: '软件工程',
    level: 2,
    parentCode: 'CS',
    description: '软件开发方法、项目管理、软件测试等',
    icon: '🔧',
    color: '#EF4444',
    order: 4,
  },
  
  // 三级学科（软件工程下）
  {
    code: 'CS-SE-DESIGN',
    name: '软件设计',
    level: 3,
    parentCode: 'CS-SE',
    description: '设计模式、架构设计、UML等',
    icon: '🎨',
    color: '#EF4444',
    order: 1,
  },
  {
    code: 'CS-SE-TEST',
    name: '软件测试',
    level: 3,
    parentCode: 'CS-SE',
    description: '单元测试、集成测试、自动化测试等',
    icon: '🧪',
    color: '#EF4444',
    order: 2,
  },
  {
    code: 'CS-SE-DEVOPS',
    name: 'DevOps',
    level: 3,
    parentCode: 'CS-SE',
    description: 'CI/CD、容器化、云原生等',
    icon: '🚀',
    color: '#EF4444',
    order: 3,
  },
  
  // 二级学科：数据库
  {
    code: 'CS-DB',
    name: '数据库',
    level: 2,
    parentCode: 'CS',
    description: '数据库原理、SQL、NoSQL、数据库设计等',
    icon: '🗄️',
    color: '#06B6D4',
    order: 5,
  },
  
  // 三级学科（数据库下）
  {
    code: 'CS-DB-SQL',
    name: '关系型数据库',
    level: 3,
    parentCode: 'CS-DB',
    description: 'MySQL、PostgreSQL、SQL Server等',
    icon: '📊',
    color: '#06B6D4',
    order: 1,
  },
  {
    code: 'CS-DB-NOSQL',
    name: 'NoSQL数据库',
    level: 3,
    parentCode: 'CS-DB',
    description: 'MongoDB、Redis、Elasticsearch等',
    icon: '📦',
    color: '#06B6D4',
    order: 2,
  },
  {
    code: 'CS-DB-DESIGN',
    name: '数据库设计',
    level: 3,
    parentCode: 'CS-DB',
    description: 'ER模型、范式、索引优化等',
    icon: '🎯',
    color: '#06B6D4',
    order: 3,
  },
  
  // 二级学科：人工智能
  {
    code: 'CS-AI',
    name: '人工智能',
    level: 2,
    parentCode: 'CS',
    description: '机器学习、深度学习、自然语言处理等',
    icon: '🤖',
    color: '#EC4899',
    order: 6,
  },
  
  // 三级学科（人工智能下）
  {
    code: 'CS-AI-ML',
    name: '机器学习',
    level: 3,
    parentCode: 'CS-AI',
    description: '监督学习、无监督学习、强化学习等',
    icon: '🧠',
    color: '#EC4899',
    order: 1,
  },
  {
    code: 'CS-AI-DL',
    name: '深度学习',
    level: 3,
    parentCode: 'CS-AI',
    description: '神经网络、CNN、RNN、Transformer等',
    icon: '🔮',
    color: '#EC4899',
    order: 2,
  },
  {
    code: 'CS-AI-NLP',
    name: '自然语言处理',
    level: 3,
    parentCode: 'CS-AI',
    description: '文本处理、词向量、语言模型等',
    icon: '💬',
    color: '#EC4899',
    order: 3,
  },
  {
    code: 'CS-AI-CV',
    name: '计算机视觉',
    level: 3,
    parentCode: 'CS-AI',
    description: '图像处理、目标检测、图像识别等',
    icon: '👁️',
    color: '#EC4899',
    order: 4,
  },
  
  // 二级学科：Web开发
  {
    code: 'CS-WEB',
    name: 'Web开发',
    level: 2,
    parentCode: 'CS',
    description: '前端开发、后端开发、全栈开发等',
    icon: '🌐',
    color: '#14B8A6',
    order: 7,
  },
  
  // 三级学科（Web开发下）
  {
    code: 'CS-WEB-FRONT',
    name: '前端开发',
    level: 3,
    parentCode: 'CS-WEB',
    description: 'HTML、CSS、JavaScript、React、Vue等',
    icon: '🎨',
    color: '#14B8A6',
    order: 1,
  },
  {
    code: 'CS-WEB-BACK',
    name: '后端开发',
    level: 3,
    parentCode: 'CS-WEB',
    description: 'Node.js、Spring、Django、Express等',
    icon: '⚙️',
    color: '#14B8A6',
    order: 2,
  },
  {
    code: 'CS-WEB-FULL',
    name: '全栈开发',
    level: 3,
    parentCode: 'CS-WEB',
    description: '前后端一体化开发',
    icon: '🚀',
    color: '#14B8A6',
    order: 3,
  },
  
  // 二级学科：移动开发
  {
    code: 'CS-MOBILE',
    name: '移动开发',
    level: 2,
    parentCode: 'CS',
    description: 'Android、iOS、跨平台开发等',
    icon: '📱',
    color: '#6366F1',
    order: 8,
  },
  
  // 三级学科（移动开发下）
  {
    code: 'CS-MOBILE-ANDROID',
    name: 'Android开发',
    level: 3,
    parentCode: 'CS-MOBILE',
    description: 'Android应用开发、Kotlin、Java等',
    icon: '🤖',
    color: '#6366F1',
    order: 1,
  },
  {
    code: 'CS-MOBILE-IOS',
    name: 'iOS开发',
    level: 3,
    parentCode: 'CS-MOBILE',
    description: 'iOS应用开发、Swift、Objective-C等',
    icon: '🍎',
    color: '#6366F1',
    order: 2,
  },
  {
    code: 'CS-MOBILE-CROSS',
    name: '跨平台开发',
    level: 3,
    parentCode: 'CS-MOBILE',
    description: 'React Native、Flutter、Xamarin等',
    icon: '🔄',
    color: '#6366F1',
    order: 3,
  },
  
  // 二级学科：信息安全
  {
    code: 'CS-SEC',
    name: '信息安全',
    level: 2,
    parentCode: 'CS',
    description: '网络安全、密码学、安全协议等',
    icon: '🔒',
    color: '#DC2626',
    order: 9,
  },
  
  // 三级学科（信息安全下）
  {
    code: 'CS-SEC-CRYPTO',
    name: '密码学',
    level: 3,
    parentCode: 'CS-SEC',
    description: '对称加密、非对称加密、哈希函数等',
    icon: '🔐',
    color: '#DC2626',
    order: 1,
  },
  {
    code: 'CS-SEC-NET',
    name: '网络安全',
    level: 3,
    parentCode: 'CS-SEC',
    description: '防火墙、入侵检测、漏洞分析等',
    icon: '🛡️',
    color: '#DC2626',
    order: 2,
  },
  {
    code: 'CS-SEC-PEN',
    name: '渗透测试',
    level: 3,
    parentCode: 'CS-SEC',
    description: '安全测试、漏洞挖掘、安全审计等',
    icon: '🎯',
    color: '#DC2626',
    order: 3,
  },
  
  // 二级学科：分布式系统
  {
    code: 'CS-DIST',
    name: '分布式系统',
    level: 2,
    parentCode: 'CS',
    description: '分布式计算、微服务、分布式存储等',
    icon: '🌍',
    color: '#7C3AED',
    order: 10,
  },
  
  // 三级学科（分布式系统下）
  {
    code: 'CS-DIST-MICRO',
    name: '微服务',
    level: 3,
    parentCode: 'CS-DIST',
    description: '微服务架构、服务治理、API网关等',
    icon: '🔗',
    color: '#7C3AED',
    order: 1,
  },
  {
    code: 'CS-DIST-CLOUD',
    name: '云计算',
    level: 3,
    parentCode: 'CS-DIST',
    description: 'AWS、Azure、GCP、容器编排等',
    icon: '☁️',
    color: '#7C3AED',
    order: 2,
  },
  {
    code: 'CS-DIST-BIGDATA',
    name: '大数据',
    level: 3,
    parentCode: 'CS-DIST',
    description: 'Hadoop、Spark、Flink、数据仓库等',
    icon: '📊',
    color: '#7C3AED',
    order: 3,
  },
];

// 连接数据库并创建学科
async function createSubjects() {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/graphtutor';
    console.log('正在连接数据库...');
    await mongoose.connect(mongoUri);
    console.log('数据库连接成功！\n');

    // 创建学科映射（用于查找父学科）
    const subjectMap = new Map();
    const createdSubjects = [];

    // 按层级顺序创建学科
    for (const subjectData of computerSubjects) {
      let parentId = null;
      
      // 如果有父学科代码，查找父学科ID
      if (subjectData.parentCode) {
        const parent = subjectMap.get(subjectData.parentCode);
        if (!parent) {
          console.error(`错误：找不到父学科 ${subjectData.parentCode}`);
          continue;
        }
        parentId = parent._id;
      }

      // 检查学科是否已存在
      const existing = await Subject.findOne({ code: subjectData.code });
      if (existing) {
        console.log(`⚠️  学科 ${subjectData.code} (${subjectData.name}) 已存在，跳过`);
        subjectMap.set(subjectData.code, existing);
        continue;
      }

      // 创建学科
      const { parentCode, ...subjectFields } = subjectData;
      const subject = await Subject.create({
        ...subjectFields,
        parentId,
      });

      subjectMap.set(subjectData.code, subject);
      createdSubjects.push(subject);
      console.log(`✅ 创建学科: ${subjectData.code} - ${subjectData.name} (层级 ${subjectData.level})`);
    }

    console.log(`\n完成！共创建 ${createdSubjects.length} 个学科。`);
    
    // 显示学科树结构
    console.log('\n学科树结构：');
    const rootSubjects = await Subject.find({ parentId: null, enabled: true }).sort({ order: 1 });
    for (const root of rootSubjects) {
      await printSubjectTree(root, 0);
    }

  } catch (error) {
    console.error('创建学科时出错:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭。');
  }
}

// 递归打印学科树
async function printSubjectTree(subject, indent) {
  const prefix = '  '.repeat(indent);
  const icon = subject.icon || '📚';
  console.log(`${prefix}${icon} ${subject.code} - ${subject.name}`);
  
  const children = await Subject.find({ parentId: subject._id, enabled: true }).sort({ order: 1 });
  for (const child of children) {
    await printSubjectTree(child, indent + 1);
  }
}

// 运行脚本
createSubjects();

