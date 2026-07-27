// Shared location hierarchy used by GET /api/locations/*
// Single source of truth for Find Donor, Emergency Alert, and any other API consumers.
// Tamil Nadu: all 38 current districts (official list).

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur",
  "Chengalpattu",
  "Chennai",
  "Coimbatore",
  "Cuddalore",
  "Dharmapuri",
  "Dindigul",
  "Erode",
  "Kallakurichi",
  "Kanchipuram",
  "Kanniyakumari",
  "Karur",
  "Krishnagiri",
  "Madurai",
  "Mayiladuthurai",
  "Nagapattinam",
  "Namakkal",
  "Nilgiris",
  "Perambalur",
  "Pudukkottai",
  "Ramanathapuram",
  "Ranipet",
  "Salem",
  "Sivaganga",
  "Tenkasi",
  "Thanjavur",
  "Theni",
  "Thoothukudi",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupathur",
  "Tiruppur",
  "Tiruvallur",
  "Tiruvannamalai",
  "Tiruvarur",
  "Vellore",
  "Viluppuram",
  "Virudhunagar",
];

const locationData = {
  India: {
    Maharashtra: ["Mumbai", "Pune", "Nagpur"],
    Karnataka: ["Bangalore", "Mysore", "Hubli"],
    "Tamil Nadu": TAMIL_NADU_DISTRICTS,
    Delhi: ["New Delhi", "South Delhi", "North Delhi"],
  },
  USA: {
    California: ["Los Angeles", "San Francisco", "San Diego"],
    Texas: ["Houston", "Austin", "Dallas"],
    NewYork: ["New York City", "Buffalo", "Rochester"],
  },
  UK: {
    England: ["London", "Manchester", "Birmingham"],
    Scotland: ["Edinburgh", "Glasgow", "Aberdeen"],
  },
};

// @desc    Get all countries
// @route   GET /api/locations/countries
// @access  Public
const getCountries = (req, res) => {
  res.status(200).json(Object.keys(locationData));
};

// @desc    Get states for a specific country
// @route   GET /api/locations/countries/:countryName/states
// @access  Public
const getStates = (req, res) => {
  const { countryName } = req.params;
  const country = locationData[countryName];

  if (!country) {
    return res.status(404).json({ message: "Country not found" });
  }
  if (country.states) {
    res.status(200).json(Object.keys(country.states));
  } else {
    res.status(200).json(Object.keys(country));
  }
};

// @desc    Get districts for a specific state within a country
// @route   GET /api/locations/countries/:countryName/states/:stateName/districts
// @access  Public
const getDistricts = (req, res) => {
  const { countryName, stateName } = req.params;
  const country = locationData[countryName];

  if (!country) {
    return res.status(404).json({ message: "Country not found" });
  }

  let districts;
  if (country.states) {
    const state = country.states[stateName];
    if (!state) {
      return res.status(404).json({ message: "State not found for this country" });
    }
    districts = state;
  } else {
    const state = country[stateName];
    if (!state) {
      return res.status(404).json({ message: "State not found for this country" });
    }
    districts = state;
  }

  res.status(200).json(districts);
};

module.exports = {
  getCountries,
  getStates,
  getDistricts,
  TAMIL_NADU_DISTRICTS,
  locationData,
};
