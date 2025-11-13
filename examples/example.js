"use strict";
/**
 * Example TypeScript file demonstrating TODO comment usage
 * This file shows various TODO patterns that Auto TODO Manager can detect
 */
// TODO: Add input validation for user email
function validateEmail(email) {
    return email.includes('@');
}
// FIXME: This function has a race condition when called concurrently
async function processData(data) {
    const results = [];
    for (const item of data) {
        results.push(await processItem(item));
    }
    return results;
}
// BUG: This doesn't handle the case when user is null
function getUserName(user) {
    return user.name; // Will crash if user is null
}
// HACK: Temporary solution until the API is fixed
function fetchUserData(userId) {
    // TODO: Replace with proper API call once backend is ready
    return mockUserData[userId] || {};
}
// NOTE: This algorithm uses O(n²) complexity - consider optimizing for large datasets
function findDuplicates(arr) {
    const duplicates = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j]) {
                duplicates.push(arr[i]);
            }
        }
    }
    return duplicates;
}
const mockUserData = {};
async function processItem(item) {
    // Implementation placeholder
    return item;
}
//# sourceMappingURL=example.js.map