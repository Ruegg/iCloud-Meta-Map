import React from 'react';
import './App.css';

import { ModuleType } from './constants/ModuleType';

import { connect } from 'react-redux';

import AuthenticatePage from './AuthenticatePage';

import ProcessPage from './ProcessPage';

import MapPage from './MapPage';

class App extends React.Component{
	constructor(props){
		super(props);
	}
	render(){
		const {module} = this.props;
		switch(module.currentModule) {
			case ModuleType.AUTHENTICATE:
				return (
					<AuthenticatePage/>
				);
      case ModuleType.TWO_FACTOR:
        return (
          <AuthenticatePage/>
        );
      case ModuleType.PROCESS:
        return (
          <ProcessPage/>
        );
      case ModuleType.MAP:
        return (
          <MapPage/>
        );
			default:
				return (
					<p>Can't render!</p>
				);
		};
	}
}

function mapStateToProps(state) {
    const { alert,module } = state;
    return {
        alert,module
    };
}

const connectedApp = connect(mapStateToProps)(App);
export default connectedApp;
