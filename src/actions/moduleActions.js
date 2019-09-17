import { moduleConstants } from '../constants/moduleConstants';

export const moduleActions = {
    changeModule
};

function changeModule(module, message){
	return {type: moduleConstants.CHANGE_MODULE, module: module, message: message};
}
