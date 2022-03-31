import React, { Component } from "react";

import ReactMapGL from 'react-map-gl';

import { connect } from 'react-redux';

import './MapPage.css';

import { MapService } from './services/MapService';

import MediaViewerModule from './MediaViewerModule';

const mapColors = {
  2014: '255,140,0',
  2015: '255,0,93',
  2016: '0,255,127',
  2017: '250,0,255',
  2018: '255,245,0',
  2019: '0,195,255',
  2020: '187,10,33',
  2021: '164,255,132',
  2022: '255,140,0',
  2023: '255,0,93',
  2024: '0,255,127',
  2025: '250,0,255',
  2026: '255,245,0',
  2027: '0,195,255',
  2028: '187,10,33',
  2029: '164,255,132'
};

class MapPage extends React.Component {
  constructor(props){
    super(props);

    this.state = {viewport: {
            width: '100%',
            height: '100%',
            longitude: -122.45,
            latitude: 37.78,
            zoom: 14
        },
        viewingElements: []
      };
    this.mapRef = React.createRef();
    this.toggleYear = this.toggleYear.bind(this);
    this.viewerClosed = this.viewerClosed.bind(this);
    this.handleViewportChange = this.handleViewportChange.bind(this);
    this.handleMapClick = this.handleMapClick.bind(this);
    this.handleMapLoaded = this.handleMapLoaded.bind(this);
  }
  handleViewportChange = viewport => {
    const {width, height, ...etc} = viewport
    this.setState({viewport: etc})
  }
  getMap = () => {
    return this.mapRef.current ? this.mapRef.current.getMap() : null;
  };
  handleMapLoaded = event => {
    const map = this.getMap();

    var currentMapData = MapService.getMapData();

    var yearFeatures = {};

    //Sort data
    Object.keys(currentMapData).forEach(recordName => {
      var mediaObject = currentMapData[recordName];
      var recordYear = new Date(mediaObject.assetDate).getFullYear();
      if(yearFeatures[recordYear] == null){
        yearFeatures[recordYear] = [];
      }

      yearFeatures[recordYear].push({
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "Point",
            "coordinates": [
                mediaObject.lon,
                mediaObject.lat
            ]
        }
      });
    });

    //Add data
    Object.keys(yearFeatures).forEach(year => {
      console.log("Adding " + year);
      var id = 'year-' + year;
      map.addSource(id, {type: 'geojson', data: {
        'type': 'FeatureCollection',
        'features': yearFeatures[year]
      }});
      map.addLayer(this.makeHeatLayer(year, id));
    });

    var lastMedia = currentMapData[Object.keys(currentMapData).reduce((a, b) => currentMapData[a].assetDate > currentMapData[b].assetDate ? a : b)];

