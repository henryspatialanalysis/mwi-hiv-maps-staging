// Helper functions to render outcomes in labels ---------------------------------------->
// Create comma-separated numbers
function cma(outcome) {
  const rounded = Math.round(outcome/10) * 10;
  return rounded.toLocaleString(undefined, {maximumFractionDigits: 10});
}
// Create percentage strings
function pct(outcome, acc = 0.1, suffix = true) {
  const suffixMark = suffix ? "%" : "";
  return (outcome * 100).toFixed(acc) + suffixMark;
}

// Create labels for map *polygons* ----------------------------------------------------->

function poly_tooltip(layer, ind_suffix = ''){
  const props = layer.feature.properties;
  const cols = Object.keys(props);
  const LOW_POP_CUTOFF = 50;

  // Add potential place titles
  var inner_html = '';
  var titles = [];
  const titleLabels = {
    gvhname: 'GVH: ',
    taname: '',
    catchment_name: '',
    survey_facility_name: '',
  }
  Object.entries(titleLabels).forEach(([key, label]) => {
    if(cols.includes(key)){
      titles.push(`<b>${label}${props[key]}</b>`);
    }
  });
  inner_html += titles.join('<br/>');
  if(inner_html != ''){
    inner_html += '<br/>';
  }

  // Add indicators to labels
  var labs = [];
  const indLabels = {
    vr: 'HIV viraemia',
    pr: 'HIV prevalence',
    vl: 'Viral load suppression'
  };
  Object.entries(indLabels).forEach(([ind, indLabel]) => {
    const acc = ind === 'vr' ? 1 : 0.1;
    const meanVar = `${ind}_m${ind_suffix}`;
    const uiVars = [`${ind}_l${ind_suffix}`, `${ind}_u${ind_suffix}`];
    var this_lab = '';
    if (cols.includes(meanVar)) {
      this_lab += `<i>${indLabel}</i>: ${(props[meanVar] * 100).toFixed(acc)}%`;
    }
    if (uiVars.every(v => cols.includes(v))) {
      this_lab += ` (${pct(props[uiVars[0]], acc)} to ${pct(props[uiVars[1]], acc)})`;
    }
    labs.push(this_lab);
  });

  // Censor outcomes for small populations
  if (cols.includes('pop_15to49')) {
    if(props.pop_15to49 < LOW_POP_CUTOFF) {
      labs = [`<i>Population</i>: < ${cma(LOW_POP_CUTOFF)}`];
    } else {
      labs.push(`<i>Population (15 to 49)</i>: ${cma(props.pop_15to49)}`);
    }
  }
  inner_html += labs.join('<br/>');

  return inner_html;
}

// Create popup labels for map *points* ------------------------------------------------->

function point_popup(layer){
  const props = layer.feature.properties;
  var inner_html = `
    <b>${props['facility_name']}</b><br/>
    <i>Type:</i> ${props['facility_type']}<br/>
    <i>Location:</i> ${props['taname']} (${props['restype']})<br/>
    <i>Services:</i> ${props['health_service']}<br/>
    <i>ART cohort (Q4 2024):</i> ${cma(props['art_cumulative'])}<br/>
    <i>Catchment population (15 to 49):</i> ${cma(props['pop_15to49'])}<br/>
  `;
  return inner_html;
}


// Create popup labels for district boundaries ------------------------------------------>

function district_popup(layer){
  const props = layer.feature.properties;
  var inner_html = `
    <a href="./${props['area_name']}.html"><b>${props['area_name']}</b></a>
  `;
  return inner_html;
}

// Function to add a legend to the map -------------------------------------------------->

