// -------------------------------------------------------------------------------------->
//
// CREATE NATIONAL MAP
//
// AUTHOR: Nat Henry, nat@henryspatialanalysis.com
// CREATED: April 2025
// PURPOSE: More performant and flexible district maps for RESPOND
//
// -------------------------------------------------------------------------------------->

// Set visualization options ------------------------------------------------------------>

const viz_options = {
  pop_cutoff_low: 50,
  pop_cutoff_high: 150,
  use_col: 'vr_m',
  lower: 0.004,
  upper: 0.012,
  legend_breaks: ['0.4%', '0.6%', '0.8%', '1.0%', '1.2%'],
  fill_palette: [
    '#352A87','#0E5FDB','#1283D4','#06A5C7','#33B7A0','#8ABE75','#D1BA58','#FBC831',
    '#F9FB0E'
  ],
  weight: 1.25,
  color: '#444444',
  legend_title: 'Estimated<br/>HIV Viraemia',
}

// Build national map ------------------------------------------------------------------->

// Objects already in memory: national, districts
const national_map = L
  .map('national-map', {zoomSnap: 0.2})
  .setView([-13.2543, 33.9022], 6.6);

// Add tile layers
add_national_tile_layers(national_map);

// Add district boundaries
const district_layer = new_geojson(districts, {...viz_options, tooltip: false});
district_layer.bindPopup(district_popup);
district_layer.addTo(national_map);

// Add national boundaries
const national_layer = L.geoJSON(national, {
  style: {color: 'black', fillOpacity: 0, weight: 2},
  interactive: false
}).addTo(national_map);

// Add legend
var legend = L.control({position: 'bottomright'});
legend.onAdd = function(_){
  const div = prepare_legend(viz_options);
  return div;
};
legend.addTo(national_map);
