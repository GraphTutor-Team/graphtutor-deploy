// 数据模型示例脚本
use('graphtutor');

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

