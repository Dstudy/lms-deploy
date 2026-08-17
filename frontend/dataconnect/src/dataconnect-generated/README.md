# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetUserProgress*](#getuserprogress)
  - [*GetUserProgressList*](#getuserprogresslist)
  - [*GetUserProfile*](#getuserprofile)
  - [*ListUserProfiles*](#listuserprofiles)
- [**Mutations**](#mutations)
  - [*SaveUserProgress*](#saveuserprogress)
  - [*UpsertUserProfile*](#upsertuserprofile)
  - [*DeleteUserProfile*](#deleteuserprofile)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetUserProgress
You can execute the `GetUserProgress` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserProgress(vars: GetUserProgressVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressData, GetUserProgressVariables>;

interface GetUserProgressRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProgressVariables): QueryRef<GetUserProgressData, GetUserProgressVariables>;
}
export const getUserProgressRef: GetUserProgressRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProgress(dc: DataConnect, vars: GetUserProgressVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressData, GetUserProgressVariables>;

interface GetUserProgressRef {
  ...
  (dc: DataConnect, vars: GetUserProgressVariables): QueryRef<GetUserProgressData, GetUserProgressVariables>;
}
export const getUserProgressRef: GetUserProgressRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProgressRef:
```typescript
const name = getUserProgressRef.operationName;
console.log(name);
```

### Variables
The `GetUserProgress` query requires an argument of type `GetUserProgressVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserProgressVariables {
  lessonId: string;
}
```
### Return Type
Recall that executing the `GetUserProgress` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProgressData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserProgressData {
  userProgress?: {
    learnIndex: number;
    p2Stars: string;
    p3Score?: number | null;
    p4LinksCount: number;
  };
}
```
### Using `GetUserProgress`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProgress, GetUserProgressVariables } from '@dataconnect/generated';

// The `GetUserProgress` query requires an argument of type `GetUserProgressVariables`:
const getUserProgressVars: GetUserProgressVariables = {
  lessonId: ..., 
};

// Call the `getUserProgress()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProgress(getUserProgressVars);
// Variables can be defined inline as well.
const { data } = await getUserProgress({ lessonId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProgress(dataConnect, getUserProgressVars);

console.log(data.userProgress);

// Or, you can use the `Promise` API.
getUserProgress(getUserProgressVars).then((response) => {
  const data = response.data;
  console.log(data.userProgress);
});
```

### Using `GetUserProgress`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProgressRef, GetUserProgressVariables } from '@dataconnect/generated';

// The `GetUserProgress` query requires an argument of type `GetUserProgressVariables`:
const getUserProgressVars: GetUserProgressVariables = {
  lessonId: ..., 
};

// Call the `getUserProgressRef()` function to get a reference to the query.
const ref = getUserProgressRef(getUserProgressVars);
// Variables can be defined inline as well.
const ref = getUserProgressRef({ lessonId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProgressRef(dataConnect, getUserProgressVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userProgress);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userProgress);
});
```

## GetUserProgressList
You can execute the `GetUserProgressList` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserProgressList(vars: GetUserProgressListVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressListData, GetUserProgressListVariables>;

interface GetUserProgressListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProgressListVariables): QueryRef<GetUserProgressListData, GetUserProgressListVariables>;
}
export const getUserProgressListRef: GetUserProgressListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProgressList(dc: DataConnect, vars: GetUserProgressListVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressListData, GetUserProgressListVariables>;

interface GetUserProgressListRef {
  ...
  (dc: DataConnect, vars: GetUserProgressListVariables): QueryRef<GetUserProgressListData, GetUserProgressListVariables>;
}
export const getUserProgressListRef: GetUserProgressListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProgressListRef:
```typescript
const name = getUserProgressListRef.operationName;
console.log(name);
```

### Variables
The `GetUserProgressList` query requires an argument of type `GetUserProgressListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserProgressListVariables {
  lessonIds: string[];
}
```
### Return Type
Recall that executing the `GetUserProgressList` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProgressListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserProgressListData {
  userProgresses: ({
    userId: string;
    lessonId: string;
    learnIndex: number;
    p2Stars: string;
    p3Score?: number | null;
    p4LinksCount: number;
    updatedAt: TimestampString;
  } & UserProgress_Key)[];
}
```
### Using `GetUserProgressList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProgressList, GetUserProgressListVariables } from '@dataconnect/generated';

// The `GetUserProgressList` query requires an argument of type `GetUserProgressListVariables`:
const getUserProgressListVars: GetUserProgressListVariables = {
  lessonIds: ..., 
};

// Call the `getUserProgressList()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProgressList(getUserProgressListVars);
// Variables can be defined inline as well.
const { data } = await getUserProgressList({ lessonIds: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProgressList(dataConnect, getUserProgressListVars);

console.log(data.userProgresses);

// Or, you can use the `Promise` API.
getUserProgressList(getUserProgressListVars).then((response) => {
  const data = response.data;
  console.log(data.userProgresses);
});
```

### Using `GetUserProgressList`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProgressListRef, GetUserProgressListVariables } from '@dataconnect/generated';

// The `GetUserProgressList` query requires an argument of type `GetUserProgressListVariables`:
const getUserProgressListVars: GetUserProgressListVariables = {
  lessonIds: ..., 
};

// Call the `getUserProgressListRef()` function to get a reference to the query.
const ref = getUserProgressListRef(getUserProgressListVars);
// Variables can be defined inline as well.
const ref = getUserProgressListRef({ lessonIds: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProgressListRef(dataConnect, getUserProgressListVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userProgresses);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userProgresses);
});
```

## GetUserProfile
You can execute the `GetUserProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserProfile(vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProfileRef:
```typescript
const name = getUserProfileRef.operationName;
console.log(name);
```

### Variables
The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserProfileVariables {
  id: string;
}
```
### Return Type
Recall that executing the `GetUserProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserProfileData {
  userProfile?: {
    id: string;
    username: string;
    email: string;
    role: string;
  } & UserProfile_Key;
}
```
### Using `GetUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProfile, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  id: ..., 
};

// Call the `getUserProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProfile(getUserProfileVars);
// Variables can be defined inline as well.
const { data } = await getUserProfile({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProfile(dataConnect, getUserProfileVars);

console.log(data.userProfile);

// Or, you can use the `Promise` API.
getUserProfile(getUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.userProfile);
});
```

### Using `GetUserProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProfileRef, GetUserProfileVariables } from '@dataconnect/generated';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  id: ..., 
};

// Call the `getUserProfileRef()` function to get a reference to the query.
const ref = getUserProfileRef(getUserProfileVars);
// Variables can be defined inline as well.
const ref = getUserProfileRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProfileRef(dataConnect, getUserProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userProfile);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userProfile);
});
```

## ListUserProfiles
You can execute the `ListUserProfiles` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listUserProfiles(options?: ExecuteQueryOptions): QueryPromise<ListUserProfilesData, undefined>;

interface ListUserProfilesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUserProfilesData, undefined>;
}
export const listUserProfilesRef: ListUserProfilesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listUserProfiles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUserProfilesData, undefined>;

interface ListUserProfilesRef {
  ...
  (dc: DataConnect): QueryRef<ListUserProfilesData, undefined>;
}
export const listUserProfilesRef: ListUserProfilesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listUserProfilesRef:
```typescript
const name = listUserProfilesRef.operationName;
console.log(name);
```

### Variables
The `ListUserProfiles` query has no variables.
### Return Type
Recall that executing the `ListUserProfiles` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListUserProfilesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListUserProfilesData {
  userProfiles: ({
    id: string;
    username: string;
    email: string;
    role: string;
  } & UserProfile_Key)[];
}
```
### Using `ListUserProfiles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listUserProfiles } from '@dataconnect/generated';


// Call the `listUserProfiles()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listUserProfiles();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listUserProfiles(dataConnect);

console.log(data.userProfiles);

// Or, you can use the `Promise` API.
listUserProfiles().then((response) => {
  const data = response.data;
  console.log(data.userProfiles);
});
```

### Using `ListUserProfiles`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listUserProfilesRef } from '@dataconnect/generated';


// Call the `listUserProfilesRef()` function to get a reference to the query.
const ref = listUserProfilesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listUserProfilesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userProfiles);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userProfiles);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## SaveUserProgress
You can execute the `SaveUserProgress` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
saveUserProgress(vars: SaveUserProgressVariables): MutationPromise<SaveUserProgressData, SaveUserProgressVariables>;

interface SaveUserProgressRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SaveUserProgressVariables): MutationRef<SaveUserProgressData, SaveUserProgressVariables>;
}
export const saveUserProgressRef: SaveUserProgressRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
saveUserProgress(dc: DataConnect, vars: SaveUserProgressVariables): MutationPromise<SaveUserProgressData, SaveUserProgressVariables>;

interface SaveUserProgressRef {
  ...
  (dc: DataConnect, vars: SaveUserProgressVariables): MutationRef<SaveUserProgressData, SaveUserProgressVariables>;
}
export const saveUserProgressRef: SaveUserProgressRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the saveUserProgressRef:
```typescript
const name = saveUserProgressRef.operationName;
console.log(name);
```

### Variables
The `SaveUserProgress` mutation requires an argument of type `SaveUserProgressVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SaveUserProgressVariables {
  lessonId: string;
  learnIndex: number;
  p2Stars: string;
  p3Score?: number | null;
  p4LinksCount: number;
}
```
### Return Type
Recall that executing the `SaveUserProgress` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SaveUserProgressData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SaveUserProgressData {
  userProgress_upsert: UserProgress_Key;
}
```
### Using `SaveUserProgress`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, saveUserProgress, SaveUserProgressVariables } from '@dataconnect/generated';

// The `SaveUserProgress` mutation requires an argument of type `SaveUserProgressVariables`:
const saveUserProgressVars: SaveUserProgressVariables = {
  lessonId: ..., 
  learnIndex: ..., 
  p2Stars: ..., 
  p3Score: ..., // optional
  p4LinksCount: ..., 
};

// Call the `saveUserProgress()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await saveUserProgress(saveUserProgressVars);
// Variables can be defined inline as well.
const { data } = await saveUserProgress({ lessonId: ..., learnIndex: ..., p2Stars: ..., p3Score: ..., p4LinksCount: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await saveUserProgress(dataConnect, saveUserProgressVars);

console.log(data.userProgress_upsert);

// Or, you can use the `Promise` API.
saveUserProgress(saveUserProgressVars).then((response) => {
  const data = response.data;
  console.log(data.userProgress_upsert);
});
```

### Using `SaveUserProgress`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, saveUserProgressRef, SaveUserProgressVariables } from '@dataconnect/generated';

// The `SaveUserProgress` mutation requires an argument of type `SaveUserProgressVariables`:
const saveUserProgressVars: SaveUserProgressVariables = {
  lessonId: ..., 
  learnIndex: ..., 
  p2Stars: ..., 
  p3Score: ..., // optional
  p4LinksCount: ..., 
};

// Call the `saveUserProgressRef()` function to get a reference to the mutation.
const ref = saveUserProgressRef(saveUserProgressVars);
// Variables can be defined inline as well.
const ref = saveUserProgressRef({ lessonId: ..., learnIndex: ..., p2Stars: ..., p3Score: ..., p4LinksCount: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = saveUserProgressRef(dataConnect, saveUserProgressVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userProgress_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userProgress_upsert);
});
```

## UpsertUserProfile
You can execute the `UpsertUserProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
upsertUserProfile(vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface UpsertUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
}
export const upsertUserProfileRef: UpsertUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertUserProfile(dc: DataConnect, vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface UpsertUserProfileRef {
  ...
  (dc: DataConnect, vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
}
export const upsertUserProfileRef: UpsertUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertUserProfileRef:
```typescript
const name = upsertUserProfileRef.operationName;
console.log(name);
```

### Variables
The `UpsertUserProfile` mutation requires an argument of type `UpsertUserProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertUserProfileVariables {
  id: string;
  username: string;
  email: string;
  role: string;
}
```
### Return Type
Recall that executing the `UpsertUserProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertUserProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertUserProfileData {
  userProfile_upsert: UserProfile_Key;
}
```
### Using `UpsertUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertUserProfile, UpsertUserProfileVariables } from '@dataconnect/generated';

// The `UpsertUserProfile` mutation requires an argument of type `UpsertUserProfileVariables`:
const upsertUserProfileVars: UpsertUserProfileVariables = {
  id: ..., 
  username: ..., 
  email: ..., 
  role: ..., 
};

// Call the `upsertUserProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertUserProfile(upsertUserProfileVars);
// Variables can be defined inline as well.
const { data } = await upsertUserProfile({ id: ..., username: ..., email: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertUserProfile(dataConnect, upsertUserProfileVars);

console.log(data.userProfile_upsert);

// Or, you can use the `Promise` API.
upsertUserProfile(upsertUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.userProfile_upsert);
});
```

### Using `UpsertUserProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertUserProfileRef, UpsertUserProfileVariables } from '@dataconnect/generated';

// The `UpsertUserProfile` mutation requires an argument of type `UpsertUserProfileVariables`:
const upsertUserProfileVars: UpsertUserProfileVariables = {
  id: ..., 
  username: ..., 
  email: ..., 
  role: ..., 
};

// Call the `upsertUserProfileRef()` function to get a reference to the mutation.
const ref = upsertUserProfileRef(upsertUserProfileVars);
// Variables can be defined inline as well.
const ref = upsertUserProfileRef({ id: ..., username: ..., email: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertUserProfileRef(dataConnect, upsertUserProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userProfile_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userProfile_upsert);
});
```

## DeleteUserProfile
You can execute the `DeleteUserProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteUserProfile(vars: DeleteUserProfileVariables): MutationPromise<DeleteUserProfileData, DeleteUserProfileVariables>;

interface DeleteUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteUserProfileVariables): MutationRef<DeleteUserProfileData, DeleteUserProfileVariables>;
}
export const deleteUserProfileRef: DeleteUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteUserProfile(dc: DataConnect, vars: DeleteUserProfileVariables): MutationPromise<DeleteUserProfileData, DeleteUserProfileVariables>;

interface DeleteUserProfileRef {
  ...
  (dc: DataConnect, vars: DeleteUserProfileVariables): MutationRef<DeleteUserProfileData, DeleteUserProfileVariables>;
}
export const deleteUserProfileRef: DeleteUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteUserProfileRef:
```typescript
const name = deleteUserProfileRef.operationName;
console.log(name);
```

### Variables
The `DeleteUserProfile` mutation requires an argument of type `DeleteUserProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteUserProfileVariables {
  id: string;
}
```
### Return Type
Recall that executing the `DeleteUserProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteUserProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteUserProfileData {
  userProfile_delete?: UserProfile_Key | null;
}
```
### Using `DeleteUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteUserProfile, DeleteUserProfileVariables } from '@dataconnect/generated';

// The `DeleteUserProfile` mutation requires an argument of type `DeleteUserProfileVariables`:
const deleteUserProfileVars: DeleteUserProfileVariables = {
  id: ..., 
};

// Call the `deleteUserProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteUserProfile(deleteUserProfileVars);
// Variables can be defined inline as well.
const { data } = await deleteUserProfile({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteUserProfile(dataConnect, deleteUserProfileVars);

console.log(data.userProfile_delete);

// Or, you can use the `Promise` API.
deleteUserProfile(deleteUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.userProfile_delete);
});
```

### Using `DeleteUserProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteUserProfileRef, DeleteUserProfileVariables } from '@dataconnect/generated';

// The `DeleteUserProfile` mutation requires an argument of type `DeleteUserProfileVariables`:
const deleteUserProfileVars: DeleteUserProfileVariables = {
  id: ..., 
};

// Call the `deleteUserProfileRef()` function to get a reference to the mutation.
const ref = deleteUserProfileRef(deleteUserProfileVars);
// Variables can be defined inline as well.
const ref = deleteUserProfileRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteUserProfileRef(dataConnect, deleteUserProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userProfile_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userProfile_delete);
});
```

