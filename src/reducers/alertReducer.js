import { alertConstants } from '../constants/alertConstants';
import { moduleConstants } from '../constants/moduleConstants';

export function alert(state = {}, action) {
  switch (action.type) {
    case alertConstants.SUCCESS:
      return {
        type: 'alert-success',
        message: action.message
      };
    case alertConstants.ERROR:
      return {
        type: 'alert-danger',
        message: action.message
      };
    case moduleConstants.CHANGE_MODULE:
      return {};
    case alertConstants.CLEAR:
      return {};
    default:
      return state
  }
}
