/**
 * BloodLife — shared location data (frontend)
 * Single source for Register and any page that cannot call the API.
 * Keep in sync with servers/controllers/locationController.js (Tamil Nadu = 38 districts).
 */
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
    states: {
      "Tamil Nadu": TAMIL_NADU_DISTRICTS,
    },
  },
};

// Expose for non-module script tags
if (typeof window !== "undefined") {
  window.TAMIL_NADU_DISTRICTS = TAMIL_NADU_DISTRICTS;
  window.locationData = locationData;
}
