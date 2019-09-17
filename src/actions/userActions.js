import { userConstants } from '../constants/userConstants';

export const userActions = {
    setName
};

function setName(name){
	return {type: userConstants.SET_NAME, name: name};
}
