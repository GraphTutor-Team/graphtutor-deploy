// 集合统计脚本
use('graphtutor');

print("所有集合列表:");
db.getCollectionNames().forEach(col => print(`  - ${col}`));

print("\n各集合数据量统计:");
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
        print(`${col.padEnd(20)}: 集合不存在`);
    }
});

