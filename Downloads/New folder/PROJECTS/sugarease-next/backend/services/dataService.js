const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const MASTER_DATASET_PATH = path.join(__dirname, '../data/sugar_ease_master_dataset.csv');
const ELDER_DATASET_PATH = path.join(__dirname, '../data/elder_diabetes_dataset.csv');

/**
 * Initialize CSV file if it doesn't exist
 */
const initDb = () => {
    if (!fs.existsSync(MASTER_DATASET_PATH)) {
        const csvWriter = createObjectCsvWriter({
            path: MASTER_DATASET_PATH,
            header: [
                { id: 'Date', title: 'Date' },
                { id: 'Fasting', title: 'Fasting' },
                { id: 'PostMeal', title: 'PostMeal' },
                { id: 'DietType', title: 'DietType' },
                { id: 'Exercise', title: 'Exercise' },
                { id: 'FoodKeywords', title: 'FoodKeywords' },
                { id: 'Mood', title: 'Mood' },
                { id: 'Notes', title: 'Notes' }
            ]
        });
        return csvWriter.writeRecords([]);
    }
};

/**
 * Get all data from master dataset
 */
const getAllData = () => {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(MASTER_DATASET_PATH)) return resolve([]);

        fs.createReadStream(MASTER_DATASET_PATH)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
};

/**
 * Save an entry to the master dataset
 */
const saveEntry = async (entry) => {
    const csvWriter = createObjectCsvWriter({
        path: MASTER_DATASET_PATH,
        header: [
            { id: 'Date', title: 'Date' },
            { id: 'Fasting', title: 'Fasting' },
            { id: 'PostMeal', title: 'PostMeal' },
            { id: 'DietType', title: 'DietType' },
            { id: 'Exercise', title: 'Exercise' },
            { id: 'FoodKeywords', title: 'FoodKeywords' },
            { id: 'Mood', title: 'Mood' },
            { id: 'Notes', title: 'Notes' }
        ],
        append: true
    });

    if (!entry.Date) {
        entry.Date = new Date().toISOString().split('T')[0];
    }

    await csvWriter.writeRecords([entry]);
    return true;
};

module.exports = {
    initDb,
    getAllData,
    saveEntry
};
