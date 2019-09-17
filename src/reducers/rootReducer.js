import {alert} from './alertReducer';
import {module} from './moduleReducer';
import {user} from './userReducer';

import { combineReducers } from 'redux';


export default combineReducers({
  alert,
  module,
  user
});
