/**
 * Keyword extraction logic expanded for Indian medical context
 */
const extractKeywords = (text) => {
    const lowercaseText = text.toLowerCase();

    const keywords = {
        food: [
            "rice", "idli", "dosa", "vada", "upma", "poha", "sambar", "curd",
            "chapati", "roti", "paratha", "puri", "bhature", "dal", "paneer",
            "chicken", "mutton", "fish", "egg", "fruit", "juice", "soft drink",
            "sweets", "laddu", "jamun", "paysa", "kesari", "coffee", "tea", "milk",
            "biscuit", "ragi", "mudde", "jolada", "anna", "sarru", "palya"
        ],
        exercise: [
            "walking", "yoga", "jogging", "swimming", "gym", "cycling",
            "walking slowly", "brisk walk", "pranayama", "stretching"
        ],
        health: [
            "tired", "dizzy", "fatigue", "weak", "blurred vision", "headache",
            "sweating", "shaking", "hunger", "thirst", "fever"
        ],
        mood: [
            "happy", "stressed", "sad", "anxious", "angry", "calm", "relaxed"
        ]
    };

    const extracted = {
        food: [],
        exercise: [],
        health: [],
        mood: []
    };

    for (const [category, terms] of Object.entries(keywords)) {
        for (const term of terms) {
            // Use regex to match whole words/phrases
            const regex = new RegExp(`\\b${term}\\b`, 'i');
            if (regex.test(lowercaseText)) {
                extracted[category].push(term);
            }
        }
    }

    return extracted;
};

module.exports = {
    extractKeywords
};
