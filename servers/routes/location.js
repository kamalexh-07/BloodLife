const express = require('express');
const { getCountries, getStates, getDistricts } = require('../controllers/locationController');

const router = express.Router();

router.get('/countries', getCountries);
router.get('/countries/:countryName/states', getStates);
router.get('/countries/:countryName/states/:stateName/districts', getDistricts);

module.exports = router;