    this.handleViewportChange({latitude: lastMedia.lat, longitude: lastMedia.lon, zoom: 10});
  }
  toggleYear(evt){
    const value = evt.target.type === 'checkbox' ? evt.target.checked : evt.target.value;
    this.setState({ [evt.target.name]: value });

    this.getMap().setLayoutProperty(evt.target.name, 'visibility', value ? 'visible' : 'none');
  }
  createGeoJSONCircleData(center, radiusInKm, points){
    var coords = {
        latitude: center[1],
        longitude: center[0]
    };

    var ret = [];
    var distanceX = radiusInKm/(111.320*Math.cos(coords.latitude*Math.PI/180));
    var distanceY = radiusInKm/110.574;

    var theta, x, y;
    for(var i=0; i<points; i++) {
        theta = (i/points)*(2*Math.PI);
        x = distanceX*Math.cos(theta);
        y = distanceY*Math.sin(theta);
        ret.push([coords.longitude+x, coords.latitude+y]);
    }

    ret.push(ret[0]);
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [ret]
            }
        }]
    };
  }
  handleMapClick(evt){

    if(this.state.viewport.zoom < 12){//We don't necessarily want users to prompt tens of thousands of pictures by clicking a state
      return;
    }

    var map = this.getMap();

    var currentMapData = MapService.getMapData();

    /*Built in queryRenderedFeatures currently doesn't support HeatMaps, so we'll use our own logic.
    We want to have a constant radius, such as 10 ft. We'll do some math do accomplish thing from latitude conversion*/

    var longitude = evt.lngLat[0];
    var latitude = evt.lngLat[1];

    var latRads = latitude * Math.PI/180;

    var cosLat = Math.cos(latRads);

    var degreeOfLatitude = 69.172;

    var degreeOfLongitude = cosLat*degreeOfLatitude;

    var oneFootAsLongitude = 1/(degreeOfLongitude*5280);
    var oneFootAsLatitude = 1/(degreeOfLatitude*5280);


    //Comfortable formula to base radius off zoom level
    var radiusUsingFeet = 50+Math.exp(((24-this.state.viewport.zoom)/24)*15);

    var mediaElementsInRadius = [];

    Object.keys(currentMapData).map(recordName => {
      var mediaObject = currentMapData[recordName];

      if(Math.abs(longitude - mediaObject.lon) > radiusUsingFeet*oneFootAsLongitude || Math.abs(latitude-mediaObject.lat) > radiusUsingFeet*oneFootAsLatitude){
        return;
      }

      var year = new Date(mediaObject.assetDate).getFullYear();
      var toggled = this.state[("year-" + year)] == null ? true : this.state[("year-" + year)];
      if(toggled){
        mediaElementsInRadius.push(mediaObject);
      }
    });

    var radiusInKM = radiusUsingFeet/3280.84;

    if(typeof map.getLayer("polygon") !== 'undefined'){
      map.removeLayer('polygon');
      map.removeSource('polygon');
    }

    map.addSource("polygon", {'type': 'geojson', 'data': this.createGeoJSONCircleData([longitude, latitude], radiusInKM, 64)});

    map.addLayer({
      "id": "polygon",
      "type": "fill",
      "source": "polygon",
      "layout": {},
      "paint": {
          "fill-color": "#35E0FF",
          "fill-opacity": 0.5
      }
    });

    var startTime = Date.now()-100;//Start animation 1/3rd in

    var animatePolygon = function() {
      var diff = Date.now()-startTime;
      map.getSource("polygon").setData(this.createGeoJSONCircleData([longitude, latitude], (diff/300)*radiusInKM, 64));
      if(diff< 300){
        requestAnimationFrame(animatePolygon);
      }else{
        this.setState({viewingElements: mediaElementsInRadius});
      }
    }.bind(this);

    animatePolygon();

  }
  viewerClosed(){
    this.setState({viewingElements: []});
  }
  makeHeatLayer(year,sourceID){
    return  {
      id: ('year-' + year),
      source: sourceID,
      type: 'heatmap',
      paint: {
          "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0, 1,
              9, 7
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            ('rgba(' + mapColors[year] + ',0.0)'),
            0.2,
            ('rgba(' + mapColors[year] + ',0.03)'),
            0.4,
            ('rgba(' + mapColors[year] + ',0.05)'),
            0.6,
            ('rgba(' + mapColors[year] + ',0.1)'),
            0.8,
            ('rgba(' + mapColors[year] + ',0.2)'),
            1,
            ('rgba(' + mapColors[year] + ',0.5)'),
            1.2,
            ('rgba(' + mapColors[year] + ',0.6)'),
            1.4,
            ('rgba(' + mapColors[year] + ',0.8)'),
            1.6,
            ('rgba(' + mapColors[year] + ',0.95)'),
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,7
          ]
      }
    }
  }
  render(){
    var yearsIncluded = MapService.getYearsIncluded();

    console.log("included: " + yearsIncluded);
    var yearToggled = {};

    yearsIncluded.forEach(year => {
      yearToggled[year] = this.state[("year-" + year)] == null ? true : this.state[("year-" + year)];
    });
    return (
      <div className="map-wrapper">
        <ReactMapGL
          mapboxApiAccessToken="pk.eyJ1IjoibmttYXAiLCJhIjoiY2pldThqeDhvMDN2ZzJwa2FqZzRsNmd4bSJ9.dza-IYiUemXQdEoMg1yLOw"
          width='100%'
          height='100%'
          maxZoom={19}
          {...this.state.viewport}
          ref={this.mapRef}
          onLoad={this.handleMapLoaded}
          onClick={this.handleMapClick}
          onViewportChange={this.handleViewportChange}
          >
        </ReactMapGL>
        { this.state.viewingElements.length > 0 &&
          <MediaViewerModule mediaElements={this.state.viewingElements} viewerClosed={this.viewerClosed}/>
        }
        <div className="key-area">
        {yearsIncluded.map((year, i) => (
          <label key={"year-" + year} className="map-check-container">{year}
            <input name={"year-" + year} onChange={this.toggleYear} checked={yearToggled[year]} type="checkbox"/>
            <span style={{'backgroundColor': (yearToggled[year] ? ('rgba(' + mapColors[year] + ',0.8)') : null) }} className="map-checkmark"></span>
          </label>
        ))}
        </div>
      </div>
    );
  }
};

function mapStateToProps(state) {
    const { alert } = state;
    return {
        alert
    };
}


const connectedMapPage = connect(mapStateToProps)(MapPage);
export default connectedMapPage;
