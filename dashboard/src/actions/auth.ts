import { ThunkAction } from "redux-thunk";
import { ActionType, createAction } from "typesafe-actions";

import { Auth } from "../shared/Auth";
import { IStoreState } from "../shared/types";
import { clearNamespaces, NamespaceAction, namespaceReceived } from "./namespace";

export const setAuthenticated = createAction("SET_AUTHENTICATED", resolve => {
  return (authenticated: boolean, oidc: boolean, defaultNamespace: string) =>
    resolve({ authenticated, oidc, defaultNamespace });
});

export const authenticating = createAction("AUTHENTICATING");

export const authenticationError = createAction("AUTHENTICATION_ERROR", resolve => {
  return (errorMsg: string) => resolve(errorMsg);
});

export const setSessionExpired = createAction("SET_AUTHENTICATION_SESSION_EXPIRED", resolve => {
  return (sessionExpired: boolean) => resolve({ sessionExpired });
});

const allActions = [setAuthenticated, authenticating, authenticationError, setSessionExpired];

export type AuthAction = ActionType<typeof allActions[number]>;

export function authenticate(
  token: string,
  oidc: boolean,
): ThunkAction<Promise<void>, IStoreState, null, AuthAction | NamespaceAction> {
  return async dispatch => {
    dispatch(authenticating());
    try {
      await Auth.validateToken(token);
      Auth.setAuthToken(token, oidc);
      const defaultNamespace = Auth.defaultNamespaceFromToken(token);
      dispatch(setAuthenticated(true, oidc, defaultNamespace));
      dispatch(namespaceReceived(defaultNamespace));
      if (oidc) {
        dispatch(setSessionExpired(false));
      }
    } catch (e) {
      dispatch(authenticationError(e.toString()));
    }
  };
}

export function logout(): ThunkAction<
  Promise<void>,
  IStoreState,
  null,
  AuthAction | NamespaceAction
> {
  return async dispatch => {
    Auth.unsetAuthToken();
    dispatch(setAuthenticated(false, false, ""));
    dispatch(clearNamespaces());
  };
}

export function expireSession(): ThunkAction<Promise<void>, IStoreState, null, AuthAction> {
  return async dispatch => {
    if (Auth.usingOIDCToken()) {
      dispatch(setSessionExpired(true));
    }
    return dispatch(logout());
  };
}

export function tryToAuthenticateWithOIDC(): ThunkAction<
  Promise<void>,
  IStoreState,
  null,
  AuthAction
> {
  return async dispatch => {
    dispatch(authenticating());
    const token = await Auth.fetchOIDCToken();
    if (token) {
      dispatch(authenticate(token, true));
    } else {
      dispatch(setAuthenticated(false, false, ""));
    }
  };
}
