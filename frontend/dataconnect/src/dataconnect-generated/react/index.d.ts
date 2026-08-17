import { GetUserProgressData, GetUserProgressVariables, GetUserProgressListData, GetUserProgressListVariables, SaveUserProgressData, SaveUserProgressVariables, GetUserProfileData, GetUserProfileVariables, UpsertUserProfileData, UpsertUserProfileVariables, ListUserProfilesData, DeleteUserProfileData, DeleteUserProfileVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useGetUserProgress(vars: GetUserProgressVariables, options?: useDataConnectQueryOptions<GetUserProgressData>): UseDataConnectQueryResult<GetUserProgressData, GetUserProgressVariables>;
export function useGetUserProgress(dc: DataConnect, vars: GetUserProgressVariables, options?: useDataConnectQueryOptions<GetUserProgressData>): UseDataConnectQueryResult<GetUserProgressData, GetUserProgressVariables>;

export function useGetUserProgressList(vars: GetUserProgressListVariables, options?: useDataConnectQueryOptions<GetUserProgressListData>): UseDataConnectQueryResult<GetUserProgressListData, GetUserProgressListVariables>;
export function useGetUserProgressList(dc: DataConnect, vars: GetUserProgressListVariables, options?: useDataConnectQueryOptions<GetUserProgressListData>): UseDataConnectQueryResult<GetUserProgressListData, GetUserProgressListVariables>;

export function useSaveUserProgress(options?: useDataConnectMutationOptions<SaveUserProgressData, FirebaseError, SaveUserProgressVariables>): UseDataConnectMutationResult<SaveUserProgressData, SaveUserProgressVariables>;
export function useSaveUserProgress(dc: DataConnect, options?: useDataConnectMutationOptions<SaveUserProgressData, FirebaseError, SaveUserProgressVariables>): UseDataConnectMutationResult<SaveUserProgressData, SaveUserProgressVariables>;

export function useGetUserProfile(vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
export function useGetUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;

export function useUpsertUserProfile(options?: useDataConnectMutationOptions<UpsertUserProfileData, FirebaseError, UpsertUserProfileVariables>): UseDataConnectMutationResult<UpsertUserProfileData, UpsertUserProfileVariables>;
export function useUpsertUserProfile(dc: DataConnect, options?: useDataConnectMutationOptions<UpsertUserProfileData, FirebaseError, UpsertUserProfileVariables>): UseDataConnectMutationResult<UpsertUserProfileData, UpsertUserProfileVariables>;

export function useListUserProfiles(options?: useDataConnectQueryOptions<ListUserProfilesData>): UseDataConnectQueryResult<ListUserProfilesData, undefined>;
export function useListUserProfiles(dc: DataConnect, options?: useDataConnectQueryOptions<ListUserProfilesData>): UseDataConnectQueryResult<ListUserProfilesData, undefined>;

export function useDeleteUserProfile(options?: useDataConnectMutationOptions<DeleteUserProfileData, FirebaseError, DeleteUserProfileVariables>): UseDataConnectMutationResult<DeleteUserProfileData, DeleteUserProfileVariables>;
export function useDeleteUserProfile(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteUserProfileData, FirebaseError, DeleteUserProfileVariables>): UseDataConnectMutationResult<DeleteUserProfileData, DeleteUserProfileVariables>;
