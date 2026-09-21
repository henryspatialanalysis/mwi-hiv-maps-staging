// -------------------------------------------------------------------------------------->
//
// CREATE DISTRICT MAPS AND SUMMARY TABLES
//
// AUTHOR: Nat Henry, nat@henryspatialanalysis.com
// CREATED: April 2025
// PURPOSE: More performant and flexible district maps for RESPOND
//
// -------------------------------------------------------------------------------------->

// Visualization options are defined in viz_defaults.js (loaded before this script) and
// overridden per district by `viz_options` from data/<District>.js.

// Build district-specific maps ------------------------------------------------->

const prevalence_options = {...default_viz_options.prevalence, ...viz_options.prevalence};
create_district_map('hiv-map', boundaries, prevalence_options);
