<h2 align="center"><img height="60"src="https://icloudmetamap.com/images/icon.png"/> iCloud Meta Map</h2>
<br/>
<p align="center">An electron app for mapping your iCloud photo memories</p>

<p align="center">
  <b><a href="https://www.icloudmetamap.com">Download</a></b> | <b><a href="https://www.icloudmetamap.com">More Information</a></b>
</p>

## Development

### Installing
`npm install`

Configure ReactMapGL located in `/src/MapPage.js`(render) with your Mapbox API key.

### Running
Because the project is written in React, the start command will concurrently boot the Webpack service and run Electron:

`npm run start`

*NOTE: As of now, the iCloud API does have request limits in place. Test to your own accord, as iCloud Meta Map was written by reverse engineering the iCloud API and endpoints can change anytime*

## Building
The following command will build the distributions into the `dist` folder:

`npm run release`
