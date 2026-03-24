/**
 * GraphTutor V3.0 - 初始化完整的学科分类体系
 * 
 * 功能：批量创建完整的学科分类（三级分类体系）
 * 包含：计算机科学、数学、物理、化学、生物、工程、经济学等多个学科领域
 * 运行方式：npm run seed:subjects 或 node server/scripts/init-computer-subjects.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Subject from '../src/models/Subject.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

// 完整的学科数据（三级分类）
const allSubjects = [
  // ========== 一级学科：计算机科学 ==========
  {
    code: 'CS',
    name: '计算机科学',
    level: 1,
    description: '计算机科学基础学科，涵盖计算机系统、算法、数据结构、软件工程等核心内容',
    color: '#3B82F6',
    icon: '💻',
    order: 1,
  },
  
  // ========== 二级学科：数据结构与算法 ==========
  {
    code: 'CS-DS',
    name: '数据结构',
    level: 2,
    parentCode: 'CS',
    description: '数据结构与算法基础，包括线性结构、树形结构、图等',
    color: '#10B981',
    icon: '📊',
    order: 1,
  },
  {
    code: 'CS-ALG',
    name: '算法',
    level: 2,
    parentCode: 'CS',
    description: '算法设计与分析，包括排序、搜索、动态规划、贪心算法等',
    color: '#F59E0B',
    icon: '⚙️',
    order: 2,
  },
  
  // ========== 二级学科：系统与底层 ==========
  {
    code: 'CS-OS',
    name: '操作系统',
    level: 2,
    parentCode: 'CS',
    description: '操作系统原理，包括进程管理、内存管理、文件系统、设备管理等',
    color: '#EF4444',
    icon: '🖥️',
    order: 3,
  },
  {
    code: 'CS-ARCH',
    name: '计算机组成原理',
    level: 2,
    parentCode: 'CS',
    description: '计算机系统结构，包括CPU、存储器、I/O系统、指令系统等',
    color: '#F97316',
    icon: '🔌',
    order: 4,
  },
  {
    code: 'CS-COMP',
    name: '编译原理',
    level: 2,
    parentCode: 'CS',
    description: '编译器设计与实现，包括词法分析、语法分析、语义分析、代码生成等',
    color: '#84CC16',
    icon: '🔨',
    order: 5,
  },
  
  // ========== 二级学科：网络与通信 ==========
  {
    code: 'CS-NET',
    name: '计算机网络',
    level: 2,
    parentCode: 'CS',
    description: '计算机网络原理，包括TCP/IP、HTTP、网络安全、网络协议等',
    color: '#8B5CF6',
    icon: '🌐',
    order: 6,
  },
  {
    code: 'CS-DIST',
    name: '分布式系统',
    level: 2,
    parentCode: 'CS',
    description: '分布式系统原理，包括分布式计算、一致性、容错、微服务等',
    color: '#EC4899',
    icon: '🔄',
    order: 7,
  },
  
  // ========== 二级学科：数据与存储 ==========
  {
    code: 'CS-DB',
    name: '数据库',
    level: 2,
    parentCode: 'CS',
    description: '数据库系统原理，包括SQL、关系模型、事务处理、索引优化等',
    color: '#06B6D4',
    icon: '🗄️',
    order: 8,
  },
  {
    code: 'CS-BIGDATA',
    name: '大数据',
    level: 2,
    parentCode: 'CS',
    description: '大数据处理与分析，包括Hadoop、Spark、数据挖掘、数据仓库等',
    color: '#14B8A6',
    icon: '📈',
    order: 9,
  },
  
  // ========== 二级学科：软件工程 ==========
  {
    code: 'CS-SE',
    name: '软件工程',
    level: 2,
    parentCode: 'CS',
    description: '软件工程方法与实践，包括需求分析、设计模式、项目管理、测试等',
    color: '#EC4899',
    icon: '🔧',
    order: 10,
  },
  {
    code: 'CS-DESIGN',
    name: '设计模式',
    level: 2,
    parentCode: 'CS',
    description: '软件设计模式，包括创建型、结构型、行为型设计模式',
    color: '#A855F7',
    icon: '🎨',
    order: 11,
  },
  
  // ========== 二级学科：编程语言 ==========
  {
    code: 'CS-PL',
    name: '编程语言',
    level: 2,
    parentCode: 'CS',
    description: '编程语言原理与实践，包括语法、语义、类型系统、运行时等',
    color: '#0EA5E9',
    icon: '💾',
    order: 12,
  },
  {
    code: 'CS-JAVA',
    name: 'Java',
    level: 2,
    parentCode: 'CS',
    description: 'Java编程语言，包括面向对象、集合框架、多线程、JVM等',
    color: '#F59E0B',
    icon: '☕',
    order: 13,
  },
  {
    code: 'CS-PYTHON',
    name: 'Python',
    level: 2,
    parentCode: 'CS',
    description: 'Python编程语言，包括语法基础、标准库、面向对象、数据分析等',
    color: '#3B82F6',
    icon: '🐍',
    order: 14,
  },
  {
    code: 'CS-CPP',
    name: 'C/C++',
    level: 2,
    parentCode: 'CS',
    description: 'C/C++编程语言，包括指针、内存管理、面向对象、STL等',
    color: '#6366F1',
    icon: '⚡',
    order: 15,
  },
  {
    code: 'CS-JS',
    name: 'JavaScript',
    level: 2,
    parentCode: 'CS',
    description: 'JavaScript编程语言，包括ES6+、异步编程、DOM操作、Node.js等',
    color: '#FCD34D',
    icon: '📜',
    order: 16,
  },
  
  // ========== 二级学科：Web开发 ==========
  {
    code: 'CS-WEB',
    name: 'Web开发',
    level: 2,
    parentCode: 'CS',
    description: 'Web前端与后端开发，包括HTML/CSS、JavaScript、框架、API设计等',
    color: '#10B981',
    icon: '🌍',
    order: 17,
  },
  {
    code: 'CS-FRONTEND',
    name: '前端开发',
    level: 2,
    parentCode: 'CS',
    description: '前端开发技术，包括React、Vue、Angular、移动端开发等',
    color: '#06B6D4',
    icon: '🎯',
    order: 18,
  },
  {
    code: 'CS-BACKEND',
    name: '后端开发',
    level: 2,
    parentCode: 'CS',
    description: '后端开发技术，包括RESTful API、微服务、服务器部署、性能优化等',
    color: '#8B5CF6',
    icon: '⚙️',
    order: 19,
  },
  
  // ========== 二级学科：人工智能与机器学习 ==========
  {
    code: 'CS-AI',
    name: '人工智能',
    level: 2,
    parentCode: 'CS',
    description: '人工智能基础，包括搜索算法、知识表示、推理、专家系统等',
    color: '#EC4899',
    icon: '🤖',
    order: 20,
  },
  {
    code: 'CS-ML',
    name: '机器学习',
    level: 2,
    parentCode: 'CS',
    description: '机器学习算法与应用，包括监督学习、无监督学习、深度学习等',
    color: '#F59E0B',
    icon: '🧠',
    order: 21,
  },
  {
    code: 'CS-DL',
    name: '深度学习',
    level: 2,
    parentCode: 'CS',
    description: '深度学习理论与应用，包括神经网络、CNN、RNN、Transformer等',
    color: '#8B5CF6',
    icon: '🔮',
    order: 22,
  },
  {
    code: 'CS-CV',
    name: '计算机视觉',
    level: 2,
    parentCode: 'CS',
    description: '计算机视觉技术，包括图像处理、目标检测、图像识别等',
    color: '#10B981',
    icon: '👁️',
    order: 23,
  },
  {
    code: 'CS-NLP',
    name: '自然语言处理',
    level: 2,
    parentCode: 'CS',
    description: '自然语言处理技术，包括文本分析、词向量、语言模型、机器翻译等',
    color: '#06B6D4',
    icon: '💬',
    order: 24,
  },
  
  // ========== 二级学科：安全与密码学 ==========
  {
    code: 'CS-SEC',
    name: '网络安全',
    level: 2,
    parentCode: 'CS',
    description: '网络安全技术，包括加密、认证、防火墙、入侵检测、安全协议等',
    color: '#EF4444',
    icon: '🔒',
    order: 25,
  },
  {
    code: 'CS-CRYPTO',
    name: '密码学',
    level: 2,
    parentCode: 'CS',
    description: '密码学原理与应用，包括对称加密、非对称加密、哈希函数、数字签名等',
    color: '#F97316',
    icon: '🔐',
    order: 26,
  },
  
  // ========== 二级学科：其他 ==========
  {
    code: 'CS-MATH',
    name: '计算机数学',
    level: 2,
    parentCode: 'CS',
    description: '计算机科学中的数学基础，包括离散数学、线性代数、概率论、图论等',
    color: '#6366F1',
    icon: '📐',
    order: 27,
  },
  {
    code: 'CS-GRAPHICS',
    name: '计算机图形学',
    level: 2,
    parentCode: 'CS',
    description: '计算机图形学原理，包括渲染、光照、纹理、3D建模等',
    color: '#A855F7',
    icon: '🎨',
    order: 28,
  },
  {
    code: 'CS-GAME',
    name: '游戏开发',
    level: 2,
    parentCode: 'CS',
    description: '游戏开发技术，包括游戏引擎、物理引擎、游戏AI、游戏设计等',
    color: '#EC4899',
    icon: '🎮',
    order: 29,
  },
  {
    code: 'CS-MOBILE',
    name: '移动开发',
    level: 2,
    parentCode: 'CS',
    description: '移动应用开发，包括Android、iOS、跨平台开发、移动UI/UX等',
    color: '#0EA5E9',
    icon: '📱',
    order: 30,
  },
  
  // ========== 三级学科：数据结构子分类 ==========
  {
    code: 'CS-DS-ARRAY',
    name: '数组与链表',
    level: 3,
    parentCode: 'CS-DS',
    description: '数组、链表、栈、队列等线性数据结构',
    color: '#10B981',
    icon: '📋',
    order: 1,
  },
  {
    code: 'CS-DS-TREE',
    name: '树形结构',
    level: 3,
    parentCode: 'CS-DS',
    description: '二叉树、BST、AVL树、红黑树、B树等树形数据结构',
    color: '#10B981',
    icon: '🌳',
    order: 2,
  },
  {
    code: 'CS-DS-GRAPH',
    name: '图',
    level: 3,
    parentCode: 'CS-DS',
    description: '图的表示、遍历、最短路径、最小生成树等',
    color: '#10B981',
    icon: '🕸️',
    order: 3,
  },
  {
    code: 'CS-DS-HASH',
    name: '哈希表',
    level: 3,
    parentCode: 'CS-DS',
    description: '哈希表、哈希函数、冲突处理、散列算法等',
    color: '#10B981',
    icon: '🗂️',
    order: 4,
  },
  {
    code: 'CS-DS-HEAP',
    name: '堆',
    level: 3,
    parentCode: 'CS-DS',
    description: '堆数据结构、优先队列、堆排序等',
    color: '#10B981',
    icon: '📚',
    order: 5,
  },
  
  // ========== 三级学科：算法子分类 ==========
  {
    code: 'CS-ALG-SORT',
    name: '排序算法',
    level: 3,
    parentCode: 'CS-ALG',
    description: '各种排序算法，包括冒泡、快速、归并、堆排序等',
    color: '#F59E0B',
    icon: '🔄',
    order: 1,
  },
  {
    code: 'CS-ALG-SEARCH',
    name: '搜索算法',
    level: 3,
    parentCode: 'CS-ALG',
    description: '搜索算法，包括二分查找、深度优先、广度优先等',
    color: '#F59E0B',
    icon: '🔍',
    order: 2,
  },
  {
    code: 'CS-ALG-DP',
    name: '动态规划',
    level: 3,
    parentCode: 'CS-ALG',
    description: '动态规划算法，包括背包问题、最长公共子序列等',
    color: '#F59E0B',
    icon: '📊',
    order: 3,
  },
  {
    code: 'CS-ALG-GREEDY',
    name: '贪心算法',
    level: 3,
    parentCode: 'CS-ALG',
    description: '贪心算法设计与应用',
    color: '#F59E0B',
    icon: '💰',
    order: 4,
  },
  {
    code: 'CS-ALG-BACKTRACK',
    name: '回溯算法',
    level: 3,
    parentCode: 'CS-ALG',
    description: '回溯算法，包括N皇后、数独、组合问题等',
    color: '#F59E0B',
    icon: '🔙',
    order: 5,
  },
  
  // ========== 三级学科：操作系统子分类 ==========
  {
    code: 'CS-OS-PROCESS',
    name: '进程管理',
    level: 3,
    parentCode: 'CS-OS',
    description: '进程、线程、调度、同步、死锁等',
    color: '#EF4444',
    icon: '⚙️',
    order: 1,
  },
  {
    code: 'CS-OS-MEMORY',
    name: '内存管理',
    level: 3,
    parentCode: 'CS-OS',
    description: '内存分配、虚拟内存、页面置换、内存保护等',
    color: '#EF4444',
    icon: '💾',
    order: 2,
  },
  {
    code: 'CS-OS-FILE',
    name: '文件系统',
    level: 3,
    parentCode: 'CS-OS',
    description: '文件系统设计、目录结构、文件操作、磁盘调度等',
    color: '#EF4444',
    icon: '📁',
    order: 3,
  },
  
  // ========== 三级学科：数据库子分类 ==========
  {
    code: 'CS-DB-SQL',
    name: 'SQL',
    level: 3,
    parentCode: 'CS-DB',
    description: 'SQL语言，包括查询、更新、事务、存储过程等',
    color: '#06B6D4',
    icon: '📝',
    order: 1,
  },
  {
    code: 'CS-DB-DESIGN',
    name: '数据库设计',
    level: 3,
    parentCode: 'CS-DB',
    description: 'ER模型、关系模型、范式、数据库设计等',
    color: '#06B6D4',
    icon: '📐',
    order: 2,
  },
  {
    code: 'CS-DB-TRANS',
    name: '事务处理',
    level: 3,
    parentCode: 'CS-DB',
    description: 'ACID特性、并发控制、锁机制、隔离级别等',
    color: '#06B6D4',
    icon: '🔄',
    order: 3,
  },
  {
    code: 'CS-DB-INDEX',
    name: '索引优化',
    level: 3,
    parentCode: 'CS-DB',
    description: 'B+树索引、哈希索引、索引优化、查询优化等',
    color: '#06B6D4',
    icon: '🔍',
    order: 4,
  },
  
  // ========== 三级学科：计算机网络子分类 ==========
  {
    code: 'CS-NET-TCPIP',
    name: 'TCP/IP',
    level: 3,
    parentCode: 'CS-NET',
    description: 'TCP/IP协议栈、IP地址、子网划分、路由等',
    color: '#8B5CF6',
    icon: '🌐',
    order: 1,
  },
  {
    code: 'CS-NET-HTTP',
    name: 'HTTP/HTTPS',
    level: 3,
    parentCode: 'CS-NET',
    description: 'HTTP协议、HTTPS、RESTful API、WebSocket等',
    color: '#8B5CF6',
    icon: '🔗',
    order: 2,
  },
  {
    code: 'CS-NET-SEC',
    name: '网络安全',
    level: 3,
    parentCode: 'CS-NET',
    description: '网络安全协议、防火墙、VPN、DDoS防护等',
    color: '#8B5CF6',
    icon: '🛡️',
    order: 3,
  },
  
  // ========== 三级学科：机器学习子分类 ==========
  {
    code: 'CS-ML-SUPERVISED',
    name: '监督学习',
    level: 3,
    parentCode: 'CS-ML',
    description: '分类、回归、决策树、SVM、随机森林等',
    color: '#F59E0B',
    icon: '📊',
    order: 1,
  },
  {
    code: 'CS-ML-UNSUPERVISED',
    name: '无监督学习',
    level: 3,
    parentCode: 'CS-ML',
    description: '聚类、降维、关联规则、异常检测等',
    color: '#F59E0B',
    icon: '🔍',
    order: 2,
  },
  {
    code: 'CS-ML-REINFORCE',
    name: '强化学习',
    level: 3,
    parentCode: 'CS-ML',
    description: 'Q-learning、策略梯度、深度强化学习等',
    color: '#F59E0B',
    icon: '🎯',
    order: 3,
  },

  // ========== 一级学科：数学 ==========
  {
    code: 'MATH',
    name: '数学',
    level: 1,
    description: '数学基础学科，涵盖代数、几何、分析、概率统计等核心内容',
    color: '#6366F1',
    icon: '🔢',
    order: 2,
  },
  
  // ========== 二级学科：数学基础 ==========
  {
    code: 'MATH-ALGEBRA',
    name: '代数',
    level: 2,
    parentCode: 'MATH',
    description: '代数基础，包括线性代数、抽象代数、群论、环论等',
    color: '#6366F1',
    icon: '📐',
    order: 1,
  },
  {
    code: 'MATH-GEOMETRY',
    name: '几何',
    level: 2,
    parentCode: 'MATH',
    description: '几何学，包括欧几里得几何、解析几何、微分几何、拓扑学等',
    color: '#8B5CF6',
    icon: '📏',
    order: 2,
  },
  {
    code: 'MATH-ANALYSIS',
    name: '数学分析',
    level: 2,
    parentCode: 'MATH',
    description: '数学分析，包括微积分、实分析、复分析、泛函分析等',
    color: '#EC4899',
    icon: '📊',
    order: 3,
  },
  {
    code: 'MATH-PROB',
    name: '概率论与数理统计',
    level: 2,
    parentCode: 'MATH',
    description: '概率论、数理统计、随机过程、统计推断等',
    color: '#10B981',
    icon: '🎲',
    order: 4,
  },
  {
    code: 'MATH-DISCRETE',
    name: '离散数学',
    level: 2,
    parentCode: 'MATH',
    description: '离散数学，包括集合论、图论、组合数学、逻辑学等',
    color: '#F59E0B',
    icon: '🔗',
    order: 5,
  },
  {
    code: 'MATH-NUM',
    name: '数值分析',
    level: 2,
    parentCode: 'MATH',
    description: '数值计算方法，包括数值积分、数值微分、线性方程组求解等',
    color: '#06B6D4',
    icon: '🔢',
    order: 6,
  },
  
  // ========== 三级学科：代数子分类 ==========
  {
    code: 'MATH-ALGEBRA-LINEAR',
    name: '线性代数',
    level: 3,
    parentCode: 'MATH-ALGEBRA',
    description: '向量空间、矩阵、线性变换、特征值等',
    color: '#6366F1',
    icon: '📐',
    order: 1,
  },
  {
    code: 'MATH-ALGEBRA-ABSTRACT',
    name: '抽象代数',
    level: 3,
    parentCode: 'MATH-ALGEBRA',
    description: '群、环、域、模等抽象代数结构',
    color: '#6366F1',
    icon: '🔬',
    order: 2,
  },
  
  // ========== 三级学科：几何子分类 ==========
  {
    code: 'MATH-GEOMETRY-EUCLID',
    name: '欧几里得几何',
    level: 3,
    parentCode: 'MATH-GEOMETRY',
    description: '平面几何、立体几何、解析几何等',
    color: '#8B5CF6',
    icon: '📏',
    order: 1,
  },
  {
    code: 'MATH-GEOMETRY-DIFF',
    name: '微分几何',
    level: 3,
    parentCode: 'MATH-GEOMETRY',
    description: '曲线、曲面、流形、黎曼几何等',
    color: '#8B5CF6',
    icon: '🌐',
    order: 2,
  },
  
  // ========== 三级学科：分析子分类 ==========
  {
    code: 'MATH-ANALYSIS-CALC',
    name: '微积分',
    level: 3,
    parentCode: 'MATH-ANALYSIS',
    description: '极限、导数、积分、微分方程等',
    color: '#EC4899',
    icon: '📈',
    order: 1,
  },
  {
    code: 'MATH-ANALYSIS-REAL',
    name: '实分析',
    level: 3,
    parentCode: 'MATH-ANALYSIS',
    description: '实数理论、测度论、勒贝格积分等',
    color: '#EC4899',
    icon: '📊',
    order: 2,
  },
  
  // ========== 一级学科：物理学 ==========
  {
    code: 'PHYS',
    name: '物理学',
    level: 1,
    description: '物理学基础学科，涵盖力学、热学、电磁学、光学、量子物理等',
    color: '#EF4444',
    icon: '⚛️',
    order: 3,
  },
  
  // ========== 二级学科：物理学分支 ==========
  {
    code: 'PHYS-MECH',
    name: '力学',
    level: 2,
    parentCode: 'PHYS',
    description: '经典力学、理论力学、分析力学、相对论等',
    color: '#EF4444',
    icon: '⚙️',
    order: 1,
  },
  {
    code: 'PHYS-THERMO',
    name: '热力学',
    level: 2,
    parentCode: 'PHYS',
    description: '热力学、统计物理、相变、热传导等',
    color: '#F97316',
    icon: '🌡️',
    order: 2,
  },
  {
    code: 'PHYS-ELEC',
    name: '电磁学',
    level: 2,
    parentCode: 'PHYS',
    description: '电学、磁学、电磁场理论、电磁波等',
    color: '#3B82F6',
    icon: '⚡',
    order: 3,
  },
  {
    code: 'PHYS-OPTICS',
    name: '光学',
    level: 2,
    parentCode: 'PHYS',
    description: '几何光学、物理光学、激光物理、量子光学等',
    color: '#FCD34D',
    icon: '💡',
    order: 4,
  },
  {
    code: 'PHYS-QUANTUM',
    name: '量子物理',
    level: 2,
    parentCode: 'PHYS',
    description: '量子力学、量子场论、量子信息、量子计算等',
    color: '#8B5CF6',
    icon: '🔮',
    order: 5,
  },
  {
    code: 'PHYS-MODERN',
    name: '现代物理',
    level: 2,
    parentCode: 'PHYS',
    description: '相对论、粒子物理、凝聚态物理、天体物理等',
    color: '#EC4899',
    icon: '🌌',
    order: 6,
  },
  
  // ========== 一级学科：化学 ==========
  {
    code: 'CHEM',
    name: '化学',
    level: 1,
    description: '化学基础学科，涵盖无机化学、有机化学、物理化学、分析化学等',
    color: '#10B981',
    icon: '🧪',
    order: 4,
  },
  
  // ========== 二级学科：化学分支 ==========
  {
    code: 'CHEM-INORG',
    name: '无机化学',
    level: 2,
    parentCode: 'CHEM',
    description: '无机化合物、配位化学、元素化学等',
    color: '#10B981',
    icon: '⚗️',
    order: 1,
  },
  {
    code: 'CHEM-ORG',
    name: '有机化学',
    level: 2,
    parentCode: 'CHEM',
    description: '有机化合物、反应机理、有机合成等',
    color: '#14B8A6',
    icon: '🔬',
    order: 2,
  },
  {
    code: 'CHEM-PHYS',
    name: '物理化学',
    level: 2,
    parentCode: 'CHEM',
    description: '化学热力学、化学动力学、电化学、表面化学等',
    color: '#06B6D4',
    icon: '⚛️',
    order: 3,
  },
  {
    code: 'CHEM-ANAL',
    name: '分析化学',
    level: 2,
    parentCode: 'CHEM',
    description: '化学分析、仪器分析、色谱、光谱等',
    color: '#0EA5E9',
    icon: '🔍',
    order: 4,
  },
  {
    code: 'CHEM-BIO',
    name: '生物化学',
    level: 2,
    parentCode: 'CHEM',
    description: '生物分子、代谢、酶学、分子生物学等',
    color: '#84CC16',
    icon: '🧬',
    order: 5,
  },
  
  // ========== 一级学科：生物学 ==========
  {
    code: 'BIO',
    name: '生物学',
    level: 1,
    description: '生物学基础学科，涵盖细胞生物学、分子生物学、遗传学、生态学等',
    color: '#84CC16',
    icon: '🌱',
    order: 5,
  },
  
  // ========== 二级学科：生物学分支 ==========
  {
    code: 'BIO-CELL',
    name: '细胞生物学',
    level: 2,
    parentCode: 'BIO',
    description: '细胞结构、细胞分裂、细胞代谢、细胞信号转导等',
    color: '#84CC16',
    icon: '🔬',
    order: 1,
  },
  {
    code: 'BIO-MOL',
    name: '分子生物学',
    level: 2,
    parentCode: 'BIO',
    description: 'DNA、RNA、蛋白质、基因表达、基因调控等',
    color: '#10B981',
    icon: '🧬',
    order: 2,
  },
  {
    code: 'BIO-GEN',
    name: '遗传学',
    level: 2,
    parentCode: 'BIO',
    description: '经典遗传学、分子遗传学、群体遗传学、表观遗传学等',
    color: '#14B8A6',
    icon: '🧪',
    order: 3,
  },
  {
    code: 'BIO-ECO',
    name: '生态学',
    level: 2,
    parentCode: 'BIO',
    description: '生态系统、种群生态、群落生态、生物多样性等',
    color: '#06B6D4',
    icon: '🌍',
    order: 4,
  },
  {
    code: 'BIO-EVOL',
    name: '进化生物学',
    level: 2,
    parentCode: 'BIO',
    description: '进化理论、自然选择、物种形成、系统发育等',
    color: '#0EA5E9',
    icon: '🦋',
    order: 5,
  },
  {
    code: 'BIO-PHYSIO',
    name: '生理学',
    level: 2,
    parentCode: 'BIO',
    description: '人体生理、动物生理、植物生理、神经生理等',
    color: '#F59E0B',
    icon: '❤️',
    order: 6,
  },
  
  // ========== 一级学科：工程学 ==========
  {
    code: 'ENG',
    name: '工程学',
    level: 1,
    description: '工程学基础学科，涵盖机械工程、电子工程、土木工程、化学工程等',
    color: '#F97316',
    icon: '🔧',
    order: 6,
  },
  
  // ========== 二级学科：工程学分支 ==========
  {
    code: 'ENG-MECH',
    name: '机械工程',
    level: 2,
    parentCode: 'ENG',
    description: '机械设计、制造工艺、材料力学、机械动力学等',
    color: '#F97316',
    icon: '⚙️',
    order: 1,
  },
  {
    code: 'ENG-ELEC',
    name: '电子工程',
    level: 2,
    parentCode: 'ENG',
    description: '电路分析、电子器件、信号处理、通信系统等',
    color: '#3B82F6',
    icon: '⚡',
    order: 2,
  },
  {
    code: 'ENG-CIVIL',
    name: '土木工程',
    level: 2,
    parentCode: 'ENG',
    description: '结构工程、岩土工程、水利工程、交通工程等',
    color: '#6366F1',
    icon: '🏗️',
    order: 3,
  },
  {
    code: 'ENG-CHEM',
    name: '化学工程',
    level: 2,
    parentCode: 'ENG',
    description: '化工原理、反应工程、分离工程、过程控制等',
    color: '#10B981',
    icon: '🏭',
    order: 4,
  },
  {
    code: 'ENG-AERO',
    name: '航空航天工程',
    level: 2,
    parentCode: 'ENG',
    description: '飞行器设计、推进系统、空气动力学、航天工程等',
    color: '#0EA5E9',
    icon: '✈️',
    order: 5,
  },
  {
    code: 'ENG-BIO',
    name: '生物工程',
    level: 2,
    parentCode: 'ENG',
    description: '生物医学工程、生物材料、生物制药、组织工程等',
    color: '#84CC16',
    icon: '🧬',
    order: 6,
  },
  
  // ========== 一级学科：经济学 ==========
  {
    code: 'ECON',
    name: '经济学',
    level: 1,
    description: '经济学基础学科，涵盖微观经济学、宏观经济学、金融学、国际贸易等',
    color: '#FCD34D',
    icon: '💰',
    order: 7,
  },
  
  // ========== 二级学科：经济学分支 ==========
  {
    code: 'ECON-MICRO',
    name: '微观经济学',
    level: 2,
    parentCode: 'ECON',
    description: '供需理论、市场结构、消费者行为、生产者理论等',
    color: '#FCD34D',
    icon: '📊',
    order: 1,
  },
  {
    code: 'ECON-MACRO',
    name: '宏观经济学',
    level: 2,
    parentCode: 'ECON',
    description: '国民收入、经济增长、通货膨胀、货币政策等',
    color: '#F59E0B',
    icon: '📈',
    order: 2,
  },
  {
    code: 'ECON-FIN',
    name: '金融学',
    level: 2,
    parentCode: 'ECON',
    description: '投资学、公司金融、金融市场、风险管理等',
    color: '#10B981',
    icon: '💵',
    order: 3,
  },
  {
    code: 'ECON-TRADE',
    name: '国际贸易',
    level: 2,
    parentCode: 'ECON',
    description: '国际贸易理论、汇率、贸易政策、国际金融等',
    color: '#06B6D4',
    icon: '🌐',
    order: 4,
  },
  
  // ========== 一级学科：语言学 ==========
  {
    code: 'LING',
    name: '语言学',
    level: 1,
    description: '语言学基础学科，涵盖语音学、语法学、语义学、语用学等',
    color: '#EC4899',
    icon: '💬',
    order: 8,
  },
  
  // ========== 二级学科：语言学分支 ==========
  {
    code: 'LING-PHON',
    name: '语音学',
    level: 2,
    parentCode: 'LING',
    description: '语音学、音系学、语音识别、语音合成等',
    color: '#EC4899',
    icon: '🎤',
    order: 1,
  },
  {
    code: 'LING-SYN',
    name: '语法学',
    level: 2,
    parentCode: 'LING',
    description: '句法学、形态学、语法分析、语法理论等',
    color: '#F59E0B',
    icon: '📝',
    order: 2,
  },
  {
    code: 'LING-SEM',
    name: '语义学',
    level: 2,
    parentCode: 'LING',
    description: '语义理论、词汇语义、句法语义、形式语义等',
    color: '#8B5CF6',
    icon: '🔤',
    order: 3,
  },
  {
    code: 'LING-PRAG',
    name: '语用学',
    level: 2,
    parentCode: 'LING',
    description: '语用理论、话语分析、言语行为、语境等',
    color: '#10B981',
    icon: '💭',
    order: 4,
  },
  
  // ========== 一级学科：心理学 ==========
  {
    code: 'PSY',
    name: '心理学',
    level: 1,
    description: '心理学基础学科，涵盖认知心理学、发展心理学、社会心理学、临床心理学等',
    color: '#A855F7',
    icon: '🧠',
    order: 9,
  },
  
  // ========== 二级学科：心理学分支 ==========
  {
    code: 'PSY-COG',
    name: '认知心理学',
    level: 2,
    parentCode: 'PSY',
    description: '认知过程、记忆、注意、思维、问题解决等',
    color: '#A855F7',
    icon: '🧠',
    order: 1,
  },
  {
    code: 'PSY-DEV',
    name: '发展心理学',
    level: 2,
    parentCode: 'PSY',
    description: '儿童发展、青少年发展、成人发展、老年心理学等',
    color: '#8B5CF6',
    icon: '👶',
    order: 2,
  },
  {
    code: 'PSY-SOC',
    name: '社会心理学',
    level: 2,
    parentCode: 'PSY',
    description: '社会认知、群体行为、人际关系、社会影响等',
    color: '#EC4899',
    icon: '👥',
    order: 3,
  },
  {
    code: 'PSY-CLIN',
    name: '临床心理学',
    level: 2,
    parentCode: 'PSY',
    description: '心理评估、心理治疗、心理障碍、心理健康等',
    color: '#F59E0B',
    icon: '🏥',
    order: 4,
  },
  
  // ========== 一级学科：历史学 ==========
  {
    code: 'HIST',
    name: '历史学',
    level: 1,
    description: '历史学基础学科，涵盖中国古代史、世界史、近现代史、史学理论等',
    color: '#6366F1',
    icon: '📜',
    order: 10,
  },
  
  // ========== 二级学科：历史学分支 ==========
  {
    code: 'HIST-CHINA',
    name: '中国史',
    level: 2,
    parentCode: 'HIST',
    description: '中国古代史、中国近现代史、中国当代史等',
    color: '#6366F1',
    icon: '🏛️',
    order: 1,
  },
  {
    code: 'HIST-WORLD',
    name: '世界史',
    level: 2,
    parentCode: 'HIST',
    description: '世界古代史、世界中世纪史、世界近现代史等',
    color: '#8B5CF6',
    icon: '🌍',
    order: 2,
  },
  {
    code: 'HIST-THEORY',
    name: '史学理论',
    level: 2,
    parentCode: 'HIST',
    description: '史学方法论、历史哲学、史料学、史学史等',
    color: '#EC4899',
    icon: '📚',
    order: 3,
  },
];

/**
 * 创建学科数据
 */
