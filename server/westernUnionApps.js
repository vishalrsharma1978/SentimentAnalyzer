const EU = ['1045347175', 'eu'];
const NORDICS = ['1152860407', 'eu3'];
const LATAM = ['1148512210', 'acs1'];
const apps = {
  US: ['424716908', null],
  GB: EU, DE: EU, FR: EU, IT: EU,
  SE: NORDICS, NO: NORDICS, DK: NORDICS, FI: NORDICS,
  AR: LATAM, PE: LATAM, PA: LATAM,
  IN: ['1150872438', 'in'], AU: ['1122288720', 'au'],
  PH: ['6751528043', 'ph'], MX: ['1146349983', 'mcc2'],
  AE: ['1171330611', 'ae'], CA: ['1110191056', 'ca'],
  BR: ['1148514737', 'acs3'], JP: ['1437019338', 'jp'],
  SG: ['1451754888', 'sg'], SA: ['1459024696', 'sa'],
  MY: ['1164813148', 'apac'], CL: ['1304223498', 'cl'],
  CO: ['1329774999', 'co'], ES: ['1268771757', 'es'],
  NL: ['1199782520', 'nl'],
};

function westernUnionStoreIds(country) {
  const entry = apps[String(country).toUpperCase()];
  if (!entry) return null;
  return {
    apple: entry[0],
    google: entry[1] ? `com.westernunion.moneytransferr3app.${entry[1]}` : 'com.westernunion.android.mtapp',
  };
}

module.exports = { westernUnionStoreIds };
