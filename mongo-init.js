// MongoDB schema/init for assessment content.
// Run in mongosh: load("db/mongo-init.js")

const stringOrObjectId = {
    oneOf: [
        { bsonType: "objectId" },
        { bsonType: "string", minLength: 1 }
    ]
};

const questionsValidator = {
    $jsonSchema: {
        bsonType: "object",
        required: ["type", "prompt", "difficultyLevel", "topicId", "correctAnswer", "createdAt"],
        properties: {
            type: {
                bsonType: "string",
                enum: ["multiple-choice", "essay", "audio-prompt"]
            },
            prompt: { bsonType: "string", minLength: 1 },
            options: {
                bsonType: ["array"],
                items: { bsonType: "string" },
                description: "Required for multiple-choice questions"
            },
            correctAnswer: { bsonType: "string", minLength: 1 },
            difficultyLevel: {
                bsonType: "string",
                enum: ["easy", "medium", "hard"]
            },
            topicId: stringOrObjectId,
            audioPromptUrl: { bsonType: "string", minLength: 1 },
            maxScore: { bsonType: ["int", "double"] },
            minWordCount: { bsonType: ["int", "double"] },
            tags: {
                bsonType: "array",
                items: { bsonType: "string" }
            },
            createdBy: stringOrObjectId,
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
            active: { bsonType: "bool" }
        },
        allOf: [
            {
                if: { properties: { type: { const: "multiple-choice" } } },
                then: { required: ["options"] }
            },
            {
                if: { properties: { type: { const: "audio-prompt" } } },
                then: { required: ["audioPromptUrl"] }
            }
        ]
    }
};

const rubricsValidator = {
    $jsonSchema: {
        bsonType: "object",
        required: ["questionId", "ruleType", "points", "createdAt"],
        properties: {
            questionId: stringOrObjectId,
            ruleType: {
                bsonType: "string",
                enum: ["keyword", "regex", "exact"]
            },
            keywords: {
                bsonType: "array",
                items: { bsonType: "string" },
                description: "Required for keyword rules"
            },
            pattern: { bsonType: "string" },
            points: { bsonType: ["int", "double"] },
            caseSensitive: { bsonType: "bool" },
            minMatches: { bsonType: ["int", "double"] },
            notes: { bsonType: "string" },
            createdBy: stringOrObjectId,
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
            active: { bsonType: "bool" }
        },
        allOf: [
            {
                if: { properties: { ruleType: { const: "keyword" } } },
                then: { required: ["keywords"] }
            },
            {
                if: { properties: { ruleType: { const: "regex" } } },
                then: { required: ["pattern"] }
            }
        ]
    }
};

function ensureCollection(name, options) {
    if (!db.getCollectionNames().includes(name)) {
        db.createCollection(name, options);
    } else {
        db.runCommand({ collMod: name, ...options });
    }
}

ensureCollection("questions", {
    validator: questionsValidator,
    validationLevel: "moderate"
});

ensureCollection("rubrics", {
    validator: rubricsValidator,
    validationLevel: "moderate"
});

db.questions.createIndex({ difficultyLevel: 1, topicId: 1, type: 1 });
db.rubrics.createIndex({ questionId: 1, ruleType: 1 });
