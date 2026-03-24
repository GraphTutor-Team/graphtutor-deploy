/**
 * GraphTutor V3.0 - 计算机学科初始数据脚本
 * 
 * 功能：创建完整的计算机科学学科分类体系
 * 使用方法：node server/scripts/seed-computer-subjects.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Subject from '../src/models/Subject.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

// 完整的计算机学科数据（三级分类）
const computerSubjects = [
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
];

/**
 * 创建学科数据
 */
async function seedSubjects() {
  try {
    console.log('开始连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    // 创建学科映射（code -> _id）
    const subjectMap = new Map();
    const createdSubjects = [];

    // 按层级排序：先创建一级，再创建二级，最后创建三级
    const sortedSubjects = computerSubjects.sort((a, b) => a.level - b.level);

    for (const subjectData of sortedSubjects) {
      const { parentCode, ...data } = subjectData;
      
      // 检查是否已存在
      const existing = await Subject.findOne({ code: data.code });
      if (existing) {
        console.log(`学科 ${data.code} (${data.name}) 已存在，跳过`);
        subjectMap.set(data.code, existing._id);
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
            console.warn(`警告：找不到父学科 ${parentCode}，跳过 ${data.code}`);
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
      console.log(`✓ 创建学科: ${data.code} - ${data.name} (层级 ${data.level})`);
    }

    console.log(`\n完成！共创建 ${createdSubjects.length} 个学科`);
    console.log(`已存在 ${computerSubjects.length - createdSubjects.length} 个学科`);

    // 显示统计信息
    const stats = {
      level1: createdSubjects.filter(s => s.level === 1).length,
      level2: createdSubjects.filter(s => s.level === 2).length,
      level3: createdSubjects.filter(s => s.level === 3).length,
    };
    console.log('\n统计信息:');
    console.log(`  一级学科: ${stats.level1}`);
    console.log(`  二级学科: ${stats.level2}`);
    console.log(`  三级学科: ${stats.level3}`);

  } catch (error) {
    console.error('创建学科失败:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

// 执行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubjects()
    .then(() => {
      console.log('\n脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n脚本执行失败:', error);
      process.exit(1);
    });
}

export default seedSubjects;