function prepare_legend(options){
  const default_options = {
    legend_title: null,
    className: 'leaflet-legend',
    legend_breaks: ['Lowest', 'Highest'],
    fill_palette: [
      '#0D0887FF','#3E049CFF','#6300A7FF','#8707A6FF','#A62098FF','#C03A83FF','#D5546EFF',
      '#E76F5AFF','#F58C46FF','#FDAD32FF','#FCD225FF','#F0F921FF'
    ],
    opacity: 0.8
  };
  options = {...default_options, ...options};

  // Reverse labels and palette
  let rev_labels = [...options.legend_breaks].reverse();
  let rev_palette = [...options.fill_palette].reverse();

  let div = L.DomUtil.create("div", options.className);
  // Optionally add title
  if(options.legend_title){
    let title_div = L.DomUtil.create("div");
    title_div.innerHTML = "<strong>" + options.legend_title + "</strong>";
    title_div.style.marginBottom = "3px";
    div.appendChild(title_div);
  }

  // Formatting variables
  let vMargin = 8; // If 1st tick mark starts at top of gradient, how
  // many extra px are needed for the top half of the
  // 1st label? (ditto for last tick mark/label)
  let tickWidth = 4;     // How wide should tick marks be, in px?
  let labelPadding = 2;  // How much distance to reserve for tick mark?
  // Each bin is `singleBinHeight` high. How tall is the gradient?
  let totalHeight = 151;
  // The distance between tick marks, in px
  let singleBinHeight = (totalHeight - 1) / (rev_labels.length - 1);

  let gradSpan = document.createElement("span");
  Object.assign(gradSpan.style, {
    background: `linear-gradient(${rev_palette})`,
    opacity: options.opacity,
    height: totalHeight + "px",
    width: "30px",
    display: "block",
    marginTop: vMargin + "px"
  });

  let leftDiv = document.createElement("div");
  leftDiv.style.float = "left";
  let rightDiv = document.createElement("div");
  rightDiv.style.float = "left";

  leftDiv.appendChild(gradSpan);
  div.appendChild(leftDiv);
  div.appendChild(rightDiv);
  div.appendChild(document.createElement("br"));

  // Have to attach the div to the body at this early point, so that the
  // svg text getComputedTextLength() actually works, below.
  document.body.appendChild(div);

  let ns = "http://www.w3.org/2000/svg";
  let svg = document.createElementNS(ns, "svg");
  rightDiv.appendChild(svg);
  let g = document.createElementNS(ns, "g");
  g.setAttribute("transform", "translate(0, " + vMargin + ")");
  svg.appendChild(g);

  // max label width needed to set width of svg, and right-justify text
  let maxLblWidth = 0;

  // Create tick marks and labels
  rev_labels.forEach((label, i) => {
    let y = i*singleBinHeight + 0.5;

    let thisLabel = document.createElementNS(ns, "text");
    thisLabel.textContent = label;
    thisLabel.setAttribute("y", y);
    thisLabel.setAttribute("dx", tickWidth + labelPadding);
    thisLabel.setAttribute("dy", "0.5ex");
    g.appendChild(thisLabel);
    maxLblWidth = Math.max(maxLblWidth, thisLabel.getComputedTextLength());

    let thisTick = document.createElementNS(ns, "line");
    thisTick.setAttribute("x1", 0);
    thisTick.setAttribute("x2", tickWidth);
    thisTick.setAttribute("y1", y);
    thisTick.setAttribute("y2", y);
    thisTick.setAttribute("stroke-width", 1);
    thisTick.setAttribute("stroke", "black");
    g.appendChild(thisTick);
  });

  // Final size for <svg>
  Object.assign(svg.style, {
    width: (maxLblWidth + labelPadding) + "px",
    height: totalHeight + vMargin*2 + "px"
  });

  // Return the legend div
  return div;
}


// Helper function to create a GeoJSON layer for Leaflet -------------------------------->

function new_geojson(data, options){
  const default_options = {
    weight: 0,
    overlayWeight: 0.7,
    color: '#777777',
    ind_suffix: '',
    type: 'polygons',
    interactive: true,
    overlay: false,
    tooltip: true,
    use_pop_for_opacity: true
  };
  options = {...default_options, ...options};
  let fill_column = options.use_col + options.ind_suffix;
  let fill_scale = (chroma
    .scale(options.fill_palette)
    .domain([options.lower, options.upper])
  );
  var fill_opacity_fun = (_) => 0.5;
  if(options.use_pop_for_opacity){
    fill_opacity_fun = (pop) => {
      return pop >= options.pop_cutoff_high ? 0.8 :
        pop <= options.pop_cutoff_low ? 0.2 :
        0.5;
    }
  }
  let style_fun = null
  if(options.overlay){
    style_fun = (feature) => {
      return {
        weight: options.overlayWeight,
        color: options.color,
        fillOpacity: 0
      };
    }
  } else {
    style_fun = (feature) => {
      return {
        weight: options.weight,
        color: options.color,
        fillColor: fill_scale(feature.properties[fill_column]),
        fillOpacity: fill_opacity_fun(feature.properties['pop_15to49'])
      };
    }
  }
  let onEachFeature = null;
  if(options.interactive){
    onEachFeature = (_, layer) => {
      layer.on('mouseover', function(){
        layer.setStyle({
        weight: 4,
        color: '#000000',
      });
      layer.bringToFront();
    });
      layer.on('mouseout', () => layer.setStyle(style_fun(layer.feature)));
    };
  }
  let geojsonLayer = L
    .geoJSON(
      data,
      {style: style_fun, interactive: options.interactive, onEachFeature: onEachFeature}
    )
  if(options.interactive && options.tooltip){
    geojsonLayer.bindTooltip((layer) => poly_tooltip(layer, options.ind_suffix));
  }
  return geojsonLayer
}


// Helper function to create tile layers for Leaflet ------------------------------------>

