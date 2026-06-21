const fs = require('fs');
const path = require('path');

const CONTACTS_PATH = path.join(__dirname, '../data/emergency_contacts.json');

const getContacts = () => {
    if (fs.existsSync(CONTACTS_PATH)) {
        return JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf8'));
    }
    return { contacts: [] };
};

const updateContacts = (data) => {
    fs.writeFileSync(CONTACTS_PATH, JSON.stringify(data, null, 2));
    return true;
};

module.exports = {
    getContacts,
    updateContacts
};
