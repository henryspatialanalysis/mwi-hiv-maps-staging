// -------------------------------------------------------------------------------------->
//
// CREATE DISTRICT MAPS AND SUMMARY TABLES
//
// AUTHOR: Nat Henry, nat@henryspatialanalysis.com
// CREATED: April 2025
// PURPOSE: More performant and flexible district maps for RESPOND
//
// -------------------------------------------------------------------------------------->

// Set visualization options ------------------------------------------------------------>

if(typeof viz_options === 'undefined') {
  var viz_options = {};
}
const default_viz_options = {
  prevalence: {
    pop_cutoff_low: 50,
    pop_cutoff_high: 150,
    use_col: 'pr_m',
    lower: 0.0,
    upper: 0.15,
    fill_palette: [
      '#0D0887','#3E049C','#6300A7','#8707A6','#A62098','#C03A83','#D5546E',
      '#E76F5A','#F58C46','#FDAD32','#FCD225','#F0F921'
    ],
    legend_breaks: ['0%', '5%', '10%', '15%+'],
    legend_title: 'Estimated<br/>HIV Prevalence'
  },
  viraemia: {
    pop_cutoff_low: 50,
    pop_cutoff_high: 150,
    use_col: 'vr_m',
    lower: 0.005,
    upper: 0.020,
    legend_breaks: ['0.5%', '1.0%', '1.5%', '2.0%'],
    fill_palette: [
      '#352A87','#0E5FDB','#1283D4','#06A5C7','#33B7A0','#8ABE75','#D1BA58','#FBC831',
      '#F9FB0E'
    ],
    legend_title: 'Estimated<br/>HIV Viraemia',
  },
  vls: {
    pop_cutoff_low: 50,
    pop_cutoff_high: 150,
    use_col: 'vl_m',
    lower: 0.7,
    upper: 1.0,
    legend_breaks: ['<=70%', '80%', '90%', '100%'],
    fill_palette: [
      '#B4DE2C', '#6DCD59', '#35B779', '#1F9E89', '#26828E', '#31688E', '#3E4A89',
      '#482878', '#440154'
    ],
    legend_title: 'Estimated<br/>Viral Load<br/>Suppression'
  }
}

// Build district-specific maps ------------------------------------------------->

const vls_options = {...default_viz_options.vls, ...viz_options.vls};
create_district_map('hiv-map', boundaries, vls_options);
