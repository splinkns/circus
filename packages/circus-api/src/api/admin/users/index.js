import status from 'http-status';
import performSearch from '../../performSearch';
import nodepass from 'node-php-password';

const removePassword = input => {
	const output = { ...input };
	delete output.password;
	return output;
};

export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		await performSearch(
			models.user, {}, ctx,
			{ transform: removePassword }
		);
	};
};

export const handleGet = ({ models }) => {
	return async (ctx, next) => {
		const user = removePassword(
			await models.user.findByIdOrFail(ctx.params.userEmail)
		);
		ctx.body = user;
	};
};

export const handlePut = ({ models }) => {
	return async (ctx, next) => {
		const userEmail = ctx.params.userEmail;
		const updating = { ...ctx.request.body };
		if ('lastLoginIp' in updating || 'lastLoginTime' in updating) {
			ctx.throw(status.BAD_REQUEST);
		}
		if (ctx.request.body.password) {
			updating.password = nodepass.hash(ctx.request.body.password);
		}
		await models.user.modifyOne(userEmail, updating);
		ctx.body = null;
	};
};

export const handlePost = ({ models }) => {
	return async (ctx, next) => {
		if ('lastLoginIp' in ctx.request.body || 'lastLoginTime' in ctx.request.body) {
			ctx.throw(status.BAD_REQUEST);
		}
		const inserting = {
			...ctx.request.body,
			password: nodepass.hash(ctx.request.body.password),
			lastLoginTime: new Date(0),
			lastLoginIp: ''
		};
		await models.user.insert(inserting);
		ctx.body = { userEmail: ctx.request.body.userEmail };
	};
};