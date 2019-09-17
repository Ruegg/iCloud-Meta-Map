import React, { Component } from "react";

import { connect } from 'react-redux';
import { alertActions } from './actions/alertActions';
import { moduleActions } from './actions/moduleActions';


import { ModuleType } from './constants/ModuleType';
import { CloudService } from './services/CloudService';
import { MapService } from './services/MapService';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLongArrowAltLeft, faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons'

import './MediaViewerModule.css';

class LazyBackground extends React.Component {
  state = { src: null };

  componentDidMount() {
    var src = this.props.src;
    const imageLoader = new Image();
    imageLoader.src = src;

    imageLoader.onload = () => {
      this.setState({ src });
    };
  }

  render() {
    return <div {...this.props} style={{ backgroundImage: `url(${this.state.src})` }} />;
  }
}

class MediaViewerModule extends React.Component {
  constructor(props){
		super(props);
    this.state = {selectedMedia: '', recordNamePrevious: '', recordNameFollowing: '', scrollTop: 0};

    this.mediaRef = React.createRef();

    this.selectMedia = this.selectMedia.bind(this);
    this.closeFullMedia = this.closeFullMedia.bind(this);
  }
  closeFullMedia(){
    this.setState({selectedMedia: ""});
  }
  selectMedia(recordName){

    if(this.state.selectedMedia == ""){
      this.setState({scrollTop: this.mediaRef.current.scrollTop});
    }

    var mediaElements = this.props.mediaElements;
    mediaElements.sort((a, b) => (a.assetDate - b.assetDate));

    for(var i = 0; i != mediaElements.length;i++){
      if(mediaElements[i].recordName == recordName){
        var recordNamePrevious = i > 0 ? mediaElements[(i-1)].recordName : "";
        var recordNameFollowing = i < (mediaElements.length-1) ? mediaElements[(i+1)].recordName : "";
        console.log("Media element selected: ");
        console.log(JSON.stringify(mediaElements[i]));
        this.setState({recordNamePrevious, recordNameFollowing, selectedMedia: recordName});
        break;
      }
    }
  }
  componentDidUpdate(){
    if(this.state.selectedMedia == ""){
      this.mediaRef.current.scrollTop = this.state.scrollTop;
    }
  }
  render(){
    var mediaElements = this.props.mediaElements;
    mediaElements.sort((a, b) => (a.assetDate - b.assetDate));//Maybe in the future sort by distance from click

    var byYear = {};
    mediaElements.forEach(element => {
      var year = new Date(element.assetDate).getFullYear();
      if(byYear[year] == null){
        byYear[year] = [];
      }
      byYear[year].push(element);
    });

    return (
      <div ref={this.mediaRef} className="media-viewer">
        {(this.state.selectedMedia == '') ? (
          <div>
            <div className="media-windowbar">
              <button onClick={this.props.viewerClosed} className="close-button">X</button>
            </div>
            <p className="viewer-info">Displaying {mediaElements.length} resources</p>
            {Object.keys(byYear).map((year, i) => (
              <div key={year}className="year-elements">
                <span className="year-title">{year}</span>
                <hr className="year-hr"/>
                <div className="media-elements">
                  {byYear[year].map(mediaElement => (
                    <div onClick={() => this.selectMedia(mediaElement.recordName)} key={mediaElement.recordName} className="media-container">
                      <LazyBackground className="media-object" src={mediaElement.jpegThumb}/>
                    </div>
                  ))}
                </div>
              </div>
              ))}
          </div>
        ) : (
          <div className="full-viewer">
            <div className="full-image-wrapper">
              {MapService.getMapData()[this.state.selectedMedia].itemType != "com.apple.quicktime-movie" ? (
                <img className="full-image" src={MapService.getMapData()[this.state.selectedMedia].jpegOptimized}/>
              ) : (
                <video className="full-image" src={MapService.getMapData()[this.state.selectedMedia].originalResourceURL} controls></video>
              )}
            </div>
            <button className="media-back-button" onClick={this.closeFullMedia}><FontAwesomeIcon icon={faLongArrowAltLeft} color="white" /></button>
            <div className="full-image-controls">
              {this.state.recordNamePrevious != "" &&
                <button className="media-nav-button nav-left" onClick={() => this.selectMedia(this.state.recordNamePrevious)}><FontAwesomeIcon icon={faAngleLeft} color="white" /></button>
              }
              {this.state.recordNameFollowing != "" &&
                <button className="media-nav-button nav-right" onClick={() => this.selectMedia(this.state.recordNameFollowing)}><FontAwesomeIcon icon={faAngleRight} color="white" /></button>
              }
            </div>
          </div>
        )}
      </div>
    );
  }
};

function mapStateToProps(state) {
    const { alert,module } = state;
    return {
        alert,module
    };
}


const connectedMediaViewer = connect(mapStateToProps)(MediaViewerModule);
export default connectedMediaViewer;