async function initSubjects() {
  try {
    console.log('🚀 开始初始化完整学科分类体系...\n');
    console.log('正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 创建学科映射（code -> _id）
    const subjectMap = new Map();
    const createdSubjects = [];
    const skippedSubjects = [];

    // 按层级排序：先创建一级，再创建二级，最后创建三级
    const sortedSubjects = allSubjects.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.order - b.order;
    });

    console.log(`准备创建 ${allSubjects.length} 个学科...\n`);

    for (const subjectData of sortedSubjects) {
      const { parentCode, ...data } = subjectData;
      
      // 检查是否已存在
      const existing = await Subject.findOne({ code: data.code });
      if (existing) {
        console.log(`⏭️  跳过: ${data.code} - ${data.name} (已存在)`);
        subjectMap.set(data.code, existing._id);
        skippedSubjects.push(data.code);
        continue;
      }

      // 如果有父学科，查找父学科ID
      let parentId = null;
      if (parentCode) {
        const parentIdFromMap = subjectMap.get(parentCode);
        if (parentIdFromMap) {
          parentId = parentIdFromMap;
        } else {
          const parent = await Subject.findOne({ code: parentCode });
          if (parent) {
            parentId = parent._id;
            subjectMap.set(parentCode, parent._id);
          } else {
            console.warn(`⚠️  警告：找不到父学科 ${parentCode}，跳过 ${data.code}`);
            continue;
          }
        }
      }

      // 创建学科
      const subject = await Subject.create({
        ...data,
        parentId,
      });

      subjectMap.set(data.code, subject._id);
      createdSubjects.push(subject);
      const indent = '  '.repeat(data.level - 1);
      const icon = data.icon || '📚';
      console.log(`${indent}✅ ${icon} ${data.code} - ${data.name} (层级 ${data.level})`);
    }

    console.log(`\n📊 统计信息:`);
    console.log(`   总计: ${allSubjects.length} 个学科`);
    console.log(`   新建: ${createdSubjects.length} 个学科`);
    console.log(`   跳过: ${skippedSubjects.length} 个学科（已存在）`);
    
    const stats = {
      level1: createdSubjects.filter(s => s.level === 1).length,
      level2: createdSubjects.filter(s => s.level === 2).length,
      level3: createdSubjects.filter(s => s.level === 3).length,
    };
    console.log(`\n   一级学科: ${stats.level1} 个`);
    console.log(`   二级学科: ${stats.level2} 个`);
    console.log(`   三级学科: ${stats.level3} 个`);

    // 按一级学科统计
    const level1Subjects = allSubjects.filter(s => s.level === 1);
    console.log(`\n📚 一级学科列表:`);
    for (const subj of level1Subjects) {
      const count = allSubjects.filter(s => 
        s.parentCode === subj.code || 
        (s.level === 2 && allSubjects.find(p => p.code === s.parentCode)?.parentCode === subj.code)
      ).length;
      console.log(`   ${subj.icon} ${subj.name} (${subj.code}): ${count} 个子学科`);
    }

    console.log(`\n✨ 完整学科分类体系初始化完成！`);

  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

// 执行脚本
initSubjects()
  .then(() => {
    console.log('\n🎉 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });

