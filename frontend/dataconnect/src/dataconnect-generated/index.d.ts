import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface DeleteUserProfileData {
  userProfile_delete?: UserProfile_Key | null;
}

export interface DeleteUserProfileVariables {
  id: string;
}

export interface GetUserProfileData {
  userProfile?: {
    id: string;
    username: string;
    email: string;
    role: string;
  } & UserProfile_Key;
}

export interface GetUserProfileVariables {
  id: string;
}

export interface GetUserProgressData {
  userProgress?: {
    learnIndex: number;
    p2Stars: string;
    p3Score?: number | null;
    p4LinksCount: number;
  };
}

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

export interface GetUserProgressListVariables {
  lessonIds: string[];
}

export interface GetUserProgressVariables {
  lessonId: string;
}

export interface ListUserProfilesData {
  userProfiles: ({
    id: string;
    username: string;
    email: string;
    role: string;
  } & UserProfile_Key)[];
}

export interface SaveUserProgressData {
  userProgress_upsert: UserProgress_Key;
}

export interface SaveUserProgressVariables {
  lessonId: string;
  learnIndex: number;
  p2Stars: string;
  p3Score?: number | null;
  p4LinksCount: number;
}

export interface UpsertUserProfileData {
  userProfile_upsert: UserProfile_Key;
}

export interface UpsertUserProfileVariables {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface UserProfile_Key {
  id: string;
  __typename?: 'UserProfile_Key';
}

export interface UserProgress_Key {
  userId: string;
  lessonId: string;
  __typename?: 'UserProgress_Key';
}

interface GetUserProgressRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProgressVariables): QueryRef<GetUserProgressData, GetUserProgressVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserProgressVariables): QueryRef<GetUserProgressData, GetUserProgressVariables>;
  operationName: string;
}
export const getUserProgressRef: GetUserProgressRef;

export function getUserProgress(vars: GetUserProgressVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressData, GetUserProgressVariables>;
export function getUserProgress(dc: DataConnect, vars: GetUserProgressVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressData, GetUserProgressVariables>;

interface GetUserProgressListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProgressListVariables): QueryRef<GetUserProgressListData, GetUserProgressListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserProgressListVariables): QueryRef<GetUserProgressListData, GetUserProgressListVariables>;
  operationName: string;
}
export const getUserProgressListRef: GetUserProgressListRef;

export function getUserProgressList(vars: GetUserProgressListVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressListData, GetUserProgressListVariables>;
export function getUserProgressList(dc: DataConnect, vars: GetUserProgressListVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProgressListData, GetUserProgressListVariables>;

interface SaveUserProgressRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SaveUserProgressVariables): MutationRef<SaveUserProgressData, SaveUserProgressVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SaveUserProgressVariables): MutationRef<SaveUserProgressData, SaveUserProgressVariables>;
  operationName: string;
}
export const saveUserProgressRef: SaveUserProgressRef;

export function saveUserProgress(vars: SaveUserProgressVariables): MutationPromise<SaveUserProgressData, SaveUserProgressVariables>;
export function saveUserProgress(dc: DataConnect, vars: SaveUserProgressVariables): MutationPromise<SaveUserProgressData, SaveUserProgressVariables>;

interface GetUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  operationName: string;
}
export const getUserProfileRef: GetUserProfileRef;

export function getUserProfile(vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;
export function getUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface UpsertUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertUserProfileVariables): MutationRef<UpsertUserProfileData, UpsertUserProfileVariables>;
  operationName: string;
}
export const upsertUserProfileRef: UpsertUserProfileRef;

export function upsertUserProfile(vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;
export function upsertUserProfile(dc: DataConnect, vars: UpsertUserProfileVariables): MutationPromise<UpsertUserProfileData, UpsertUserProfileVariables>;

interface ListUserProfilesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUserProfilesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListUserProfilesData, undefined>;
  operationName: string;
}
export const listUserProfilesRef: ListUserProfilesRef;

export function listUserProfiles(options?: ExecuteQueryOptions): QueryPromise<ListUserProfilesData, undefined>;
export function listUserProfiles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUserProfilesData, undefined>;

interface DeleteUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteUserProfileVariables): MutationRef<DeleteUserProfileData, DeleteUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteUserProfileVariables): MutationRef<DeleteUserProfileData, DeleteUserProfileVariables>;
  operationName: string;
}
export const deleteUserProfileRef: DeleteUserProfileRef;

export function deleteUserProfile(vars: DeleteUserProfileVariables): MutationPromise<DeleteUserProfileData, DeleteUserProfileVariables>;
export function deleteUserProfile(dc: DataConnect, vars: DeleteUserProfileVariables): MutationPromise<DeleteUserProfileData, DeleteUserProfileVariables>;

