import { userConstants } from '../constants/userConstants';

const initialState = {name: ''};

export function user(state = initialState, action) {
  switch (action.type) {
    case userConstants.SET_NAME:
      return {
        name: action.name
      };
    default:
      return state
  }
}
