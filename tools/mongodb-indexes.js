// 索引信息脚本
use('graphtutor');

const indexCollections = ["users", "questions", "questionbanks", "wrongquestions", "studyplans"];

indexCollections.forEach(col => {
    print(`\n${col.toUpperCase()} 集合索引:`);
    try {
        printjson(db[col].getIndexes());
    } catch(e) {
        print(`集合 ${col} 不存在`);
    }
});

