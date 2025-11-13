/**
 * Example TypeScript file demonstrating TODO comment usage
 * This file shows various TODO patterns that Auto TODO Manager can detect
 */

// TODO: Add input validation for user email
function validateEmail(email: string): boolean {
  return email.includes('@');
}

// FIXME: This function has a race condition when called concurrently
async function processData(data: any[]) {
  const results = [];
  for (const item of data) {
    results.push(await processItem(item));
  }
  return results;
}

// BUG: This doesn't handle the case when user is null
function getUserName(user: User | null): string {
  return user.name; // Will crash if user is null
}

// HACK: Temporary solution until the API is fixed
function fetchUserData(userId: string) {
  // TODO: Replace with proper API call once backend is ready
  return mockUserData[userId] || {};
}

// NOTE: This algorithm uses O(n²) complexity - consider optimizing for large datasets
function findDuplicates(arr: number[]): number[] {
  const duplicates: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

interface User {
  name: string;
  email: string;
}

const mockUserData: Record<string, User> = {};

async function processItem(item: any): Promise<any> {
  // Implementation placeholder
  return item;
}

