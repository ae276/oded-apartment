// Sun position for the sun-study control. Copy to <u>-solar.js and declare it like the other modules.
// Accuracy ~1 deg (NOAA approximation) - plenty for "which room gets sun at 15:00 in December".
//
// sunDir({ lat, lon, month, day, hour, northDeg, utcOffset })
//   lat, lon     building location, degrees (Haifa ~ 32.82, 34.99)
//   month, day   calendar date (1-12, 1-31)
//   hour         local clock time, decimal (15.5 = 15:30)
//   northDeg     north arrow on the unit sheet, degrees clockwise from "up" on the page
//   utcOffset    clock offset in hours; omit for Israel (auto: +3 late Mar - late Oct, else +2)
// returns { dir:[x,y,z] (unit vector TOWARD the sun, scene frame), alt, az (deg, az clockwise from north), up }
//
// Scene frame (same as model.js): x = page right, z = page down, y = up. Page "up" is -z.

const R = Math.PI / 180;

export function israelOffset(month, day) {
  // IDT runs from the Friday before the last Sunday of March to the last Sunday of October.
  if (month > 3 && month < 10) return 3;
  if (month === 3) return day >= 25 ? 3 : 2;
  if (month === 10) return day < 26 ? 3 : 2;
  return 2;
}

export function sunDir({ lat, lon, month, day, hour, northDeg = 0, utcOffset }) {
  const off = utcOffset ?? israelOffset(month, day);
  const N = Math.floor(275 * month / 9) - Math.floor((month + 9) / 12) * 2 + day - 30; // day of year
  const g = 2 * Math.PI / 365 * (N - 1 + (hour - off - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hour * 60 + eqt + 4 * lon - 60 * off;          // true solar time, minutes
  const H = (tst / 4 - 180) * R;                              // hour angle
  const phi = lat * R;
  const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
  const alt = Math.asin(sinAlt);
  let az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) + Math.PI;
  const a = az + northDeg * R;                                // bearing on the page, clockwise from page-up
  const c = Math.cos(alt);
  return { dir: [Math.sin(a) * c, Math.sin(alt), -Math.cos(a) * c], alt: alt / R, az: ((az / R) % 360 + 360) % 360, up: alt > 0 };
}

// Keep the page's existing intensities; fade the sun out near the horizon.
export function sunIntensity(alt, max) {
  return alt <= 0 ? 0 : max * Math.min(1, alt / 12);
}
