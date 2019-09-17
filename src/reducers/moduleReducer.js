import { moduleConstants } from '../constants/moduleConstants';
import { ModuleType } from '../constants/ModuleType';


const initialState = {currentModule: ModuleType.AUTHENTICATE, moduleMessage: ''};

export function module(state = initialState, action) {
  switch (action.type) {
    case moduleConstants.CHANGE_MODULE:
      return {
        currentModule: action.module,
        moduleMessage: action.message
      };
    default:
      return state
  }
}
