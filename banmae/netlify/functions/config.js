export const DATA_SOURCES = {
  p71a: {
    stationCode: "P.71A",
    river: "แม่ขาน",
    sourceName: "ศูนย์อุทกวิทยาชลประทานภาคเหนือตอนบน กรมชลประทาน",
    hourlyJsonUrl: "https://hydro1.ddns.net/main/information_4/houly/water_today_json.php",
    hourlyReportUrl: "https://hydro-1.net/Data/HD-04/houly/hourly_level.php",
    dailyReportUrl: "https://tiwrm.hii.or.th/DATA/REPORT/php/show_itcwater.php"
  },
  banMueangFu: { url: "", stationCode: "", river: "แม่ขาน", sourceName: null }
};

// Values must only be added after verification with the station owner.
export const FLOOD_THRESHOLDS = {
  normal: null,
  watch: null,
  warning: null,
  critical: null,
  source: null
};
