# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useGetUserProgress, useGetUserProgressList, useSaveUserProgress, useGetUserProfile, useUpsertUserProfile, useListUserProfiles, useDeleteUserProfile } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useGetUserProgress(getUserProgressVars);

const { data, isPending, isSuccess, isError, error } = useGetUserProgressList(getUserProgressListVars);

const { data, isPending, isSuccess, isError, error } = useSaveUserProgress(saveUserProgressVars);

const { data, isPending, isSuccess, isError, error } = useGetUserProfile(getUserProfileVars);

const { data, isPending, isSuccess, isError, error } = useUpsertUserProfile(upsertUserProfileVars);

const { data, isPending, isSuccess, isError, error } = useListUserProfiles();

const { data, isPending, isSuccess, isError, error } = useDeleteUserProfile(deleteUserProfileVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getUserProgress, getUserProgressList, saveUserProgress, getUserProfile, upsertUserProfile, listUserProfiles, deleteUserProfile } from '@dataconnect/generated';


// Operation GetUserProgress:  For variables, look at type GetUserProgressVars in ../index.d.ts
const { data } = await GetUserProgress(dataConnect, getUserProgressVars);

// Operation GetUserProgressList:  For variables, look at type GetUserProgressListVars in ../index.d.ts
const { data } = await GetUserProgressList(dataConnect, getUserProgressListVars);

// Operation SaveUserProgress:  For variables, look at type SaveUserProgressVars in ../index.d.ts
const { data } = await SaveUserProgress(dataConnect, saveUserProgressVars);

// Operation GetUserProfile:  For variables, look at type GetUserProfileVars in ../index.d.ts
const { data } = await GetUserProfile(dataConnect, getUserProfileVars);

// Operation UpsertUserProfile:  For variables, look at type UpsertUserProfileVars in ../index.d.ts
const { data } = await UpsertUserProfile(dataConnect, upsertUserProfileVars);

// Operation ListUserProfiles: 
const { data } = await ListUserProfiles(dataConnect);

// Operation DeleteUserProfile:  For variables, look at type DeleteUserProfileVars in ../index.d.ts
const { data } = await DeleteUserProfile(dataConnect, deleteUserProfileVars);


```