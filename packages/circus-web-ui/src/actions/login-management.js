import { store } from 'store';
import { api, tryAuthenticate } from 'utils/api';
import { browserHistory } from 'react-router';
import * as Cookies from 'js-cookie';

const dispatch = store.dispatch.bind(store);

/**
 * Loads the user information.
 */
export function refreshUserInfo(full = false) {
	return async (dispatch) => {
		dispatch({ type: 'REQUEST_LOGIN_INFO' });
		let result;
		try {
			result = await api('login-info' + (full ? '/full' : ''));
			if (typeof result.userEmail !== 'string') {
				throw Error('Server did not respond with valid user data');
			}
		} catch (err) {
			dispatch({ type: 'LOGGED_OUT' });
		}
		if (full) {
			dispatch({ type: 'LOAD_FULL_LOGIN_INFO', loginUser: result });
		} else {
			dispatch({ type: 'CONFIRM_LOGIN_INFO' });
		}
	};
}

export async function login(id, password) {
	await tryAuthenticate(id, password);
	browserHistory.push('/home');
}

export  function logout() {
	return async (dispatch) => {
		await api('logout');
		dispatch({ type: 'LOGGED_OUT' });
		Cookies.remove('apiToken');
		browserHistory.push('/');
	};
}