function new_tile(url, options){
  const default_options = {
    attribution: '',
    subdomains: 'abcd',
    maxzoom: 20,
    pane: 'tilePane'
  };
  options = {...default_options, ...options};
  return L.tileLayer(url, options);
}

function add_tile_layers(map){
  new_tile(
    'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, ' +
        '<a href="https://carto.com/attributions">CARTO</a>, ' +
        '<a href="https://www.stadiamaps.com/">Stadia</a>'
    }
  ).addTo(map);
  new_tile(
    'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png',
    {subdomains: '', pane: 'shadowPane'}
  ).addTo(map);
  new_tile(
    'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    {pane: 'shadowPane'}
  ).addTo(map);
}

function add_national_tile_layers(map){
  new_tile(
    'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, ' +
        '<a href="https://carto.com/attributions">CARTO</a>, ' +
        '<a href="https://www.stadiamaps.com/">Stadia</a>'
    }
  ).addTo(national_map);
  new_tile(
    'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    {pane: 'shadowPane'}
  ).addTo(map);
}

// Template to create a leaflet map ----------------------------------------------------->

// Assumes the div with id map already exists
function create_district_map(id, bounds, options) {
  const default_options = {
    use_col: 'pr_m',
    lower: 0.0,
    upper: 0.15,
    fill_palette: [
      '#0D0887FF','#3E049CFF','#6300A7FF','#8707A6FF','#A62098FF','#C03A83FF','#D5546EFF',
      '#E76F5AFF','#F58C46FF','#FDAD32FF','#FCD225FF','#F0F921FF'
    ],
    legend_breaks: ['0%', '5%', '10%', '15%+'],
    legend_title: 'Estimated<br/>HIV Prevalence',
    pop_cutoff_low: 50,
    pop_cutoff_high: 200,
    zoom_min: 10
  };
  options = {...default_options, ...options};

  // Create map
  const map = L.map(id, {zoomSnap: 0.2});
  const bounds_keys = Object.keys(bounds);

  // Add base layers
  add_tile_layers(map);

  // Add district boundaries
  const district_layer = L.geoJSON(bounds.district, {
    style: {
      color: 'black',
      fillOpacity: 0,
      weight: 2
    }
  }).addTo(map);
  map.fitBounds(district_layer.getBounds());
  if(map.getZoom() < options.zoom_min){
    map.setView(map.getCenter(), options.zoom_min);
  }

  // Create all toggleable layers
  var base_layers = {};
  base_layers['High resolution'] = new_geojson(bounds.h3, {...options, weight: 0.15}).addTo(map);
  base_layers['Group village head'] = L.layerGroup([
    new_geojson(bounds.h3, {...options, interactive: false, ind_suffix: '_gvh'}),
    new_geojson(bounds.gvh, {...options, overlay: true, ind_suffix: '_gvh'})
  ]);
  base_layers['Traditional authority'] = L.layerGroup([
    new_geojson(bounds.h3, {...options, interactive: false, ind_suffix: '_ta'}),
    new_geojson(bounds.ta, {...options, overlay: true})
  ]);
  base_layers['Facility catchment'] = L.layerGroup([
    new_geojson(bounds.h3, {...options, interactive: false, ind_suffix: '_facility'}),
    new_geojson(bounds.facility_catchments, {...options, overlay: true, ind_suffix: '_facility'})
  ]);

  // Add layers that may not exist: survey facilities
  if(bounds_keys.includes('survey_facilities')){
    base_layers['Survey facilities'] = L.layerGroup([
      new_geojson(bounds.h3, {...options, interactive: false, ind_suffix: '_scf'}),
      new_geojson(bounds.survey_facilities, {...options, overlay: true, ind_suffix: '_scf'})
    ]);
  }

  // Add optional layers:
  var optional_layers = {};
  optional_layers['Health facility locations'] = L
    .geoJSON(bounds.facility_points)
    .bindPopup((layer) => point_popup(layer));
  if(bounds_keys.includes('dropped_facility_points')){
    optional_layers['<i>(Excluded health facilities)</i>'] = L
      .geoJSON(bounds.dropped_facility_points)
      .bindPopup((layer) => point_popup(layer));
  }
  const catch_title = 'Facility catchment<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;boundaries';
  optional_layers[catch_title] = L.geoJSON(
    bounds.facility_catchments, {
      style: {opacity: 0.85, color: "#0000FF", dashArray: "5, 10", fillOpacity: 0},
      interactive: false,
      pane: 'shadowPane'
    }
  );
  const layerControl = L.control.layers(base_layers, optional_layers, {collapsed: false});
  layerControl.addTo(map);

  // Add legend
  var legend = L.control({position: 'bottomright'});
  legend.onAdd = function(_){
    const div = prepare_legend(options);
    return div;
  };
  legend.addTo(map);
}
