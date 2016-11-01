import { routerActions } from 'react-router-redux';
import { takeEvery, takeLatest } from 'redux-saga';
import { call, fork, put, select } from 'redux-saga/effects';
import decodeJwt from 'jwt-decode';
import { FAILURE } from '../../../common/fetch/createFetchActionTypes';
import { fetchSagaFactory } from '../../../common/fetch/sagas';

import {
    fetchSignIn as fetchSignInApi,
    fetchSignUp as fetchSignUpApi,
    removeLocalUser as removeLocalUserApi,
    storeLocalUser as storeLocalUserApi,
} from './api';
import {
    signIn as signInActions,
    signOut as signOutActions,
    signUp as signUpActions,
    userActionTypes,
} from './actions';

export const getCurrentRoute = ({ routing }) =>
    (routing.locationBeforeTransitions && routing.locationBeforeTransitions.pathname) || '/';

export const getUserFromToken = (token) => {
    const tokenData = decodeJwt(token);

    return { ...tokenData, token, expires: new Date(tokenData.exp * 1000) };
};

export function* navigateToSignInSaga() {
    const previousRoute = yield select(getCurrentRoute);
    yield put(routerActions.replace({
        pathname: '/sign-in',
        state: { nextPathname: previousRoute },
    }));
}

export const signIn = (fetchSaga, storeLocalUser) => function* signInSaga({ payload: { previousRoute, ...payload } }) {
    const { error, result } = yield call(fetchSaga, { payload });

    if (!error) {
        const user = yield call(getUserFromToken, result.token);
        yield put(signInActions.success(user));
        yield call(storeLocalUser, user);
        yield put(routerActions.push(previousRoute));
    }
};

export const signUp = (fetchSaga, storeLocalUser) => function* signUpSaga({ payload: { previousRoute, ...payload } }) {
    const { error, result } = yield call(fetchSaga, { payload });

    if (!error) {
        const user = yield call(getUserFromToken, result.token);
        yield put(signUpActions.success(user));
        yield call(storeLocalUser, user);
        yield put(routerActions.push(previousRoute));
    }
};

export const signOut = removeLocalUser => function* signOutSaga() {
    yield call(removeLocalUser);
    yield put(signOutActions.success());
    yield put(routerActions.push('/'));
};

export const handleUnauthorizedErrors = function* handleUnauthorizedErrorsSaga() {
    const nextPathname = yield select(getCurrentRoute);

    yield put(routerActions.replace({
        pathname: '/sign-in',
        state: { nextPathname },
    }));
};

function* watchNavigateToSignInRequest() {
    yield takeEvery(userActionTypes.navigateToSignIn, navigateToSignInSaga);
}

function* watchSignInRequest() {
    const saga = signIn(fetchSagaFactory(signInActions, fetchSignInApi), storeLocalUserApi);
    yield takeLatest(userActionTypes.signIn.REQUEST, saga);
}

function* watchSignUpRequest() {
    const saga = signUp(fetchSagaFactory(signUpActions, fetchSignUpApi), storeLocalUserApi);
    yield takeLatest(userActionTypes.signUp.REQUEST, saga);
}

function* watchSignOutRequest() {
    yield takeLatest(userActionTypes.signOut.REQUEST, signOut(removeLocalUserApi));
}

export const detectUnauthorizedErrorAction = ({ type, payload, result }) => {
    if (type.includes(FAILURE) && payload.message === 'Unauthorized') return true;

    if (type === 'APOLLO_MUTATION_RESULT' && result && result.data) {
        return Object.keys(result.data).reduce((isUnauthorizedError, key) =>
            isUnauthorizedError && result.data[key].error && result.data[key].error.status === 401
        , true);
    }

    return false;
};

function* watchUnauthorizedErrors() {
    yield takeEvery(detectUnauthorizedErrorAction, handleUnauthorizedErrors);
}

export default function* sagas() {
    yield fork(watchNavigateToSignInRequest);
    yield fork(watchSignInRequest);
    yield fork(watchSignUpRequest);
    yield fork(watchSignOutRequest);
    yield fork(watchUnauthorizedErrors);
}
