var mapSourceData = {};

var fs = window.require('fs');

export const MapService = {
  addMedia: addMedia,
  getMapData: getMapData,
  getYearsIncluded: getYearsIncluded,
  importDataManually: importDataManually
};

//Temp function for map development
function importDataManually(){
  var data = fs.readFileSync('C:/Users/Andre/mapdata.txt');
  mapSourceData = JSON.parse(data);
}

function addMedia(resourceObj){
  var recordName = resourceObj.recordName;
  var assetDate = resourceObj.assetDate;
  mapSourceData[recordName] = resourceObj;
}

function getYearsIncluded(){
  var years = [];
  Object.keys(mapSourceData).forEach(function(recordName) {
    var year = new Date(mapSourceData[recordName].assetDate).getFullYear();
    if(years.indexOf(year) == -1){
      years.push(year);
    }
  });

  years.sort();
  return years;
}

//Temp function for map development (Use when only working on Map and set state to skip)
function getMapData(){
/*  fs.writeFile('C:/Users/Andre/mapdata.txt', JSON.stringify(mapSourceData), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('Map data saved!!');
});*/
  return mapSourceData;
}
