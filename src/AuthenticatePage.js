import React, { Component } from "react";

import { connect } from 'react-redux';
import { alertActions } from './actions/alertActions';
import { moduleActions } from './actions/moduleActions';


import { ModuleType } from './constants/ModuleType';
import { CloudService } from './services/CloudService';
import { MapService } from './services/MapService';

import './AuthenticatePage.css';

class AuthenticatePage extends React.Component {
	constructor(props){
		super(props);
    this.state = {email: '', password: '', twofactor: '', authWasFocused: false};

    this.twoFacRef = React.createRef();
    this.trySignIn = this.trySignIn.bind(this);
    this.tryTwoFactor = this.tryTwoFactor.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
	}
  componentDidUpdate(prevProps){
    const { module } = this.props;
    //Necessary since we use redux to manage our state changes
    if(module.currentModule == ModuleType.TWO_FACTOR && this.state.authWasFocused == false){
      this.setState({authWasFocused: true});
      this.twoFacRef.current.focus();
    }
  }
  trySignIn(){
    const { dispatch } = this.props;
    const { email, password } = this.state;
    dispatch(CloudService.tryAuthenticate(email,password));
  }
  tryTwoFactor(){
    const { dispatch } = this.props;
    dispatch(CloudService.authenticateTwoFactor(this.state.twofactor));
  }
  handleKeyDown(e){
    const {module} = this.props;
    if (e.keyCode == 13) {
      if(module.currentModule == ModuleType.AUTHENTICATE){
        this.trySignIn();
      }else if(module.currentModule == ModuleType.TWO_FACTOR){
        this.tryTwoFactor();
      }
    }
  }
  handleChange (evt) {
    const value = evt.target.type === 'checkbox' ? evt.target.checked : evt.target.value;
    this.setState({ [evt.target.name]: value });
  }
	render(){
    const { alert,module } = this.props;
		return (
      <div className="auth-wrapper">
        <div className="auth-module" onKeyDown={this.handleKeyDown}>
    		  <h4 className="auth-header">iCloud Meta Map</h4>
          {alert.message &&
            <div className={"alert alert-" + alert.type}>
              {alert.message}
            </div>
          }
          {module.currentModule == ModuleType.AUTHENTICATE &&
            <div>
            <input name="email" onChange={this.handleChange} className="auth-input" type="text" placeholder="Apple email" value={this.state.email}/>
            <input name="password" onChange={this.handleChange} className="auth-input" type="password" placeholder="Password" value={this.state.password}/>
            {/*<label className="auth-check-container">Remember
              <input name="remember" onChange={this.handleChange} checked={this.state.remember} type="checkbox"/>
              <span className="auth-checkmark"></span>
            </label>*/}
            <button className="auth-signin" onClick={this.trySignIn}>Sign in</button>
            </div>
          }
          {module.currentModule == ModuleType.TWO_FACTOR &&
            <div>
              <p className="twofactor-notice">Two factor is enabled on your device, please check your device and authenticate.</p>
              <input ref={this.twoFacRef} name="twofactor" onChange={this.handleChange} className="auth-input auth-input-twofactor" maxLength="6" type="text" placeholder="------" value={this.state.twofactor}/>
              <button className="auth-signin" onClick={this.tryTwoFactor}>Verify</button>
            </div>
          }
        </div>
  		</div>
		);
	}
}

function mapStateToProps(state) {
    const { alert,module } = state;
    return {
        alert,module
    };
}


const connectedAuthenticatePage = connect(mapStateToProps)(AuthenticatePage);
export default connectedAuthenticatePage;
