# Security Specification for OmniMesh

## Data Invariants
1. A **Receipt** must have a valid `id` and a unique `shipperDoNo` per `consignor`.
2. A **Manifest** must only contain items from existing **Receipts**.
3. **Activity Logs** are immutable once created (no updates or deletes by users).
4. **Master Data** (Users, Roles, Companies, Ports) can only be viewed by authenticated users and modified by those with specific permissions.
5. **Private User Data** (like passwords or sensitive roles) must be protected.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a `Receipt` with an `id` that doesn't belong to the user's pattern.
2. **Identity Spoofing**: Attempt to create a `User` profile as a regular user to grant oneself `role-superadmin`.
3. **Privilege Escalation**: Attempt to update a `Role` permissions object as a regular user.
4. **PII Leak**: Attempt to read the `users` collection as an unauthenticated user.
5. **State Shortcutting**: Attempt to update a `Manifest` status to 'SHIPPED' without the required fields being present.
6. **Integrity Breach**: Attempt to delete an `ActivityLog` entry to hide malicious behavior.
7. **Cross-Tenant Access (if applicable)**: Attempt to read `receipts` of another customer (this app seems to be a multi-user internal tool, so visibility depends on role).
8. **Shadow Field Injection**: Attempt to create a `Manifest` with a `isVerified: true` field that isn't in the schema to bypass system checks.
9. **Resource Exhaustion**: Attempt to create a document with a 1MB string in a field.
10. **ID Poisoning**: Attempt to create a document with a very long or invalid character string as an ID.
11. **Orphaned Write**: Attempt to create a `Return` for a `receiptId` that doesn't exist.
12. **Unauthorized Deletion**: Attempt to delete `Master Data` without `master_data:delete` permission.

## Security Controls
- Use `isValidId()` for all document IDs.
- Use `isValid[Entity]()` for all writes.
- Enforce `.size() <= MAX` on all strings.
- Implementation of RBAC using a `get()` lookup on the user's role document.

---

# Firestore Rules Test Runner (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "omnimesh-test",
    firestore: {
      rules: await fs.readFile("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test("unauthenticated user cannot read anything", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "receipts/sid-123")));
});

test("regular user cannot modify roles", async () => {
  const db = testEnv.authenticatedContext("user_1").firestore();
  await assertFails(setDoc(doc(db, "roles/role-superadmin"), { name: "Hacked" }));
});

test("activity logs are immutable", async () => {
  const db = testEnv.authenticatedContext("user_1").firestore();
  const logRef = doc(db, "activityLogs/log_1");
  await assertFails(deleteDoc(logRef));
});
```
