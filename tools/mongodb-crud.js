// CRUD 操作脚本
use('graphtutor');

print("查询操作示例:");
print("\n1. 查询学生用户:");
db.users.find({ role: "student" }).limit(3).pretty();

print("\n2. 查询题目:");
db.questions.find({ difficulty: { $gte: 3 } }).limit(3).pretty();

print("\n3. 聚合查询:");
db.questions.aggregate([
    { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
]);

