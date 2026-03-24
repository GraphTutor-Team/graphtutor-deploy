// GraphTutor MongoDB 截图操作脚本
// 用于生成截图所需的 MongoDB 操作输出

// 切换到数据库
use('graphtutor');

print("=".repeat(80));
print("📊 1. 集合统计");
print("=".repeat(80));
print("\n所有集合列表:");
db.getCollectionNames().forEach(col => print(`  - ${col}`));

print("\n" + "=".repeat(80));
print("各集合数据量统计:");
print("=".repeat(80));

const collections = [
    "users", "questions", "questionbanks", "subjects", "records",
    "wrongquestions", "roleapplications", "quizsessions", "knowledgenodes",
    "groups", "learninggoals", "achievements", "studyplans", "reviewplans",
    "favorites", "favoritefolders", "notes"
];

collections.forEach(col => {
    try {
        const count = db[col].countDocuments();
        print(`${col.padEnd(20)}: ${count}`);
    } catch(e) {
        print(`${col.padEnd(20)}: 集合不存在或查询失败`);
    }
});

print("\n" + "=".repeat(80));
print("📑 2. 索引创建和验证");
print("=".repeat(80));

const indexCollections = ["users", "questions", "questionbanks", "wrongquestions", "studyplans"];

indexCollections.forEach(col => {
    print(`\n${col.toUpperCase()} 集合索引:`);
    try {
        const indexes = db[col].getIndexes();
        printjson(indexes);
    } catch(e) {
        print(`集合 ${col} 不存在`);
    }
});

print("\n" + "=".repeat(80));
print("🔍 3. CRUD 操作示例");
print("=".repeat(80));

print("\n3.1 查询操作 (Find):");
print("-".repeat(80));
print("查询学生用户 (前5条):");
db.users.find({ role: "student" }).limit(5).pretty();

print("\n查询中等难度以上的题目 (前5条):");
db.questions.find({ difficulty: { $gte: 3 } }).limit(5).pretty();

print("\n查询官方题库:");
db.questionbanks.find({ isOfficial: true }).pretty();

print("\n3.2 聚合查询示例:");
print("-".repeat(80));
print("统计各难度题目数量:");
db.questions.aggregate([
    { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
]);

print("\n3.3 插入操作 (Insert):");
print("-".repeat(80));
print("插入测试题目...");
const insertResult = db.questions.insertOne({
    content: "测试题目：MongoDB是什么类型的数据库？",
    type: "single",
    options: ["关系型数据库", "NoSQL数据库", "图数据库", "时序数据库"],
    answerIndex: 1,
    answer: 1,
    difficulty: 1,
    subjectCode: "CS",
    explain: "MongoDB是NoSQL文档数据库",
    source: "bank",
    createdAt: new Date(),
    updatedAt: new Date()
});
print("插入结果:");
printjson(insertResult);

const testId = insertResult.insertedId;

print("\n3.4 更新操作 (Update):");
print("-".repeat(80));
print("更新测试题目难度...");
const updateResult = db.questions.updateOne(
    { _id: testId },
    { $set: { difficulty: 2, updatedAt: new Date() } }
);
print("更新结果:");
printjson(updateResult);

print("\n3.5 删除操作 (Delete):");
print("-".repeat(80));
print("删除测试题目...");
const deleteResult = db.questions.deleteOne({ _id: testId });
print("删除结果:");
printjson(deleteResult);

print("\n" + "=".repeat(80));
print("📈 4. 查询性能分析");
print("=".repeat(80));

print("\n查询执行计划分析:");
try {
    const explainResult = db.questions.find({ difficulty: 3, subjectCode: "CS-DS" }).explain("executionStats");
    printjson({
        executionTimeMillis: explainResult.executionStats.executionTimeMillis,
        totalDocsExamined: explainResult.executionStats.totalDocsExamined,
        totalKeysExamined: explainResult.executionStats.totalKeysExamined,
        winningPlan: explainResult.queryPlanner.winningPlan
    });
} catch(e) {
    print("执行计划分析失败（可能没有匹配的数据）");
}

print("\n" + "=".repeat(80));
print("📄 5. 数据模型示例");
print("=".repeat(80));

const sampleCollections = ["users", "questions", "questionbanks", "wrongquestions", "studyplans"];

sampleCollections.forEach(col => {
    print(`\n${col.toUpperCase()} 集合文档示例:`);
    try {
        const doc = db[col].findOne();
        if (doc) {
            printjson(doc);
        } else {
            print(`集合 ${col} 为空`);
        }
    } catch(e) {
        print(`集合 ${col} 不存在`);
    }
});

print("\n" + "=".repeat(80));
print("✅ 所有操作完成!");
print("=".repeat(80));

