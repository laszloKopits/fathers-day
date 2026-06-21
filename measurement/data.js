// data.js — the per-unit-type reference library.
//
// THE WHOLE DESIGN: the engine and renderer are type-agnostic. A unit type is
// just data. To add a new measurable thing (mass, speed, pressure, data size…)
// you add one object here and nothing else changes.
//
// Schema per unit type:
//   id        unique key
//   label     display name
//   emoji     header glyph
//   blurb     one-liner shown under the title
//   strategy  "spatial" | "scale"
//   dim       2 (area) | 3 (volume)   -- only for spatial; controls √ vs ∛ sizing
//   orient    "h" | "v"               -- only for scale
//   canonical name of the base unit (for display)
//   units     { token: {factor} | {toBase,fromBase}, aliases:[...] }
//             factor = how many base units in one of this unit (multiplicative)
//             toBase/fromBase = for non-linear units (temperature)
//   anchors   [{ name, value(in base unit), emoji, note? }]   sorted is not required

const lin = (factor, aliases) => ({ factor, aliases });

window.MEASUREMENT_DATA = {
  area: {
    id: "area",
    label: "Area",
    emoji: "🗺️",
    blurb: "How much ground does that cover?",
    strategy: "spatial",
    dim: 2,
    canonical: "m²",
    fmtUnit: "m²",
    units: {
      "m2":      lin(1,         ["m2", "m^2", "sqm", "squaremeter", "squaremeters", "squaremetre", "squaremetres"]),
      "ft2":     lin(0.092903,  ["ft2", "ft^2", "sqft", "squarefeet", "squarefoot"]),
      "acre":    lin(4046.8564, ["acre", "acres", "ac"]),
      "hectare": lin(10000,     ["hectare", "hectares", "ha"]),
      "km2":     lin(1e6,       ["km2", "km^2", "sqkm", "squarekilometer", "squarekilometers", "squarekilometre"]),
      "mi2":     lin(2.59e6,    ["mi2", "mi^2", "sqmi", "squaremile", "squaremiles"]),
      "yd2":     lin(0.836127,  ["yd2", "yd^2", "sqyd", "squareyard", "squareyards"]),
    },
    anchors: [
      { name: "Sheet of A4 paper",      value: 0.0623,      emoji: "📄" },
      { name: "Parking space",          value: 12,          emoji: "🅿️" },
      { name: "Tennis court",           value: 260.87,      emoji: "🎾" },
      { name: "Basketball court",       value: 436.6,       emoji: "🏀" },
      { name: "Football field",         value: 5351,        emoji: "🏈" },
      { name: "Soccer pitch",           value: 7140,        emoji: "⚽" },
      { name: "City block",             value: 21900,       emoji: "🏙️" },
      { name: "Vatican City",           value: 440000,      emoji: "⛪" },
      { name: "Central Park",           value: 3410000,     emoji: "🌳" },
      { name: "Monaco",                 value: 2020000,     emoji: "🎰" },
      { name: "Manhattan",              value: 59100000,    emoji: "🌆" },
      { name: "Walt Disney World",      value: 101000000,   emoji: "🏰" },
      { name: "Paris (city limits)",    value: 105400000,   emoji: "🗼" },
      { name: "San Francisco",          value: 121000000,   emoji: "🌉" },
      { name: "Singapore",              value: 728600000,   emoji: "🇸🇬" },
      { name: "New York City",          value: 783800000,   emoji: "🗽" },
    ],
  },

  decibels: {
    id: "decibels",
    label: "Loudness",
    emoji: "🔊",
    blurb: "How loud is that, really?",
    strategy: "scale",
    orient: "h",
    canonical: "dB",
    fmtUnit: "dB",
    range: [0, 150],
    units: {
      "dB": lin(1, ["db", "dba", "dbspl", "decibel", "decibels"]),
    },
    anchors: [
      { name: "Threshold of hearing",  value: 0,   emoji: "🤫", note: "The quietest sound a human ear can detect." },
      { name: "Breathing",             value: 10,  emoji: "😮‍💨", note: "Your own breath in a silent room." },
      { name: "Rustling leaves",       value: 20,  emoji: "🍃", note: "A faint breeze through trees." },
      { name: "Whisper",               value: 30,  emoji: "🤐", note: "A quiet whisper a metre away." },
      { name: "Quiet library",         value: 40,  emoji: "📚", note: "Ambient hush of a reading room." },
      { name: "Refrigerator hum",      value: 50,  emoji: "🧊", note: "The background drone of a kitchen." },
      { name: "Normal conversation",   value: 60,  emoji: "💬", note: "Two people talking at arm's length." },
      { name: "Vacuum cleaner",        value: 70,  emoji: "🧹", note: "Busy traffic from the sidewalk." },
      { name: "City traffic",          value: 80,  emoji: "🚗", note: "Prolonged exposure starts to fatigue." },
      { name: "Lawnmower",             value: 90,  emoji: "🌱", note: "Hearing damage after ~8 hours." },
      { name: "Nightclub",             value: 100, emoji: "🪩", note: "Damage in ~15 minutes." },
      { name: "Rock concert",          value: 110, emoji: "🎸", note: "Damage in ~2 minutes." },
      { name: "Ambulance siren",       value: 120, emoji: "🚑", note: "The threshold of pain." },
      { name: "Jackhammer",            value: 130, emoji: "🔨", note: "Immediate risk to hearing." },
      { name: "Jet engine at takeoff", value: 140, emoji: "✈️", note: "Pain and instant damage up close." },
      { name: "Gunshot",               value: 150, emoji: "🔫", note: "A single peak can permanently damage hearing." },
    ],
  },

  liters: {
    id: "liters",
    label: "Volume",
    emoji: "🫗",
    blurb: "How much liquid is that?",
    strategy: "spatial",
    dim: 3,
    canonical: "L",
    fmtUnit: "L",
    units: {
      "L":       lin(1,        ["l", "liter", "liters", "litre", "litres"]),
      "mL":      lin(0.001,    ["ml", "milliliter", "milliliters", "millilitre"]),
      "gal":     lin(3.78541,  ["gal", "gallon", "gallons", "usgal"]),
      "qt":      lin(0.946353, ["qt", "quart", "quarts"]),
      "cup":     lin(0.236588, ["cup", "cups"]),
      "floz":    lin(0.0295735,["floz", "flozus", "fluidounce", "fluidounces"]),
      "m3":      lin(1000,     ["m3", "m^3", "cubicmeter", "cubicmeters", "cubicmetre"]),
    },
    anchors: [
      { name: "Teaspoon",          value: 0.005,    emoji: "🥄" },
      { name: "Shot glass",        value: 0.044,    emoji: "🥃" },
      { name: "Coffee cup",        value: 0.24,     emoji: "☕" },
      { name: "Soda can",          value: 0.355,    emoji: "🥤" },
      { name: "Water bottle",      value: 0.5,      emoji: "💧" },
      { name: "Wine bottle",       value: 0.75,     emoji: "🍷" },
      { name: "Milk jug (gallon)", value: 3.785,    emoji: "🥛" },
      { name: "Bucket",            value: 10,       emoji: "🪣" },
      { name: "Kitchen sink",      value: 20,       emoji: "🚰" },
      { name: "Beer keg",          value: 58.7,     emoji: "🍺" },
      { name: "Bathtub",           value: 150,      emoji: "🛁" },
      { name: "Oil drum",          value: 208,      emoji: "🛢️" },
      { name: "Hot tub",           value: 1500,     emoji: "♨️" },
      { name: "Tanker truck",      value: 30000,    emoji: "🚛" },
      { name: "Backyard pool",     value: 50000,    emoji: "🏊" },
      { name: "Olympic pool",      value: 2500000,  emoji: "🏅" },
    ],
  },

  temperature: {
    id: "temperature",
    label: "Temperature",
    emoji: "🌡️",
    blurb: "How hot or cold is that?",
    strategy: "scale",
    orient: "v",
    canonical: "°C",
    fmtUnit: "°C",
    units: {
      "C": { toBase: v => v,              fromBase: v => v,              aliases: ["c", "celsius", "centigrade", "degc", "°c"] },
      "F": { toBase: v => (v - 32) * 5/9, fromBase: v => v * 9/5 + 32,   aliases: ["f", "fahrenheit", "degf", "°f"] },
      "K": { toBase: v => v - 273.15,     fromBase: v => v + 273.15,     aliases: ["k", "kelvin", "degk", "°k"] },
    },
    anchors: [
      { name: "Absolute zero",        value: -273.15, emoji: "🥶", note: "All molecular motion stops. Nothing is colder." },
      { name: "Coldest day on Earth", value: -89,     emoji: "🏔️", note: "Vostok Station, Antarctica, 1983." },
      { name: "Dry ice sublimates",   value: -78.5,   emoji: "💨", note: "Solid CO₂ turns straight to gas." },
      { name: "Home freezer",         value: -18,     emoji: "🧊", note: "Standard freezer setting." },
      { name: "Water freezes",        value: 0,       emoji: "❄️", note: "Ice forms; snow falls." },
      { name: "Refrigerator",         value: 4,       emoji: "🥶", note: "Safe food-storage temperature." },
      { name: "Room temperature",     value: 21,      emoji: "🛋️", note: "Comfortable indoors." },
      { name: "Body temperature",     value: 37,      emoji: "🌡️", note: "Healthy human core temperature." },
      { name: "Hot bath",             value: 40,      emoji: "🛁", note: "About as hot as skin tolerates." },
      { name: "Hot coffee",           value: 65,      emoji: "☕", note: "Fresh from the machine." },
      { name: "Water boils",          value: 100,     emoji: "♨️", note: "Steam at sea level." },
      { name: "Oven (baking)",        value: 180,     emoji: "🍞", note: "Standard bread/cake setting." },
      { name: "Paper ignites",        value: 233,     emoji: "🔥", note: "Fahrenheit 451 — paper bursts into flame." },
      { name: "Pizza oven",           value: 450,     emoji: "🍕", note: "Wood-fired Neapolitan oven." },
      { name: "Lava",                 value: 1100,    emoji: "🌋", note: "Molten rock from a volcano." },
      { name: "Surface of the Sun",   value: 5500,    emoji: "☀️", note: "Hot enough to vaporize any material." },
    ],
  },
};
